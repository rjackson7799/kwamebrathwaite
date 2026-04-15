import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/api/admin'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import { LEAD_STATUSES } from '@/lib/leads/types'

const updateSchema = z.object({
  status: z.enum(LEAD_STATUSES as [string, ...string[]]).optional(),
  notes: z.string().max(5000).optional().nullable(),
  dismissed_reason: z.string().max(500).optional().nullable(),
  organization: z.string().max(200).optional().nullable(),
  contact_name: z.string().max(200).optional().nullable(),
  contact_role: z.string().max(200).optional().nullable(),
  contact_email: z.string().email().or(z.literal('')).optional().nullable(),
  contact_phone: z.string().max(50).optional().nullable(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  const { id } = await params

  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('leads')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return errorResponse(ErrorCodes.NOT_FOUND, 'Lead not found', 404)
  }

  return successResponse(data)
}

export async function PATCH(
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

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(
      ErrorCodes.VALIDATION_ERROR,
      'Invalid update payload',
      400,
      parsed.error.flatten().fieldErrors
    )
  }

  // Normalize empty-string email to null so the DB doesn't choke on validation later.
  const update: Record<string, unknown> = { ...parsed.data }
  if (update.contact_email === '') update.contact_email = null

  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('leads')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('lead update error:', error)
    return errorResponse(ErrorCodes.DB_ERROR, 'Failed to update lead', 500)
  }

  if (!data) {
    return errorResponse(ErrorCodes.NOT_FOUND, 'Lead not found', 404)
  }

  return successResponse(data)
}
