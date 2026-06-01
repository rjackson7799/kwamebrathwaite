import { NextRequest } from 'next/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api'
import { requireAdmin, logActivity, getCurrentUserEmail } from '@/lib/api/admin'
import { createAdminClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>  // founders.user_id (uuid) === auth.users.id
}

// POST /api/admin/founders/[id]/delete
//
// PERMANENT hard delete (distinct from the soft "Revoke access" archive).
// Deletes the underlying auth user, which cascades to the founders row and all
// child rows (fulfillment, briefing reads/notifications) via ON DELETE CASCADE;
// any inquiry that converted to this founder has its link set to NULL. Intended
// for cleaning up test accounts. Admin-gated; the UI also requires the admin to
// type the founder's email to confirm.
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { errorResponse: authError } = await requireAdmin(request)
  if (authError) return authError

  try {
    const { id } = await params
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createAdminClient() as any

    // Capture identity for the audit log BEFORE the row is gone.
    const { data: founder, error: lookupError } = await supabase
      .from('founders')
      .select('user_id, full_name, email')
      .eq('user_id', id)
      .maybeSingle()

    if (lookupError) {
      console.error('admin/founders/[id]/delete lookup error:', lookupError)
      return errorResponse(ErrorCodes.DB_ERROR, 'Failed to load founder', 500)
    }
    if (!founder) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Founder not found', 404)
    }

    const adminEmail = await getCurrentUserEmail()
    if (adminEmail) {
      await logActivity(adminEmail, 'delete', 'founder', id, founder.full_name, {
        email: founder.email,
        permanent: true,
      })
    }

    // Hard delete the auth user → cascades to founders + child rows.
    const { error: delError } = await supabase.auth.admin.deleteUser(id)
    if (delError) {
      // Fallback: if the auth user is already gone, remove the founders row
      // directly so we don't leave it orphaned.
      console.error('admin/founders/[id]/delete deleteUser error:', delError)
      const { error: rowError } = await supabase.from('founders').delete().eq('user_id', id)
      if (rowError) {
        console.error('admin/founders/[id]/delete row delete fallback error:', rowError)
        return errorResponse(ErrorCodes.DB_ERROR, 'Failed to delete founder', 500)
      }
    }

    return successResponse({ deleted: true })
  } catch (err) {
    console.error('admin/founders/[id]/delete unexpected:', err)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'An error occurred', 500)
  }
}
