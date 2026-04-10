import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/api/admin'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'

// POST /api/admin/broken-links/dismiss  { path: '/wp-admin' }
// Adds a path to the dismissed list so it's hidden from the aggregate view.
export async function POST(request: NextRequest) {
  const { user, errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid JSON body', 400)
  }

  const raw = (body || {}) as Record<string, unknown>
  const path = typeof raw.path === 'string' ? raw.path.trim() : null

  if (!path) {
    return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Missing path', 400)
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createAdminClient() as any
    const { error } = await supabase
      .from('not_found_dismissed')
      .upsert({ path, dismissed_by: user?.email || null }, { onConflict: 'path' })

    if (error) {
      console.error('dismiss upsert error:', error)
      return errorResponse(ErrorCodes.DB_ERROR, 'Failed to dismiss', 500)
    }

    return successResponse({ dismissed: path })
  } catch (err) {
    console.error('dismiss POST unexpected error:', err)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'An error occurred', 500)
  }
}

// DELETE /api/admin/broken-links/dismiss?path=/wp-admin
// Removes a path from the dismissed list (un-dismisses it).
export async function DELETE(request: NextRequest) {
  const { errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  const path = request.nextUrl.searchParams.get('path')
  if (!path) {
    return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Missing path', 400)
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createAdminClient() as any
    const { error } = await supabase
      .from('not_found_dismissed')
      .delete()
      .eq('path', path)

    if (error) {
      console.error('dismiss delete error:', error)
      return errorResponse(ErrorCodes.DB_ERROR, 'Failed to un-dismiss', 500)
    }

    return successResponse({ undismissed: path })
  } catch (err) {
    console.error('dismiss DELETE unexpected error:', err)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'An error occurred', 500)
  }
}

// GET /api/admin/broken-links/dismiss
// Returns the list of currently dismissed paths.
export async function GET(request: NextRequest) {
  const { errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createAdminClient() as any
    const { data, error } = await supabase
      .from('not_found_dismissed')
      .select('*')
      .order('dismissed_at', { ascending: false })

    if (error) {
      console.error('dismiss list error:', error)
      return errorResponse(ErrorCodes.DB_ERROR, 'Failed to list', 500)
    }

    return successResponse(data || [])
  } catch (err) {
    console.error('dismiss GET unexpected error:', err)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'An error occurred', 500)
  }
}
