import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/api/admin'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import { LEAD_CATEGORIES, LEAD_REGIONS } from '@/lib/leads/types'

const updateSchema = z.object({
  category: z.enum(LEAD_CATEGORIES as [string, ...string[]]).optional(),
  region: z.enum(LEAD_REGIONS as [string, ...string[]]).optional(),
  language: z.string().min(2).max(5).optional(),
  query_text: z.string().min(3).max(500).optional(),
  label: z.string().max(200).optional().nullable(),
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
    .from('lead_query_templates')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('lead_query_templates update error:', error)
    return errorResponse(ErrorCodes.DB_ERROR, 'Failed to update template', 500)
  }

  if (!data) {
    return errorResponse(ErrorCodes.NOT_FOUND, 'Template not found', 404)
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
    .from('lead_query_templates')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('lead_query_templates delete error:', error)
    return errorResponse(ErrorCodes.DB_ERROR, 'Failed to delete template', 500)
  }

  return successResponse({ id })
}
