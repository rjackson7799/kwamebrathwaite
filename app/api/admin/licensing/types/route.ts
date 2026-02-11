import { NextRequest } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import { licenseTypeSchema } from '@/lib/api/validation'
import { requireAuth, logActivity, getCurrentUserEmail } from '@/lib/api/admin'

// GET /api/admin/licensing/types - List all license types
export async function GET(request: NextRequest) {
  const { user, errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('license_types')
      .select('*')
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Database error:', error)
      return errorResponse(ErrorCodes.DB_ERROR, 'Failed to fetch license types', 500)
    }

    return successResponse(data || [])
  } catch (error) {
    console.error('Error fetching license types:', error)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'An error occurred', 500)
  }
}

// POST /api/admin/licensing/types - Create a license type
export async function POST(request: NextRequest) {
  const { user, errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const result = licenseTypeSchema.safeParse(body)

    if (!result.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid license type data',
        400,
        result.error.flatten().fieldErrors
      )
    }

    const supabase = await createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('license_types')
      .insert(result.data)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return errorResponse(ErrorCodes.DB_ERROR, 'Failed to create license type', 500)
    }

    // Log activity
    const userEmail = await getCurrentUserEmail()
    if (userEmail) {
      await logActivity(userEmail, 'create', 'license_type', data.id, data.name)
    }

    return successResponse(data, undefined, 201)
  } catch (error) {
    console.error('Error creating license type:', error)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'An error occurred', 500)
  }
}
