import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  successResponse,
  errorResponse,
  ErrorCodes,
  rateLimit,
  getClientIP,
  licenseRequestSchema,
} from '@/lib/api'

/**
 * Generate a unique license request number: LIC-YYYY-NNN
 */
async function generateRequestNumber(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `LIC-${year}-`

  // Get the latest request number for this year
  const { data } = await supabase
    .from('license_requests')
    .select('request_number')
    .like('request_number', `${prefix}%`)
    .order('request_number', { ascending: false })
    .limit(1)

  let nextNum = 1
  if (data && data.length > 0) {
    const lastNum = parseInt((data[0] as { request_number: string }).request_number.replace(prefix, ''), 10)
    if (!isNaN(lastNum)) {
      nextNum = lastNum + 1
    }
  }

  return `${prefix}${String(nextNum).padStart(3, '0')}`
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 5 per hour per IP
    const clientIP = getClientIP(request)
    const rateLimitResult = rateLimit(`license_request:${clientIP}`, 5, 3600000)

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

    // Validate with Zod
    const validationResult = licenseRequestSchema.safeParse(body)
    if (!validationResult.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Validation failed',
        400,
        validationResult.error.flatten()
      )
    }

    const { website, artwork_ids, ...requestData } = validationResult.data

    // Honeypot check - return fake success to not alert bots
    if (website) {
      return successResponse({
        message: 'Your license request has been submitted successfully.',
      })
    }

    const supabase = await createClient()

    // Generate request number
    const requestNumber = await generateRequestNumber(supabase)

    // Insert the license request
    const { data: licenseRequest, error: insertError } = await supabase
      .from('license_requests')
      .insert({
        request_number: requestNumber,
        name: requestData.name,
        email: requestData.email,
        company: requestData.company || null,
        phone: requestData.phone || null,
        license_type_id: requestData.license_type_id,
        territory: requestData.territory || null,
        duration: requestData.duration || null,
        print_run: requestData.print_run || null,
        usage_description: requestData.usage_description,
        locale: requestData.locale,
        status: 'new',
      } as never)
      .select('id, request_number')
      .single()

    if (insertError) {
      console.error('Database error inserting license request:', insertError)
      return errorResponse(ErrorCodes.DB_ERROR, 'Failed to submit license request', 500)
    }

    const result = licenseRequest as { id: string; request_number: string } | null

    // Insert artwork associations
    if (result && artwork_ids.length > 0) {
      const artworkAssociations = artwork_ids.map((artworkId) => ({
        request_id: result.id,
        artwork_id: artworkId,
      }))

      const { error: artworkError } = await supabase
        .from('license_request_artworks')
        .insert(artworkAssociations as never)

      if (artworkError) {
        console.error('Database error inserting artwork associations:', artworkError)
        // Don't fail the whole request for this — the main request was saved
      }
    }

    return successResponse(
      {
        id: result?.id,
        request_number: result?.request_number,
        message: 'Your license request has been submitted successfully. We will review your request and respond within 3-5 business days.',
      },
      undefined,
      201
    )
  } catch (error) {
    console.error('API error:', error)
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      error instanceof Error ? error.message : 'An unexpected error occurred',
      500
    )
  }
}
