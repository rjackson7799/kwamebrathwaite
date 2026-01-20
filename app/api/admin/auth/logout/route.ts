import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
      return errorResponse(
        'AUTH_ERROR',
        error.message || 'Failed to sign out',
        500
      )
    }

    return successResponse({ message: 'Signed out successfully' })
  } catch (error) {
    console.error('Logout error:', error)
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An error occurred during logout',
      500
    )
  }
}
