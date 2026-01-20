import { NextRequest } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import { adminPressSchema } from '@/lib/api/validation'
import { requireAuth, logActivity, getCurrentUserEmail } from '@/lib/api/admin'
import type { Database } from '@/lib/supabase/types'

type PressUpdate = Database['public']['Tables']['press']['Update']

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/admin/press/:id - Get single press item
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { user, errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  try {
    const { id } = await params
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('press')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return errorResponse(ErrorCodes.NOT_FOUND, 'Press item not found', 404)
      }
      console.error('Database error:', error)
      return errorResponse(ErrorCodes.DB_ERROR, 'Failed to fetch press item', 500)
    }

    return successResponse(data)
  } catch (error) {
    console.error('Error fetching press item:', error)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'An error occurred', 500)
  }
}

// PUT /api/admin/press/:id - Update press item
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { user, errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  try {
    const { id } = await params
    const body = await request.json()
    const result = adminPressSchema.safeParse(body)

    if (!result.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid press data',
        400,
        result.error.flatten().fieldErrors
      )
    }

    const supabase = await createAdminClient()

    // Check if press item exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing, error: checkError } = await (supabase as any)
      .from('press')
      .select('id, title, status')
      .eq('id', id)
      .single()

    if (checkError || !existing) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Press item not found', 404)
    }

    // Update press item
    const updateData: PressUpdate = {
      title: result.data.title,
      publication: result.data.publication,
      author: result.data.author,
      publish_date: result.data.publish_date,
      url: result.data.url || null,
      excerpt: result.data.excerpt,
      image_url: result.data.image_url || null,
      press_type: result.data.press_type,
      is_featured: result.data.is_featured,
      display_order: result.data.display_order,
      status: result.data.status,
      updated_at: new Date().toISOString(),
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('press')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return errorResponse(ErrorCodes.DB_ERROR, 'Failed to update press item', 500)
    }

    // Log activity
    const userEmail = await getCurrentUserEmail()
    if (userEmail) {
      const action = existing.status !== result.data.status ? 'status_change' : 'update'
      await logActivity(userEmail, action, 'press', data.id, data.title, {
        previous_status: existing.status,
        new_status: result.data.status,
      })
    }

    return successResponse(data)
  } catch (error) {
    console.error('Error updating press item:', error)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'An error occurred', 500)
  }
}

// DELETE /api/admin/press/:id - Delete press item
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { user, errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  try {
    const { id } = await params
    const supabase = await createAdminClient()

    // Get press info for logging
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase as any)
      .from('press')
      .select('id, title')
      .eq('id', id)
      .single()

    if (!existing) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Press item not found', 404)
    }

    // Delete press item
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('press')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Database error:', error)
      return errorResponse(ErrorCodes.DB_ERROR, 'Failed to delete press item', 500)
    }

    // Log activity
    const userEmail = await getCurrentUserEmail()
    if (userEmail) {
      await logActivity(userEmail, 'delete', 'press', existing.id, existing.title)
    }

    return successResponse({ message: 'Press item deleted successfully' })
  } catch (error) {
    console.error('Error deleting press item:', error)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'An error occurred', 500)
  }
}
