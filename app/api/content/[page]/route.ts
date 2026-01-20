import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api'
import type { SiteContent } from '@/lib/supabase/types'

type RouteParams = {
  params: Promise<{ page: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { page } = await params
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('site_content')
      .select('*')
      .eq('page', page)
      .order('section', { ascending: true })

    if (error) {
      console.error('Database error:', error)
      return errorResponse(ErrorCodes.DB_ERROR, error.message, 500)
    }

    if (!data || data.length === 0) {
      return errorResponse(ErrorCodes.NOT_FOUND, `No content found for page: ${page}`, 404)
    }

    const contentItems = data as SiteContent[]

    // Transform array into an object keyed by section for easier consumption
    const contentBySection = contentItems.reduce(
      (acc, item) => {
        acc[item.section] = {
          content: item.content,
          content_type: item.content_type,
          metadata: item.metadata,
          updated_at: item.updated_at,
        }
        return acc
      },
      {} as Record<string, { content: string | null; content_type: string; metadata: unknown; updated_at: string }>
    )

    return successResponse(contentBySection)
  } catch (error) {
    console.error('API error:', error)
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      error instanceof Error ? error.message : 'An unexpected error occurred',
      500
    )
  }
}
