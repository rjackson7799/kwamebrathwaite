/**
 * PATCH /api/admin/import/[id]/items/[itemId]
 *
 * Partial save of one staged item. Cross-batch item ids are rejected: the item
 * must belong to the batch named in the URL.
 */

import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import { requireAdmin } from '@/lib/api/admin'
import { contentImportItemPatchSchema } from '@/lib/api/validation'
import { writableFieldsFor } from '@/lib/import/schemas'
import { editInvalidatesMatch, type ImportItemRow } from '@/lib/import/service'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { errorResponse: authError } = await requireAdmin(request)
  if (authError) return authError

  const { id, itemId } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid request body', 400)
  }

  const parsed = contentImportItemPatchSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(
      ErrorCodes.VALIDATION_ERROR,
      'Invalid item update',
      400,
      parsed.error.flatten().fieldErrors
    )
  }

  const supabase = createAdminClient()

  // Scoped by BOTH ids — an item id from another batch must not be editable
  // through this batch's URL.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing, error: fetchError } = await (supabase as any)
    .from('content_import_items')
    .select('*')
    .eq('id', itemId)
    .eq('import_id', id)
    .single()

  if (fetchError || !existing) {
    return errorResponse(ErrorCodes.NOT_FOUND, 'Item not found in this import', 404)
  }

  const item = existing as ImportItemRow

  if (item.status === 'published') {
    return errorResponse(
      'ALREADY_PUBLISHED',
      'This item has already been published and can no longer be edited.',
      409
    )
  }

  const patch = parsed.data
  const update: Record<string, unknown> = {}
  const notices: string[] = []

  const nextTargetType = patch.target_type ?? item.target_type

  // --- target type change: fields and match no longer transfer -------------
  if (patch.target_type && patch.target_type !== item.target_type) {
    update.target_type = patch.target_type
    update.entry_kind = patch.target_type === 'exhibition' ? 'exhibition' : null
    // A press match means nothing for an exhibition and vice versa.
    update.match_exhibition_id = null
    update.match_press_id = null
    update.match_summary = null
    update.match_snapshot = null
    update.match_confidence = null
    update.match_target_updated_at = null
    update.action = 'create'
    update.apply_mask = []
    update.reviewed_at = null
    notices.push('Target type changed — the previous match and approved fields were cleared.')
  } else if (patch.entry_kind !== undefined) {
    update.entry_kind = nextTargetType === 'exhibition' ? patch.entry_kind : null
  }

  // --- edited data ---------------------------------------------------------
  if (patch.edited_data) {
    const allowed = new Set(writableFieldsFor(nextTargetType))
    const filtered: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(patch.edited_data)) {
      // Silently dropping unknown keys would hide a real client bug.
      if (!allowed.has(key)) {
        return errorResponse(
          ErrorCodes.VALIDATION_ERROR,
          `"${key}" is not an editable field on a ${nextTargetType}.`,
          400
        )
      }
      filtered[key] = value
    }

    const merged = { ...(item.edited_data ?? {}), ...filtered }
    update.edited_data = merged

    // Editing something that identifies WHICH record this is invalidates the
    // match — the approved diff may no longer describe the same thing.
    const before = { ...(item.parsed_data ?? {}), ...(item.edited_data ?? {}) }
    if (
      item.action === 'update' &&
      !update.target_type &&
      editInvalidatesMatch(nextTargetType, before, filtered)
    ) {
      update.match_target_updated_at = null
      update.reviewed_at = null
      notices.push(
        'You changed a field that identifies this record, so the match needs refreshing before it can be published.'
      )
    }
  }

  // --- apply mask ----------------------------------------------------------
  if (patch.apply_mask) {
    const allowed = new Set(writableFieldsFor(nextTargetType))
    const unknown = patch.apply_mask.filter((f) => !allowed.has(f))
    if (unknown.length > 0) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        `Cannot apply unknown field(s): ${unknown.join(', ')}`,
        400
      )
    }
    update.apply_mask = patch.apply_mask
  }

  // --- action / skip -------------------------------------------------------
  if (patch.action) {
    update.action = patch.action
    // Intent and execution state are separate, but skipping takes effect now
    // and is freely reversible.
    if (patch.action === 'skip') {
      update.status = 'skipped'
    } else if (item.status === 'skipped') {
      update.status = 'pending'
    }
  }

  // --- explicit review of a live update -----------------------------------
  if (patch.reviewed === true) {
    update.reviewed_at = new Date().toISOString()
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('content_import_items')
    .update(update)
    .eq('id', itemId)
    .eq('import_id', id)
    .select()
    .single()

  if (error) {
    console.error('Failed to update import item:', error)
    return errorResponse(ErrorCodes.DB_ERROR, 'Could not save this item', 500)
  }

  return successResponse({ item: data, notices })
}
