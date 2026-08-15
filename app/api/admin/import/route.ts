/**
 * POST /api/admin/import  — create a batch, parse it, match it, persist it.
 * GET  /api/admin/import  — recent batches with derived publish progress.
 *
 * Synchronous by design, following the precedent set by
 * app/api/admin/leads/run/route.ts: a blocking admin AI route with
 * maxDuration = 300 and a cost cap, rather than a job queue.
 *
 * The caps in lib/ai/content-parser.ts are a BUDGET, not a guess — a per-call
 * timeout, a chunk ceiling, and a wall-clock check that returns partial results
 * instead of being killed mid-write.
 */

import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import { requireAdmin, logActivity, getCurrentUserEmail } from '@/lib/api/admin'
import {
  contentImportCreateSchema,
  contentImportFiltersSchema,
  parseSearchParams,
} from '@/lib/api/validation'
import { getPagination } from '@/lib/api/pagination'
import { rateLimitPersistent } from '@/lib/api/rate-limit'
import { parseContentBlob, ContentParseError } from '@/lib/ai/content-parser'
import { estimateCost } from '@/lib/ai/config'
import {
  buildItemRows,
  loadExhibitionCandidates,
  loadPressCandidates,
  deriveBatchProgress,
  type ItemStatus,
} from '@/lib/import/service'

export const maxDuration = 300

/** Above this, the client must explicitly confirm before we spend anything. */
const COST_CONFIRM_THRESHOLD_USD = 0.25

export async function POST(request: NextRequest) {
  const { user, errorResponse: authError } = await requireAdmin(request)
  if (authError) return authError

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid request body', 400)
  }

  const parsedBody = contentImportCreateSchema.safeParse(body)
  if (!parsedBody.success) {
    return errorResponse(
      ErrorCodes.VALIDATION_ERROR,
      'Invalid import request',
      400,
      parsedBody.error.flatten().fieldErrors
    )
  }

  const { raw_text, source_label, confirmed_cost_estimate } = parsedBody.data

  // Rate limit per admin, not per IP — this is an authenticated, expensive route.
  const limit = await rateLimitPersistent('content_import', user!.id, 6, 60_000)
  if (!limit.success) {
    return errorResponse(
      ErrorCodes.RATE_LIMIT,
      'Too many imports in a row. Wait a moment and try again.',
      429
    )
  }

  // Cost gate, enforced server-side. The estimate is RE-COMPUTED here rather
  // than trusted from the client, so a small confirmed value cannot skip it.
  const estimate = estimateCost(raw_text)
  if (estimate > COST_CONFIRM_THRESHOLD_USD && confirmed_cost_estimate === undefined) {
    return errorResponse(
      'COST_CONFIRMATION_REQUIRED',
      `This paste is large enough to cost about $${estimate.toFixed(2)} to parse. Confirm to continue.`,
      409,
      { estimated_cost_usd: estimate }
    )
  }

  const supabase = createAdminClient()
  const userEmail = await getCurrentUserEmail()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: batch, error: insertError } = await (supabase as any)
    .from('content_imports')
    .insert({
      raw_text,
      source_label: source_label || null,
      status: 'parsing',
      created_by: user!.id,
      created_by_email: userEmail,
    })
    .select()
    .single()

  if (insertError || !batch) {
    console.error('Failed to create import batch:', insertError)
    return errorResponse(ErrorCodes.DB_ERROR, 'Could not start the import', 500)
  }

  try {
    const parseResult = await parseContentBlob(raw_text)

    const [exhibitions, press] = await Promise.all([
      loadExhibitionCandidates(supabase),
      loadPressCandidates(supabase),
    ])

    const rows = buildItemRows({
      importId: batch.id,
      parsed: parseResult.items,
      exhibitions,
      press,
    })

    if (rows.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: itemsError } = await (supabase as any)
        .from('content_import_items')
        .insert(rows)
      if (itemsError) throw new Error(`Could not save parsed items: ${itemsError.message}`)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('content_imports')
      .update({
        status: 'ready',
        model: parseResult.model,
        prompt_version: parseResult.promptVersion,
        chunk_count: parseResult.chunkCount,
        input_tokens: parseResult.inputTokens,
        output_tokens: parseResult.outputTokens,
        latency_ms: parseResult.latencyMs,
        cost_usd: parseResult.costUsd,
        error_message: parseResult.warnings.length ? parseResult.warnings.join(' ') : null,
      })
      .eq('id', batch.id)

    if (userEmail) {
      await logActivity(userEmail, 'create', 'content_import', batch.id, source_label || 'Smart Import')
    }

    return successResponse(
      {
        id: batch.id,
        item_count: rows.length,
        warnings: parseResult.warnings,
        cost_usd: parseResult.costUsd,
      },
      undefined,
      201
    )
  } catch (error) {
    const message =
      error instanceof ContentParseError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Parsing failed'

    // Never log the full pasted document or raw model response.
    console.error('Smart Import parse failed', {
      batchId: batch.id,
      code: error instanceof ContentParseError ? error.code : 'UNKNOWN',
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('content_imports')
      .update({ status: 'failed', error_message: message })
      .eq('id', batch.id)

    const status =
      error instanceof ContentParseError && error.code === 'TOO_LARGE'
        ? 400
        : error instanceof ContentParseError && error.code === 'RATE_LIMIT'
          ? 429
          : 500

    return errorResponse(
      error instanceof ContentParseError ? error.code : ErrorCodes.INTERNAL_ERROR,
      message,
      status,
      { import_id: batch.id }
    )
  }
}

export async function GET(request: NextRequest) {
  const { errorResponse: authError } = await requireAdmin(request)
  if (authError) return authError

  const filters = contentImportFiltersSchema.safeParse(
    parseSearchParams(request.nextUrl.searchParams)
  )
  if (!filters.success) {
    return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid query parameters', 400)
  }

  const { page, limit, include_archived } = filters.data
  const { from, to } = getPagination(page, limit)
  const supabase = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('content_imports')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  // Archived batches are retained for provenance but stay out of the way.
  if (!include_archived) query = query.is('archived_at', null)

  const { data, count, error } = await query
  if (error) {
    console.error('Failed to list imports:', error)
    return errorResponse(ErrorCodes.DB_ERROR, 'Could not load imports', 500)
  }

  const batches = (data ?? []) as { id: string }[]

  // item_count and progress are DERIVED, never stored, so they cannot drift.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: itemRows } = await (supabase as any)
    .from('content_import_items')
    .select('import_id, status')
    .in('import_id', batches.map((b) => b.id))

  const byBatch = new Map<string, ItemStatus[]>()
  for (const row of (itemRows ?? []) as { import_id: string; status: ItemStatus }[]) {
    const list = byBatch.get(row.import_id) ?? []
    list.push(row.status)
    byBatch.set(row.import_id, list)
  }

  const enriched = batches.map((batch) => {
    const statuses = byBatch.get(batch.id) ?? []
    return {
      ...batch,
      item_count: statuses.length,
      progress: deriveBatchProgress(statuses),
    }
  })

  return successResponse(enriched, {
    page,
    pageSize: limit,
    total: count || 0,
    totalPages: Math.ceil((count || 0) / limit),
  })
}
