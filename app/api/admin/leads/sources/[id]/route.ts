import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/api/admin'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import { LEAD_CATEGORIES, LEAD_REGIONS, LEAD_SOURCE_KINDS } from '@/lib/leads/types'

const updateSchema = z.object({
  kind: z.enum(LEAD_SOURCE_KINDS as [string, ...string[]]).optional(),
  url_or_handle: z.string().min(1).max(500).optional(),
  label: z.string().max(200).optional().nullable(),
  category_hint: z.enum(LEAD_CATEGORIES as [string, ...string[]]).optional().nullable(),
  region: z.enum(LEAD_REGIONS as [string, ...string[]]).optional(),
  language: z.string().max(5).optional().nullable(),
  active: z.boolean().optional(),
})

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

  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('lead_sources')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('lead_sources update error:', error)
    return errorResponse(ErrorCodes.DB_ERROR, 'Failed to update source', 500)
  }

  if (!data) {
    return errorResponse(ErrorCodes.NOT_FOUND, 'Source not found', 404)
  }

  return successResponse(data)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  const { id } = await params

  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('lead_sources')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('lead_sources delete error:', error)
    return errorResponse(ErrorCodes.DB_ERROR, 'Failed to delete source', 500)
  }

  return successResponse({ id })
}
