import { NextRequest } from 'next/server'
import { successResponse } from '@/lib/api'
import { requireFounder } from '@/lib/api/founders'
import { getFulfillmentForFounder } from '@/lib/founders/print'

// GET /api/founders/print/fulfillment
//
// Returns the current founder's fulfillment row, projected to safe columns
// only. internal_notes is intentionally NOT selected here — it's admin-only
// metadata that happens to live on the same row. The helper enforces the
// projection at the query layer; this route enforces the auth gate.
//
// Anonymous → 401. Non-active founder → 403. Member with no fulfillment
// row yet → 200 { fulfillment: null } (the portal renders a "preparing"
// placeholder client-side).
export async function GET(request: NextRequest) {
  const { user, errorResponse: authError } = await requireFounder(request)
  if (authError) return authError

  const fulfillment = await getFulfillmentForFounder(user!.id)
  return successResponse({ fulfillment })
}
