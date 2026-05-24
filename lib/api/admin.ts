import { NextRequest } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { errorResponse } from './response'

export type ActivityAction = 'create' | 'update' | 'delete' | 'status_change' | 'reorder'
export type EntityType =
  | 'artwork'
  | 'exhibition'
  | 'press'
  | 'inquiry'
  | 'content'
  | 'media'
  | 'newsletter_subscriber'
  | 'hero_slide'
  | 'product'
  | 'order'
  | 'license_request'
  | 'license_type'
  | 'founder'                  // Phase 1C — Founder's Circle member records
  | 'invitation'               // Phase 1C — Founder invitation lifecycle events
  | 'briefing'                 // Phase 2A — Founder briefings
  | 'briefing_notification'    // Phase 2A — Briefing notification batches

/**
 * Require an authenticated admin for /api/admin/* routes.
 *
 * Returns the user if the caller is signed in AND present in the admins
 * table. Otherwise returns a 401 (no session) or 403 (signed in but not
 * admin) error response.
 *
 * Backed by the public.is_admin(uuid) SECURITY DEFINER function added in
 * 2026-05-22-admins-and-rls-refactor.sql. The function uses the
 * service-role-equivalent SECURITY DEFINER bypass, so this lookup works
 * even though the admins table is itself RLS-protected.
 */
export async function requireAdmin(_request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      user: null,
      errorResponse: errorResponse('UNAUTHORIZED', 'Authentication required', 401),
    }
  }

  const { data: isAdmin, error: rpcError } = await (supabase as unknown as {
    rpc: (fn: 'is_admin', args: { uid: string }) => Promise<{ data: boolean | null; error: unknown }>
  }).rpc('is_admin', { uid: user.id })

  if (rpcError || !isAdmin) {
    return {
      user: null,
      errorResponse: errorResponse('FORBIDDEN', 'Admin access required', 403),
    }
  }

  return { user, errorResponse: null }
}

/**
 * @deprecated Use requireAdmin() for /api/admin/* routes. requireAuth() only
 * verifies that a session exists, which is insufficient now that non-admin
 * users (Founder's Circle members) live in the same auth.users pool.
 *
 * Kept as an alias of requireAdmin() so existing callers do not silently
 * downgrade their security. Will be removed once all callers are migrated.
 */
export async function requireAuth(request: NextRequest) {
  return requireAdmin(request)
}

/**
 * Log an activity to the activity_log table
 */
export async function logActivity(
  userEmail: string,
  action: ActivityAction,
  entityType: EntityType,
  entityId?: string,
  entityTitle?: string,
  changes?: Record<string, unknown>
) {
  try {
    const supabase = await createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('activity_log').insert({
      user_email: userEmail,
      action,
      entity_type: entityType,
      entity_id: entityId,
      entity_title: entityTitle,
      changes: changes || null,
    })
  } catch (error) {
    // Don't throw - activity logging should not break the main operation
    console.error('Failed to log activity:', error)
  }
}

/**
 * Helper to extract user email from auth context
 */
export async function getCurrentUserEmail(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.email || null
}
