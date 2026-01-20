import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import { requireAuth } from '@/lib/api/admin'

// GET /api/admin/activity/users - Get unique user emails for filter dropdown
export async function GET(request: NextRequest) {
  // Check authentication
  const { errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  try {
    const supabase = await createClient()

    // Get distinct user emails
    const { data, error } = await supabase
      .from('activity_log')
      .select('user_email')
      .order('user_email', { ascending: true })

    if (error) {
      console.error('Database error:', error)
      return errorResponse(ErrorCodes.DB_ERROR, 'Failed to fetch users', 500)
    }

    // Extract unique emails
    const emails = data?.map((d: { user_email: string | null }) => d.user_email).filter(Boolean) || []
    const uniqueEmails = Array.from(new Set(emails))

    return successResponse({ users: uniqueEmails })
  } catch (error) {
    console.error('Error fetching users:', error)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'An error occurred', 500)
  }
}
