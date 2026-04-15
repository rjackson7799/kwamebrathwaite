import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAuth, getCurrentUserEmail } from '@/lib/api/admin'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import {
  draftIntroMessage,
  translateToJapanese,
  INTRO_TONES,
  IntroTone,
} from '@/lib/leads/draft-message'

export const maxDuration = 60

const bodySchema = z.object({
  tone: z.enum(INTRO_TONES as [string, ...string[]]),
  language: z.enum(['en', 'ja']).default('en'),
  sender_name: z.string().min(1).max(200).optional(),
  sender_title: z.string().max(200).optional().nullable(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  const { id } = await params

  let body: unknown = {}
  try {
    body = await request.json()
  } catch {
    /* allow empty */
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(
      ErrorCodes.VALIDATION_ERROR,
      'Invalid draft payload',
      400,
      parsed.error.flatten().fieldErrors
    )
  }

  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: lead, error } = await (supabase as any)
    .from('leads')
    .select('*')
    .eq('id', id)
    .single()
  if (error || !lead) {
    return errorResponse(ErrorCodes.NOT_FOUND, 'Lead not found', 404)
  }

  // Resolve sender name: explicit > current admin user email local part > fallback.
  let senderName = parsed.data.sender_name
  if (!senderName) {
    const email = await getCurrentUserEmail()
    senderName = email ? email.split('@')[0] : 'Kwame Brathwaite Archive'
  }

  try {
    const draft = await draftIntroMessage({
      leadTitle: lead.title,
      leadSummary: lead.summary_en,
      leadCategory: lead.category,
      leadRegion: lead.region,
      sourceUrl: lead.source_url,
      organization: lead.organization,
      contactName: lead.contact_name,
      contactRole: lead.contact_role,
      tone: parsed.data.tone as IntroTone,
      senderName,
      senderTitle: parsed.data.sender_title || undefined,
    })

    if (parsed.data.language === 'ja') {
      const ja = await translateToJapanese(draft)
      return successResponse({ ...ja, language: 'ja' })
    }

    return successResponse({ ...draft, language: 'en' })
  } catch (e) {
    console.error('draft-message error:', e)
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      e instanceof Error ? e.message : 'Failed to draft message',
      500
    )
  }
}
