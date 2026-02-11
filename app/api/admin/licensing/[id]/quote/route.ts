import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import { licenseQuoteSchema } from '@/lib/api/validation'
import { requireAuth, logActivity, getCurrentUserEmail } from '@/lib/api/admin'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/admin/licensing/:id/quote - Send a quote for a license request
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { user, errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  try {
    const { id } = await params
    const body = await request.json()
    const result = licenseQuoteSchema.safeParse(body)

    if (!result.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid quote data',
        400,
        result.error.flatten().fieldErrors
      )
    }

    const supabase = await createAdminClient()

    // Get current request
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing, error: checkError } = await (supabase as any)
      .from('license_requests')
      .select('id, request_number, name, email, status')
      .eq('id', id)
      .single()

    if (checkError || !existing) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'License request not found', 404)
    }

    // Update request with quote
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('license_requests')
      .update({
        quoted_price: result.data.quoted_price,
        quoted_at: new Date().toISOString(),
        status: 'quoted',
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return errorResponse(ErrorCodes.DB_ERROR, 'Failed to send quote', 500)
    }

    // TODO: Send quote email via Resend
    // The email template will include the quoted_price and the admin's message

    // Log activity
    const userEmail = await getCurrentUserEmail()
    if (userEmail) {
      await logActivity(
        userEmail,
        'status_change',
        'license_request',
        data.id,
        `${existing.request_number} - ${existing.name}`,
        {
          previous_status: existing.status,
          new_status: 'quoted',
          quoted_price: result.data.quoted_price,
        }
      )
    }

    return successResponse({
      ...data,
      message: 'Quote sent successfully.',
    })
  } catch (error) {
    console.error('Error sending quote:', error)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'An error occurred', 500)
  }
}
