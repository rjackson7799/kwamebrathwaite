import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/api/admin'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import { LEAD_CATEGORIES, LEAD_REGIONS, LEAD_SOURCE_KINDS } from '@/lib/leads/types'

const createSchema = z.object({
  kind: z.enum(LEAD_SOURCE_KINDS as [string, ...string[]]),
  url_or_handle: z.string().min(1).max(500),
  label: z.string().max(200).optional().nullable(),
  category_hint: z.enum(LEAD_CATEGORIES as [string, ...string[]]).optional().nullable(),
  region: z.enum(LEAD_REGIONS as [string, ...string[]]).default('other'),
  language: z.string().max(5).optional().nullable(),
  active: z.boolean().default(true),
})

export async function GET(request: NextRequest) {
  const { errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('lead_sources')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('lead_sources list error:', error)
    return errorResponse(ErrorCodes.DB_ERROR, 'Failed to fetch sources', 500)
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
      'Invalid source payload',
      400,
      parsed.error.flatten().fieldErrors
    )
  }

  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('lead_sources')
    .insert(parsed.data)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return errorResponse(ErrorCodes.DUPLICATE_ENTRY, 'Source already exists', 409)
    }
    console.error('lead_sources insert error:', error)
    return errorResponse(ErrorCodes.DB_ERROR, 'Failed to create source', 500)
  }

  return successResponse(data, undefined, 201)
}
