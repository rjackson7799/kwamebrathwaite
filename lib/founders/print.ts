import { createClient } from '@/lib/supabase/server'

export type PrintFulfillmentStatus =
  | 'pending'
  | 'in_production'
  | 'ready'
  | 'shipped'
  | 'delivered'

export interface PrintFulfillmentSafe {
  edition_number: number | null
  is_ap: boolean
  status: PrintFulfillmentStatus
  shipped_at: string | null
  delivered_at: string | null
  tracking_url: string | null
  coa_issued_at: string | null
}

/**
 * Portal-side: fetch the current Founder's fulfillment row, projecting only
 * member-safe columns. internal_notes is deliberately NEVER selected — it
 * lives in the same row but is admin-only audit information, and the
 * Phase 2C RLS policy permits members to read their own row in full.
 * The fixed projection here is belt-and-braces against accidental leakage
 * through hand-written queries.
 *
 * Returns null when no row exists yet (admin has not created one), so the
 * portal showcase can render the "preparing" placeholder without crashing.
 */
export async function getFulfillmentForFounder(
  userId: string
): Promise<PrintFulfillmentSafe | null> {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('founder_print_fulfillments')
    .select('edition_number, is_ap, status, shipped_at, delivered_at, tracking_url, coa_issued_at')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error('getFulfillmentForFounder failed:', error)
    return null
  }
  return (data ?? null) as PrintFulfillmentSafe | null
}
