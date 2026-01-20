import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api'
import type { SiteContent } from '@/lib/supabase/types'

type RouteParams = {
  params: Promise<{ page: string; section: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
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
          `Content not found for page: ${page}, section: ${section}`,
          404
        )
      }
      console.error('Database error:', error)
      return errorResponse(ErrorCodes.DB_ERROR, error.message, 500)
    }

    const content = data as SiteContent

    return successResponse({
      content: content.content,
      content_type: content.content_type,
      metadata: content.metadata,
      updated_at: content.updated_at,
    })
  } catch (error) {
    console.error('API error:', error)
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      error instanceof Error ? error.message : 'An unexpected error occurred',
      500
    )
  }
}
