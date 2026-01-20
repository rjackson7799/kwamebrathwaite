import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import { requireAuth } from '@/lib/api/admin'
import type { SiteContent } from '@/lib/supabase/types'

// GET /api/admin/content - List all content sections grouped by page
export async function GET(request: NextRequest) {
  // Check authentication
  const { user, errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('site_content')
      .select('*')
      .order('page', { ascending: true })
      .order('section', { ascending: true })

    if (error) {
      console.error('Database error:', error)
      return errorResponse(ErrorCodes.DB_ERROR, 'Failed to fetch content', 500)
    }

    const contentItems = (data || []) as SiteContent[]

    // Group content by page for easier consumption
    const contentByPage = contentItems.reduce(
      (acc, item) => {
        if (!acc[item.page]) {
          acc[item.page] = []
        }
        acc[item.page].push({
          id: item.id,
          section: item.section,
          content: item.content,
          content_type: item.content_type,
          metadata: item.metadata,
          updated_at: item.updated_at,
        })
        return acc
      },
      {} as Record<string, Array<{
        id: string
        section: string
        content: string | null
        content_type: string
        metadata: unknown
        updated_at: string
      }>>
    )

    return successResponse(contentByPage)
  } catch (error) {
    console.error('Error fetching content:', error)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'An error occurred', 500)
  }
}
