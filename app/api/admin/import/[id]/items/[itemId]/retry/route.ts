/**
 * POST /api/admin/import/[id]/items/[itemId]/retry
 *
 * Return a failed item to `pending` so it can be published again.
 *
 * Deliberately REFUSES stale-target failures: those carry a diff the human
 * approved against a version of the record that no longer exists, so retrying
 * blindly would re-apply an out-of-date comparison. They must go through
 * /rematch instead.
 */

import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import { requireAdmin } from '@/lib/api/admin'
import type { ImportItemRow } from '@/lib/import/service'

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

  if (item.status !== 'failed') {
    return errorResponse(
      'NOT_RETRYABLE',
      `Only failed items can be retried (this one is "${item.status}").`,
      409
    )
  }

  if (item.error_message === 'STALE_TARGET' || /changed after it was matched/i.test(item.error_message ?? '')) {
    return errorResponse(
      'REQUIRES_REMATCH',
      'This record changed after it was matched. Refresh the match and review the new differences before publishing.',
      409
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error: updateError } = await (supabase as any)
    .from('content_import_items')
    .update({ status: 'pending', error_message: null })
    .eq('id', itemId)
    .eq('import_id', id)
    .select()
    .single()

  if (updateError) {
    return errorResponse(ErrorCodes.DB_ERROR, 'Could not reset this item', 500)
  }

  return successResponse({ item: data })
}
