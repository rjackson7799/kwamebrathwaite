import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import { requireAuth } from '@/lib/api/admin'
import type { PageSettings, PageSettingsUpdate } from '@/lib/supabase/types'

// GET /api/admin/page-settings - List all page settings
export async function GET(request: NextRequest) {
  const { errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  try {
    const supabase = await createClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('page_settings')
      .select('*')
      .order('page_slug', { ascending: true })

    if (error) {
      console.error('Database error:', error)
      return errorResponse(ErrorCodes.DB_ERROR, 'Failed to fetch page settings', 500)
    }

    return successResponse((data || []) as PageSettings[])
  } catch (error) {
    console.error('Error fetching page settings:', error)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'An error occurred', 500)
  }
}

// PUT /api/admin/page-settings - Update a page setting
export async function PUT(request: NextRequest) {
  const { errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { page_slug, show_title } = body

    if (!page_slug || typeof show_title !== 'boolean') {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'page_slug (string) and show_title (boolean) are required'
      )
    }

    const supabase = await createClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('page_settings')
      .update({ show_title })
      .eq('page_slug', page_slug)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return errorResponse(ErrorCodes.DB_ERROR, 'Failed to update page settings', 500)
    }

    return successResponse(data)
  } catch (error) {
    console.error('Error updating page settings:', error)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'An error occurred', 500)
  }
}
