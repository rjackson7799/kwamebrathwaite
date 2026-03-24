import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import type { PageSettings } from '@/lib/supabase/types'

// GET /api/page-settings/[slug] - Public read of a single page's settings
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const supabase = await createClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('page_settings')
      .select('*')
      .eq('page_slug', slug)
      .single()

    if (error || !data) {
      // Return default settings if not found
      return successResponse({ page_slug: slug, show_title: true })
    }

    return successResponse(data)
  } catch (error) {
    console.error('Error fetching page settings:', error)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'An error occurred', 500)
  }
}
