import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return errorResponse(
        'UNAUTHORIZED',
        'Not authenticated',
        401
      )
    }

    return successResponse({
      user: {
        id: user.id,
        email: user.email,
      },
    })
  } catch (error) {
    console.error('Session error:', error)
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An error occurred checking session',
      500
    )
  }
}
