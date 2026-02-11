import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  successResponse,
  errorResponse,
  ErrorCodes,
  rateLimit,
  getClientIP,
} from '@/lib/api'
import { wallViewEmailSchema } from '@/lib/api/validation'

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request)
    const rateLimitResult = rateLimit(`wall-view-register:${clientIP}`, 5, 60000) // 5 per minute

    if (!rateLimitResult.success) {
      return errorResponse(
        ErrorCodes.RATE_LIMIT,
        'Too many requests. Please try again later.',
        429
      )
    }

    // Parse body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid JSON body', 400)
    }

    // Validate
    const validationResult = wallViewEmailSchema.safeParse(body)
    if (!validationResult.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Validation failed',
        400,
        validationResult.error.flatten()
      )
    }

    const { email, artwork_id } = validationResult.data
    const supabase = await createClient()

    // Check if already registered
    const { data: existing } = await supabase
      .from('wall_view_leads')
      .select('id')
      .eq('email', email.toLowerCase())
      .single()

    if (existing) {
      return successResponse({
        message: 'Email already registered.',
        alreadyRegistered: true,
      })
    }

    // Insert new lead
    const { error } = await supabase
      .from('wall_view_leads')
      .insert({
        email: email.toLowerCase(),
        source: 'view_on_wall',
        artwork_id: artwork_id || null,
        generations_count: 0,
      } as never)

    if (error) {
      // Handle unique constraint violation (race condition)
      if (error.code === '23505') {
        return successResponse({
          message: 'Email already registered.',
          alreadyRegistered: true,
        })
      }
      console.error('Database error:', error)
      return errorResponse(ErrorCodes.DB_ERROR, 'Failed to register email', 500)
    }

    return successResponse(
      {
        message: 'Email registered successfully.',
        alreadyRegistered: false,
      },
      undefined,
      201
    )
  } catch (error) {
    console.error('Wall view register API error:', error)
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      error instanceof Error ? error.message : 'An unexpected error occurred',
      500
    )
  }
}
