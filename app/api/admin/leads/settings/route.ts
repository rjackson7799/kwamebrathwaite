import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/api/admin'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import { DEFAULT_LEAD_SETTINGS, LeadSettings } from '@/lib/leads/types'

const patchSchema = z.object({
  budget_cap_usd: z.number().min(0).max(1000).optional(),
  digest_recipient: z.string().email().or(z.literal('')).optional(),
  top_n_per_category: z.number().int().min(1).max(50).optional(),
  deep_research_enabled: z.boolean().optional(),
})

type SettingsRow = { key: string; value: unknown }

function rowsToSettings(rows: SettingsRow[]): LeadSettings {
  const out: LeadSettings = { ...DEFAULT_LEAD_SETTINGS }
  for (const row of rows) {
    if (row.key === 'budget_cap_usd' && typeof row.value === 'number') {
      out.budget_cap_usd = row.value
    } else if (row.key === 'digest_recipient' && typeof row.value === 'string') {
      out.digest_recipient = row.value
    } else if (row.key === 'top_n_per_category' && typeof row.value === 'number') {
      out.top_n_per_category = row.value
    } else if (row.key === 'deep_research_enabled' && typeof row.value === 'boolean') {
      out.deep_research_enabled = row.value
    }
  }
  return out
}

export async function GET(request: NextRequest) {
  const { errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('lead_settings')
    .select('key, value')

  if (error) {
    console.error('lead_settings get error:', error)
    return errorResponse(ErrorCodes.DB_ERROR, 'Failed to fetch settings', 500)
  }

  return successResponse(rowsToSettings((data as SettingsRow[]) || []))
}

export async function PATCH(request: NextRequest) {
  const { errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid JSON body', 400)
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(
      ErrorCodes.VALIDATION_ERROR,
      'Invalid settings payload',
      400,
      parsed.error.flatten().fieldErrors
    )
  }

  const entries = Object.entries(parsed.data).map(([key, value]) => ({
    key,
    value: value as unknown,
    updated_at: new Date().toISOString(),
  }))

  if (entries.length === 0) {
    return successResponse({ updated: 0 })
  }

  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('lead_settings')
    .upsert(entries, { onConflict: 'key' })

  if (error) {
    console.error('lead_settings upsert error:', error)
    return errorResponse(ErrorCodes.DB_ERROR, 'Failed to update settings', 500)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows } = await (supabase as any)
    .from('lead_settings')
    .select('key, value')

  return successResponse(rowsToSettings((rows as SettingsRow[]) || []))
}
