/**
 * GET    /api/admin/import/[id]  — batch + its items
 * DELETE /api/admin/import/[id]  — discard, or archive once anything published
 */

import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import { requireAdmin, logActivity, getCurrentUserEmail } from '@/lib/api/admin'
import { deriveBatchProgress, type ItemStatus } from '@/lib/import/service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { errorResponse: authError } = await requireAdmin(request)
  if (authError) return authError

  const { id } = await params
  const supabase = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: batch, error } = await (supabase as any)
    .from('content_imports')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !batch) {
    return errorResponse(ErrorCodes.NOT_FOUND, 'Import not found', 404)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: items, error: itemsError } = await (supabase as any)
    .from('content_import_items')
    .select('*')
    .eq('import_id', id)
    .order('source_index', { ascending: true })

  if (itemsError) {
    return errorResponse(ErrorCodes.DB_ERROR, 'Could not load import items', 500)
  }

  const rows = (items ?? []) as { status: ItemStatus }[]

  return successResponse({
    ...batch,
    item_count: rows.length,
    progress: deriveBatchProgress(rows.map((r) => r.status)),
    items: items ?? [],
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { errorResponse: authError } = await requireAdmin(request)
  if (authError) return authError

  const { id } = await params
  const supabase = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: batch } = await (supabase as any)
    .from('content_imports')
    .select('id, source_label')
    .eq('id', id)
    .single()

  if (!batch) return errorResponse(ErrorCodes.NOT_FOUND, 'Import not found', 404)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: publishedCount } = await (supabase as any)
    .from('content_import_items')
    .select('id', { count: 'exact', head: true })
    .eq('import_id', id)
    .eq('status', 'published')

  const userEmail = await getCurrentUserEmail()
  const hasPublished = (publishedCount ?? 0) > 0

  if (hasPublished) {
    // Cascading the items away here would destroy the provenance of records
    // that are now live. Archive instead — the audit trail is the point.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('content_imports')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', id)

    if (error) return errorResponse(ErrorCodes.DB_ERROR, 'Could not archive the import', 500)

    if (userEmail) {
      await logActivity(userEmail, 'update', 'content_import', id, batch.source_label, {
        archived: true,
        reason: 'batch had published items',
      })
    }

    return successResponse({ archived: true, deleted: false })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('content_imports').delete().eq('id', id)
  if (error) return errorResponse(ErrorCodes.DB_ERROR, 'Could not delete the import', 500)

  if (userEmail) {
    await logActivity(userEmail, 'delete', 'content_import', id, batch.source_label)
  }

  return successResponse({ archived: false, deleted: true })
}
