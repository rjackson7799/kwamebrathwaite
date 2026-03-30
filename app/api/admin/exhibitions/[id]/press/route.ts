import { NextRequest } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import { exhibitionPressSchema } from '@/lib/api/validation'
import { requireAuth, logActivity, getCurrentUserEmail } from '@/lib/api/admin'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/admin/exhibitions/:id/press - Get linked press articles
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  try {
    const { id } = await params
    const supabase = await createClient()

    // Get press IDs linked to this exhibition
    const { data, error } = await supabase
      .from('exhibition_press')
      .select('press_id, display_order')
      .eq('exhibition_id', id)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Database error:', error)
      return errorResponse(ErrorCodes.DB_ERROR, 'Failed to fetch linked press articles', 500)
    }

    return successResponse(data)
  } catch (error) {
    console.error('Error fetching linked press articles:', error)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'An error occurred', 500)
  }
}

// POST /api/admin/exhibitions/:id/press - Link press articles to exhibition
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  try {
    const { id } = await params
    const body = await request.json()
    const result = exhibitionPressSchema.safeParse(body)

    if (!result.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid press IDs',
        400,
        result.error.flatten().fieldErrors
      )
    }

    const { pressIds } = result.data
    const supabase = await createAdminClient()

    // Verify exhibition exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: exhibition, error: exhibitionError } = await (supabase as any)
      .from('exhibitions')
      .select('id, title')
      .eq('id', id)
      .single()

    if (exhibitionError || !exhibition) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Exhibition not found', 404)
    }

    // Delete existing links
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('exhibition_press')
      .delete()
      .eq('exhibition_id', id)

    // Insert new links with display order
    if (pressIds.length > 0) {
      const links = pressIds.map((pressId, index) => ({
        exhibition_id: id,
        press_id: pressId,
        display_order: index,
      }))

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: insertError } = await (supabase as any)
        .from('exhibition_press')
        .insert(links)

      if (insertError) {
        console.error('Database error:', insertError)
        return errorResponse(ErrorCodes.DB_ERROR, 'Failed to link press articles', 500)
      }
    }

    // Log activity
    const userEmail = await getCurrentUserEmail()
    if (userEmail) {
      await logActivity(userEmail, 'update', 'exhibition', id, exhibition.title, {
        action: 'linked_press',
        press_count: pressIds.length,
      })
    }

    return successResponse({
      message: 'Press articles linked successfully',
      linked_count: pressIds.length
    })
  } catch (error) {
    console.error('Error linking press articles:', error)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'An error occurred', 500)
  }
}
