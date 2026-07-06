/**
 * Vercel Cron: daily synthetic health check for the three public lead forms.
 *
 * Contact form + Works (artwork) inquiry  -> POST /api/inquiries      -> inquiries
 * License inquiry                          -> POST /api/licensing/request -> license_requests
 *
 * Rather than firing real submissions through the public endpoints (which would
 * email the team and trip rate-limit/spam filters on every run), this probes the
 * data layer that actually breaks silently: it reads license_types and does an
 * insert+delete round-trip against inquiries and license_requests via the
 * service-role client. That catches a missing/renamed table, a dropped column,
 * or an RLS/grant change — the class of failure that took the licensing form
 * down (PGRST205 "Could not find the table public.license_types").
 *
 * Every test row is labelled, inserted with status that keeps it out of the
 * admin "new" queue, and deleted before the request returns — nothing is left
 * behind. On ANY failed check it emails MONITOR_ALERT_EMAIL (default: the dev)
 * and returns 500 so the failure also shows in Vercel's cron logs. Silent on
 * success.
 *
 * Vercel calls this with `Authorization: Bearer <CRON_SECRET>`. Schedule lives
 * in vercel.json.
 *
 * Note: the alert itself is sent via Resend, so a total email-provider outage
 * would prevent the alert from arriving — the 500 in Vercel's cron log is the
 * backstop signal for that case.
 */

import { NextRequest } from 'next/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/send'
import { EMAIL_CONFIG } from '@/lib/email/client'
import { PlainMessageEmail } from '@/lib/email/templates/PlainMessageEmail'

export const maxDuration = 60

const ALERT_TO = process.env.MONITOR_ALERT_EMAIL || 'ryan.jackson.2009@gmail.com'
const TEST_EMAIL = 'monitor@kwamebrathwaite.com'

type Check = { name: string; ok: boolean; error?: string }

export async function GET(request: NextRequest) {
  return handle(request)
}

export async function POST(request: NextRequest) {
  return handle(request)
}

async function handle(request: NextRequest) {
  const expected = process.env.CRON_SECRET
  if (!expected) {
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'CRON_SECRET is not configured', 500)
  }
  const auth = request.headers.get('authorization') || ''
  const got = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : null
  if (got !== expected) {
    return errorResponse('UNAUTHORIZED', 'Invalid cron secret', 401)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any
  const checks: Check[] = []
  const cleanup: Array<() => Promise<void>> = []
  const marker = `healthcheck-${Date.now()}`
  const label = 'HEALTHCHECK — automated, safe to delete'

  // A real artwork id lets us exercise the works-inquiry artwork_id FK and the
  // license_request_artworks junction. Null if the archive has no artworks yet.
  let artworkId: string | null = null
  try {
    const { data } = await supabase.from('artworks').select('id').limit(1).maybeSingle()
    artworkId = data?.id ?? null
  } catch {
    // leave null — the FK columns are nullable, so the probes still run
  }

  // 1. license_types read — the exact query /api/licensing/types serves.
  await runCheck(checks, 'license_types read', async () => {
    const { error } = await supabase
      .from('license_types')
      .select('id')
      .eq('is_active', true)
      .limit(1)
    if (error) throw new Error(error.message)
  })

  // 2. Contact form path — inquiries insert (general) + delete.
  await runCheck(checks, 'inquiries insert (contact)', async () => {
    const { data, error } = await supabase
      .from('inquiries')
      .insert({
        name: 'Form Health Check',
        email: TEST_EMAIL,
        message: `Automated daily form health check (${marker}).`,
        inquiry_type: 'general',
        locale: 'en',
        status: 'archived', // keep out of the admin "new" queue during its brief lifetime
        admin_notes: label,
      })
      .select('id')
      .single()
    if (error) throw new Error(error.message)
    if (data?.id) {
      cleanup.push(async () => {
        await supabase.from('inquiries').delete().eq('id', data.id)
      })
    }
  })

  // 3. Works (artwork) inquiry path — inquiries insert (purchase + artwork_id) + delete.
  await runCheck(checks, 'inquiries insert (works)', async () => {
    const { data, error } = await supabase
      .from('inquiries')
      .insert({
        name: 'Form Health Check',
        email: TEST_EMAIL,
        message: `Automated daily form health check (${marker}).`,
        inquiry_type: 'purchase',
        artwork_id: artworkId,
        locale: 'en',
        status: 'archived',
        admin_notes: label,
      })
      .select('id')
      .single()
    if (error) throw new Error(error.message)
    if (data?.id) {
      cleanup.push(async () => {
        await supabase.from('inquiries').delete().eq('id', data.id)
      })
    }
  })

  // 4. License inquiry path — license_requests insert (+ junction FK) + delete.
  await runCheck(checks, 'license_requests insert', async () => {
    // request_number is UNIQUE NOT NULL; this marker never collides with real
    // LIC-YYYY-NNN numbers and does not match generateRequestNumber's LIKE.
    const { data, error } = await supabase
      .from('license_requests')
      .insert({
        request_number: `LIC-HEALTHCHECK-${Date.now()}`,
        name: 'Form Health Check',
        email: TEST_EMAIL,
        usage_description: `Automated daily form health check (${marker}).`,
        locale: 'en',
        status: 'new',
        admin_notes: label,
      })
      .select('id')
      .single()
    if (error) throw new Error(error.message)
    const id = data?.id as string | undefined
    if (id) {
      // Delete of the parent cascades to license_request_artworks.
      cleanup.push(async () => {
        await supabase.from('license_requests').delete().eq('id', id)
      })
      if (artworkId) {
        const { error: jErr } = await supabase
          .from('license_request_artworks')
          .insert({ request_id: id, artwork_id: artworkId })
        if (jErr) throw new Error(`license_request_artworks: ${jErr.message}`)
      }
    }
  })

  // Best-effort cleanup — runs whether checks passed or failed.
  for (const fn of cleanup) {
    try {
      await fn()
    } catch (e) {
      console.error('form-health cleanup error:', e)
    }
  }

  const failed = checks.filter((c) => !c.ok)

  if (failed.length > 0) {
    const passed = checks.filter((c) => c.ok).map((c) => c.name)
    const body = [
      `Daily form health check FAILED on ${EMAIL_CONFIG.siteUrl}.`,
      `${failed.length} of ${checks.length} check(s) failed — one or more of the public lead forms (contact, works inquiry, license request) may be broken:`,
      failed.map((c) => `FAILED: ${c.name}\n  ${c.error}`).join('\n\n'),
      `Passing: ${passed.length ? passed.join(', ') : 'none'}`,
      `Check the affected Supabase table and the matching endpoint (/api/inquiries or /api/licensing/request).`,
    ].join('\n\n')

    const alert = await sendEmail({
      to: ALERT_TO,
      subject: `Form health check FAILED (${failed.length}/${checks.length})`,
      react: PlainMessageEmail({ body, previewText: `${failed.length} form check(s) failing` }),
    })

    console.error('form-health: FAILURES', { failed, alertSent: alert.success, alertError: alert.error })
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Form health check failed', 500, {
      checks,
      alertSent: alert.success,
    })
  }

  console.log('form-health: all checks passed', checks.map((c) => c.name).join(', '))
  return successResponse({ ok: true, checks })
}

async function runCheck(checks: Check[], name: string, fn: () => Promise<void>) {
  try {
    await fn()
    checks.push({ name, ok: true })
  } catch (e) {
    checks.push({ name, ok: false, error: e instanceof Error ? e.message : String(e) })
  }
}
