import { NextRequest } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import { adminContentUpdateSchema } from '@/lib/api/validation'
import { requireAuth, logActivity, getCurrentUserEmail } from '@/lib/api/admin'
import type { SiteContent } from '@/lib/supabase/types'

type RouteParams = {
  params: Promise<{ page: string; section: string }>
}

// GET /api/admin/content/:page/:section - Get single content section
export async function GET(request: NextRequest, { params }: RouteParams) {
  // Check authentication
  const { user, errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  try {
    const { page, section } = await params
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('site_content')
      .select('*')
      .eq('page', page)
      .eq('section', section)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return errorResponse(
          ErrorCodes.NOT_FOUND,
          `Content not found for ${page}/${section}`,
          404
        )
      }
      console.error('Database error:', error)
      return errorResponse(ErrorCodes.DB_ERROR, 'Failed to fetch content', 500)
    }

    return successResponse(data as SiteContent)
  } catch (error) {
    console.error('Error fetching content:', error)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'An error occurred', 500)
  }
}

// PUT /api/admin/content/:page/:section - Update content section
export async function PUT(request: NextRequest, { params }: RouteParams) {
  // Check authentication
  const { user, errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  try {
    const { page, section } = await params
    const body = await request.json()
    const result = adminContentUpdateSchema.safeParse(body)

    if (!result.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid content data',
        400,
        result.error.flatten().fieldErrors
      )
    }

    const supabase = await createAdminClient()

    // First, get the existing content for activity logging
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase as any)
      .from('site_content')
      .select('*')
      .eq('page', page)
      .eq('section', section)
      .single()

    // Upsert the content (insert if not exists, update if exists)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('site_content')
      .upsert(
        {
          page,
          section,
          content: result.data.content,
          content_type: result.data.content_type,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'page,section',
        }
      )
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return errorResponse(ErrorCodes.DB_ERROR, 'Failed to update content', 500)
    }

    // Log activity
    const userEmail = await getCurrentUserEmail()
    if (userEmail && data) {
      const changes: Record<string, { old: unknown; new: unknown }> = {}
      if (existing?.content !== result.data.content) {
        changes.content = {
          old: existing?.content || null,
          new: result.data.content,
        }
      }

      await logActivity(
        userEmail,
        existing ? 'update' : 'create',
        'content',
        data.id,
        `${page}/${section}`,
        Object.keys(changes).length > 0 ? changes : undefined
      )
    }

    return successResponse(data as SiteContent)
  } catch (error) {
    console.error('Error updating content:', error)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'An error occurred', 500)
  }
}
