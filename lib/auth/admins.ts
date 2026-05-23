import { createClient } from '@/lib/supabase/server'

/**
 * Server-side check: is the currently signed-in user an admin?
 *
 * Calls the public.is_admin(uuid) SECURITY DEFINER function created in
 * 2026-05-22-admins-and-rls-refactor.sql. Returns false when there is no
 * session, when the RPC errors, or when the user is not in `admins`.
 *
 * Use this in server components / route handlers when you need a boolean.
 * For "this route requires admin" API guards, prefer requireAdmin() in
 * lib/api/admin.ts which returns the user + a 401/403 errorResponse.
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('is_admin', { uid: user.id })
  if (error) {
    console.error('isCurrentUserAdmin: is_admin RPC failed:', error)
    return false
  }
  return data === true
}
