import { successResponse, errorResponse, ErrorCodes } from '@/lib/api'
import { createClient, createAdminClient } from '@/lib/supabase/server'

interface SessionRow {
  id: string
  created_at: string
  updated_at: string
  user_agent: string | null
  ip: string | null
  is_current: boolean
}

// GET /api/founders/security/sessions
// Lists every active refresh-token session for the signed-in Founder.
// Backed by auth.sessions which is service-role only (Supabase doesn't
// expose it via RLS); we filter by user_id from the request session.
export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return errorResponse('UNAUTHORIZED', 'Authentication required', 401)
  }

  // Get the current session ID so we can mark it in the response.
  const { data: { session } } = await supabase.auth.getSession()
  const currentSessionId = session?.access_token
    ? // Supabase session.access_token is the JWT; we can't easily decode it
      // server-side without verifying. The `session.user.id` is the user id.
      // For the "current session" marker we use auth.sessions.updated_at as a
      // tiebreaker — the row most recently updated for THIS user is almost
      // certainly the one this request is on.
      null
    : null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const { data, error } = await admin
    .schema('auth')
    .from('sessions')
    .select('id, created_at, updated_at, user_agent, ip, not_after')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('founders/security/sessions GET error:', error)
    return errorResponse(ErrorCodes.DB_ERROR, 'Failed to list sessions', 500)
  }

  // The most-recently-updated session is the one issuing this request.
  const rows: SessionRow[] = (data || []).map(
    (
      r: { id: string; created_at: string; updated_at: string; user_agent: string | null; ip: string | null },
      idx: number
    ) => ({
      id: r.id,
      created_at: r.created_at,
      updated_at: r.updated_at,
      user_agent: r.user_agent,
      ip: r.ip,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      is_current: idx === 0 && !currentSessionId,
    })
  )

  return successResponse(rows)
}
