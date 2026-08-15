/**
 * POST /api/admin/import/[id]/items/[itemId]/rematch
 *
 * Refresh a stale or invalidated match.
 *
 * A STALE_TARGET item cannot simply go back to `pending` carrying its old diff:
 * the human approved a comparison that no longer describes reality. Rematch
 * recomputes the match against the CURRENT record, rebuilds the default apply
 * mask, and clears `reviewed_at` so a live change must be approved again.
 */

import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import { requireAdmin } from '@/lib/api/admin'
import {
  findExhibitionMatch,
  findPressMatch,
  buildMatchSummary,
  changedFields,
} from '@/lib/import/matching'
import {
  loadExhibitionCandidates,
  loadPressCandidates,
  type ImportItemRow,
} from '@/lib/import/service'
import {
  writableFieldsFor,
  type ParsedExhibition,
  type ParsedPress,
} from '@/lib/import/schemas'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { errorResponse: authError } = await requireAdmin(request)
  if (authError) return authError

  const { id, itemId } = await params
  const supabase = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing, error } = await (supabase as any)
    .from('content_import_items')
    .select('*')
    .eq('id', itemId)
    .eq('import_id', id)
    .single()

  if (error || !existing) {
    return errorResponse(ErrorCodes.NOT_FOUND, 'Item not found in this import', 404)
  }

  const item = existing as ImportItemRow

  if (item.status === 'published') {
    return errorResponse('ALREADY_PUBLISHED', 'This item has already been published.', 409)
  }

  const effective = { ...(item.parsed_data ?? {}), ...(item.edited_data ?? {}) }

  const update: Record<string, unknown> = {
    // Rematching always reopens approval — the diff is about to change.
    reviewed_at: null,
    status: 'pending',
    error_message: null,
  }

  if (item.target_type === 'exhibition') {
    const candidates = await loadExhibitionCandidates(supabase)
    const match = findExhibitionMatch(effective as unknown as ParsedExhibition, candidates)
    const matched = match.matchId ? candidates.find((c) => c.id === match.matchId) ?? null : null

    const summary = matched
      ? buildMatchSummary(
          effective,
          matched as unknown as Record<string, unknown>,
          writableFieldsFor('exhibition')
        )
      : null

    Object.assign(update, {
      match_exhibition_id: match.matchId,
      match_press_id: null,
      match_target_updated_at: match.targetUpdatedAt,
      match_confidence: match.confidence,
      match_summary: summary,
      match_snapshot: matched
        ? { id: matched.id, type: 'exhibition', title: matched.title, status: matched.status ?? null }
        : null,
      action: match.action,
      // Live targets start with nothing ticked; drafts get the changed fields.
      apply_mask: summary && matched?.status !== 'published' ? changedFields(summary) : [],
      warnings: match.warnings,
    })
  } else {
    const candidates = await loadPressCandidates(supabase)
    const match = findPressMatch(effective as unknown as ParsedPress, candidates)
    const matched = match.matchId ? candidates.find((c) => c.id === match.matchId) ?? null : null

    const summary = matched
      ? buildMatchSummary(
          effective,
          matched as unknown as Record<string, unknown>,
          writableFieldsFor('press')
        )
      : null

    Object.assign(update, {
      match_press_id: match.matchId,
      match_exhibition_id: null,
      match_target_updated_at: match.targetUpdatedAt,
      match_confidence: match.confidence,
      match_summary: summary,
      match_snapshot: matched
        ? { id: matched.id, type: 'press', title: matched.title, status: matched.status ?? null }
        : null,
      action: match.action,
      apply_mask: summary && matched?.status !== 'published' ? changedFields(summary) : [],
      warnings: match.warnings,
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error: updateError } = await (supabase as any)
    .from('content_import_items')
    .update(update)
    .eq('id', itemId)
    .eq('import_id', id)
    .select()
    .single()

  if (updateError) {
    return errorResponse(ErrorCodes.DB_ERROR, 'Could not refresh the match', 500)
  }

  return successResponse({ item: data })
}
