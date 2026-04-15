import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAuth, getCurrentUserEmail } from '@/lib/api/admin'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import { sendEmail } from '@/lib/email/send'
import { PlainMessageEmail } from '@/lib/email/templates/PlainMessageEmail'

export const maxDuration = 30

const bodySchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1).max(300),
  body: z.string().min(1).max(20_000),
  reply_to: z.string().email().optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid JSON body', 400)
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(
      ErrorCodes.VALIDATION_ERROR,
      'Invalid payload',
      400,
      parsed.error.flatten().fieldErrors
    )
  }

  const adminEmail = await getCurrentUserEmail()
  const replyTo = parsed.data.reply_to || adminEmail || undefined

  const result = await sendEmail({
    to: parsed.data.to,
    subject: parsed.data.subject,
    react: PlainMessageEmail({ body: parsed.data.body }),
    replyTo,
  })

  if (!result.success) {
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      result.error || 'Send failed',
      500
    )
  }

  // Mark lead as 'contacted' and append a note. Don't fail the request if this errors.
  const supabase = createAdminClient()
  const noteLine = `[${new Date().toISOString().slice(0, 10)}] Sent intro to ${parsed.data.to} (subject: "${parsed.data.subject.slice(0, 80)}")`
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: cur } = await (supabase as any)
    .from('leads')
    .select('notes, status')
    .eq('id', id)
    .single()

  const nextNotes = [cur?.notes, noteLine].filter(Boolean).join('\n')
  const nextStatus = cur?.status === 'new' || cur?.status === 'qualified' ? 'contacted' : cur?.status

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('leads')
    .update({ notes: nextNotes, status: nextStatus })
    .eq('id', id)

  return successResponse({ id: result.id })
}
