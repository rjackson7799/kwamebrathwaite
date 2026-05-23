import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const result = loginSchema.safeParse(body)
    if (!result.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid credentials format',
        400,
        result.error.flatten().fieldErrors
      )
    }

    const { email, password } = result.data
    const supabase = await createClient()

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return errorResponse(
        'AUTH_ERROR',
        error.message || 'Invalid email or password',
        401
      )
    }

    // The user authenticated, but admin access requires membership in the
    // admins table. Non-admins (e.g., Founder's Circle members who somehow
    // have a password) must not get a session that lets them sit at /admin.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: isAdmin, error: rpcError } = await (supabase as any).rpc(
      'is_admin',
      { uid: data.user.id }
    )

    if (rpcError || !isAdmin) {
      // Revoke the session we just created so the cookie does not stick.
      await supabase.auth.signOut()
      return errorResponse(
        'FORBIDDEN',
        'This account does not have admin access.',
        403
      )
    }

    return successResponse({
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An error occurred during login',
      500
    )
  }
}
