import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/api/admin'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import { sendLeadDigest } from '@/lib/leads/digest'

export const maxDuration = 60

const bodySchema = z.object({
  window_days: z.number().int().min(1).max(90).optional(),
  to: z
    .string()
    .max(1000)
    .refine(
      (s) => {
        const parts = s.split(',').map((p) => p.trim()).filter(Boolean)
        return (
          parts.length > 0 &&
          parts.every((p) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p))
        )
      },
      { message: 'Must be one email or a comma-separated list of emails' }
    )
    .optional(),
  run_id: z.string().uuid().optional(),
})

export async function POST(request: NextRequest) {
  const { errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

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
      'Invalid digest payload',
      400,
      parsed.error.flatten().fieldErrors
    )
  }

  try {
    const result = await sendLeadDigest({
      windowDays: parsed.data.window_days,
      to: parsed.data.to,
      runId: parsed.data.run_id,
    })
    return successResponse(result)
  } catch (e) {
    console.error('manual digest error:', e)
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      e instanceof Error ? e.message : 'Digest failed',
      500
    )
  }
}
