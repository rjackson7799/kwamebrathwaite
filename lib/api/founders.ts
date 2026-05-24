import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponse } from './response'

/**
 * Require an active Founder for /api/founders/* routes that should not
 * accept invited/paused/archived members.
 *
 * Returns the user if the caller is signed in AND has a founders row with
 * status='active'. Otherwise returns a 401 (no session) or 403 (signed in
 * but not an active founder) error response.
 *
 * Backed by public.is_current_founder() — a no-arg SECURITY DEFINER helper
 * added in 2026-05-24-briefings.sql that reads auth.uid() internally. The
 * function is granted to `authenticated` only (never anon) so this RPC call
 * cannot be used as a membership oracle from public contexts.
 */
export async function requireFounder(_request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      user: null,
      errorResponse: errorResponse('UNAUTHORIZED', 'Authentication required', 401),
    }
  }

  const { data: isFounder, error: rpcError } = await (supabase as unknown as {
    rpc: (fn: 'is_current_founder') => Promise<{ data: boolean | null; error: unknown }>
  }).rpc('is_current_founder')

  if (rpcError || !isFounder) {
    return {
      user: null,
      errorResponse: errorResponse('FORBIDDEN', 'Founder access required', 403),
    }
  }

  return { user, errorResponse: null }
}
