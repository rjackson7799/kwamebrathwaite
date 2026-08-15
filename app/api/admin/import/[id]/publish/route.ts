/**
 * POST /api/admin/import/[id]/publish
 *
 * Publishes a selection of items, one at a time and independently.
 *
 * Preparation (merge, derive, validate) happens here in TypeScript because a
 * Postgres function cannot call zod, generateSlug, or the geocoder. Everything
 * that must be ATOMIC — the claim, the staleness re-check, the write, the state
 * transition and the audit row — happens inside publish_import_item().
 *
 * Partial failure is normal and expected: one bad row must never roll back
 * nineteen good ones.
 */

import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import { requireAdmin } from '@/lib/api/admin'
import { contentImportPublishSchema } from '@/lib/api/validation'
import { geocodeLocation } from '@/lib/import/geocode'
import { preparePublish, type ImportItemRow } from '@/lib/import/service'

export const maxDuration = 300

interface PublishOutcome {
  itemId: string
  ok: boolean
  code: string
  entityId?: string
  message?: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, errorResponse: authError } = await requireAdmin(request)
  if (authError) return authError

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid request body', 400)
  }

  const parsed = contentImportPublishSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(
      ErrorCodes.VALIDATION_ERROR,
      'Invalid publish request',
      400,
      parsed.error.flatten().fieldErrors
    )
  }

  const supabase = createAdminClient()

  // Scoped by import id so an item from another batch cannot be published here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: items, error } = await (supabase as any)
    .from('content_import_items')
    .select('*')
    .eq('import_id', id)
    .in('id', parsed.data.itemIds)
    .order('source_index', { ascending: true })

  if (error) {
    return errorResponse(ErrorCodes.DB_ERROR, 'Could not load the selected items', 500)
  }

  const rows = (items ?? []) as ImportItemRow[]
  if (rows.length === 0) {
    return errorResponse(ErrorCodes.NOT_FOUND, 'None of those items are in this import', 404)
  }

  const outcomes: PublishOutcome[] = []
  // Shared across the whole request so two new entries with the same title
  // cannot be handed the same slug.
  const reservedSlugs = new Set<string>()

  for (const item of rows) {
    if (item.status === 'published') {
      outcomes.push({ itemId: item.id, ok: false, code: 'ALREADY_PUBLISHED' })
      continue
    }
    if (item.status === 'skipped' || item.action === 'skip') {
      outcomes.push({ itemId: item.id, ok: false, code: 'SKIPPED' })
      continue
    }

    try {
      const prepared = await preparePublish(supabase, item, reservedSlugs)

      if (!prepared.ok) {
        outcomes.push({
          itemId: item.id,
          ok: false,
          code: 'VALIDATION_FAILED',
          message: prepared.errors.join(' '),
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('content_import_items')
          .update({ status: 'failed', error_message: prepared.errors.join(' ') })
          .eq('id', item.id)
        continue
      }

      // Geocoding is best-effort and must NEVER block a publish. A row with no
      // coordinates simply does not appear on the map until someone edits it.
      if (
        prepared.targetType === 'exhibition' &&
        item.action === 'create' &&
        prepared.payload.location_lat === undefined
      ) {
        const coords = await geocodeLocation({
          venue: prepared.payload.venue as string | null,
          city: prepared.payload.city as string | null,
          state_region: prepared.payload.state_region as string | null,
          country: prepared.payload.country as string | null,
        })
        if (coords) {
          prepared.payload.location_lat = coords.lat
          prepared.payload.location_lng = coords.lng
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: result, error: rpcError } = await (supabase as any).rpc(
        'publish_import_item',
        {
          p_item_id: item.id,
          p_actor: user!.id,
          p_target_type: prepared.targetType,
          p_expected_updated_at: prepared.expectedUpdatedAt,
          p_payload: prepared.payload,
          p_apply_mask: prepared.applyMask,
        }
      )

      if (rpcError) {
        outcomes.push({
          itemId: item.id,
          ok: false,
          code: 'RPC_ERROR',
          message: rpcError.message,
        })
        continue
      }

      const outcome = result as { ok: boolean; code: string; entity_id?: string; message?: string }
      outcomes.push({
        itemId: item.id,
        ok: outcome.ok,
        code: outcome.code,
        entityId: outcome.entity_id,
        message: outcome.message,
      })
    } catch (err) {
      console.error('Publish failed for item', item.id, err)
      outcomes.push({
        itemId: item.id,
        ok: false,
        code: 'UNEXPECTED',
        message: err instanceof Error ? err.message : 'Unexpected error',
      })
    }
  }

  const published = outcomes.filter((o) => o.ok).length

  return successResponse({
    published,
    failed: outcomes.length - published,
    outcomes,
  })
}
