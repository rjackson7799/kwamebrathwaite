import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/api/admin'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import { LEAD_CATEGORIES, LEAD_REGIONS } from '@/lib/leads/types'

const createSchema = z.object({
  category: z.enum(LEAD_CATEGORIES as [string, ...string[]]),
  region: z.enum(LEAD_REGIONS as [string, ...string[]]),
  language: z.string().min(2).max(5).default('en'),
  query_text: z.string().min(3).max(500),
  label: z.string().max(200).optional().nullable(),
  active: z.boolean().default(true),
})

export async function GET(request: NextRequest) {
  const { errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('lead_query_templates')
    .select('*')
    .order('category')
    .order('region')

  if (error) {
    console.error('lead_query_templates list error:', error)
    return errorResponse(ErrorCodes.DB_ERROR, 'Failed to fetch templates', 500)
  }

  return successResponse(data || [])
}

export async function POST(request: NextRequest) {
  const { errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid JSON body', 400)
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(
      ErrorCodes.VALIDATION_ERROR,
      'Invalid template payload',
      400,
      parsed.error.flatten().fieldErrors
    )
  }

  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('lead_query_templates')
    .insert(parsed.data)
    .select()
    .single()

  if (error) {
    console.error('lead_query_templates insert error:', error)
    return errorResponse(ErrorCodes.DB_ERROR, 'Failed to create template', 500)
  }

  return successResponse(data, undefined, 201)
}
