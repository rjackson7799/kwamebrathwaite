import { NextRequest } from 'next/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api'
import { requireAdmin, logActivity, getCurrentUserEmail } from '@/lib/api/admin'
import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/send'
import { FounderBriefingNotificationEmail } from '@/lib/email/templates'
import { translatePageContent } from '@/lib/ai/translation-service'

interface FounderRow {
  user_id: string
  email: string
  full_name: string
  recognition_name: string | null
  preferred_locale: string
  comms_prefs: Record<string, unknown> | null
}

interface BriefingRow {
  id: string
  title: string
  excerpt: string | null
  status: string
}

// POST /api/admin/briefings/[id]/notify
//
// Per-recipient notification with explicit retry semantics:
//   1. Verify briefing is published.
//   2. UPSERT a founder_briefing_notifications row per active founder:
//        - status='skipped' for founders with comms_prefs.briefings === false
//        - status='queued'  for everyone else (default opt-in)
//      The composite PK makes re-running this idempotent — already-sent
//      rows are not re-queued.
//   3. Iterate rows with status='queued', send the localized email,
//      update each row to 'sent' or 'failed' with the error message.
//   4. Return aggregate counts. logActivity once at the end.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { errorResponse: authError } = await requireAdmin(request)
  if (authError) return authError

  const { id: briefingId } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any

  // 1. Load briefing — must be published.
  const { data: briefingRaw, error: briefingError } = await supabase
    .from('founder_briefings')
    .select('id, title, excerpt, status')
    .eq('id', briefingId)
    .maybeSingle()

  if (briefingError) {
    console.error('briefings/notify: read briefing failed', briefingError)
    return errorResponse(ErrorCodes.DB_ERROR, 'Failed to read briefing', 500)
  }
  if (!briefingRaw) {
    return errorResponse(ErrorCodes.NOT_FOUND, 'Briefing not found', 404)
  }
  const briefing = briefingRaw as BriefingRow
  if (briefing.status !== 'published') {
    return errorResponse(
      ErrorCodes.VALIDATION_ERROR,
      'Can only notify on published briefings',
      400
    )
  }

  // 2. Enqueue rows for every active founder.
  const { data: founders, error: foundersError } = await supabase
    .from('founders')
    .select('user_id, email, full_name, recognition_name, preferred_locale, comms_prefs')
    .eq('status', 'active')

  if (foundersError) {
    console.error('briefings/notify: list founders failed', foundersError)
    return errorResponse(ErrorCodes.DB_ERROR, 'Failed to list founders', 500)
  }

  const founderRows = (founders ?? []) as FounderRow[]
  const enqueueRows = founderRows.map((f) => {
    const optOut = f.comms_prefs?.briefings === false
    return {
      briefing_id: briefingId,
      user_id: f.user_id,
      status: optOut ? ('skipped' as const) : ('queued' as const),
    }
  })

  if (enqueueRows.length > 0) {
    const { error: enqueueError } = await supabase
      .from('founder_briefing_notifications')
      .upsert(enqueueRows, { onConflict: 'briefing_id,user_id', ignoreDuplicates: true })

    if (enqueueError) {
      console.error('briefings/notify: enqueue failed', enqueueError)
      return errorResponse(ErrorCodes.DB_ERROR, 'Failed to enqueue notifications', 500)
    }
  }

  // 3. Iterate queued rows for this briefing and send.
  const { data: queued } = await supabase
    .from('founder_briefing_notifications')
    .select('user_id')
    .eq('briefing_id', briefingId)
    .eq('status', 'queued')

  const queuedRows = (queued ?? []) as Array<{ user_id: string }>
  const foundersById = new Map(founderRows.map((f) => [f.user_id, f]))
  const counts = await sendQueuedBatch(
    supabase,
    briefing,
    queuedRows.map((q) => foundersById.get(q.user_id)).filter((f): f is FounderRow => Boolean(f)),
    briefingId
  )

  // 4. Activity log
  const adminEmail = await getCurrentUserEmail()
  if (adminEmail) {
    await logActivity(adminEmail, 'create', 'briefing_notification', briefingId, briefing.title, {
      queued: queuedRows.length,
      ...counts,
    })
  }

  // Aggregate final status counts for the response.
  const { data: finalCounts } = await supabase
    .from('founder_briefing_notifications')
    .select('status')
    .eq('briefing_id', briefingId)

  const tally = { sent: 0, failed: 0, skipped: 0, queued: 0 }
  for (const row of (finalCounts ?? []) as Array<{ status: keyof typeof tally }>) {
    if (row.status in tally) tally[row.status]++
  }

  return successResponse({ briefing_id: briefingId, ...tally })
}

// Helper used by both /notify and /notify/retry.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function sendQueuedBatch(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  briefing: BriefingRow,
  founders: FounderRow[],
  briefingId: string
): Promise<{ sent: number; failed: number }> {
  let sent = 0
  let failed = 0
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || ''

  for (const founder of founders) {
    const locale = founder.preferred_locale || 'en'
    const localePrefix = locale === 'en' ? '' : `/${locale}`
    const readUrl = `${siteUrl}${localePrefix}/founders/portal/briefings/${briefingId}`

    try {
      const [title, excerpt] = await Promise.all([
        translatePageContent(briefing.title, locale, 'founder_briefings', briefingId, 'title'),
        briefing.excerpt
          ? translatePageContent(briefing.excerpt, locale, 'founder_briefings', briefingId, 'excerpt')
          : Promise.resolve(null as string | null),
      ])

      const displayName = founder.recognition_name?.trim() || founder.full_name

      const result = await sendEmail({
        to: founder.email,
        subject: title,
        react: FounderBriefingNotificationEmail({
          fullName: displayName,
          title,
          excerpt,
          readUrl,
        }),
      })

      if (result.success) {
        await supabase
          .from('founder_briefing_notifications')
          .update({ status: 'sent', sent_at: new Date().toISOString(), error: null })
          .eq('briefing_id', briefingId)
          .eq('user_id', founder.user_id)
        sent++
      } else {
        await supabase
          .from('founder_briefing_notifications')
          .update({ status: 'failed', error: result.error ?? 'unknown send error' })
          .eq('briefing_id', briefingId)
          .eq('user_id', founder.user_id)
        failed++
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`briefings/notify: send to ${founder.email} threw:`, msg)
      await supabase
        .from('founder_briefing_notifications')
        .update({ status: 'failed', error: msg })
        .eq('briefing_id', briefingId)
        .eq('user_id', founder.user_id)
      failed++
    }
  }

  return { sent, failed }
}
