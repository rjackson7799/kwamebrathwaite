/**
 * POST /api/admin/artworks/[id]/generate-seo
 *
 * Generate SEO & Accessibility metadata for an artwork using GPT-4o Vision.
 * Does NOT touch description or short_description fields.
 * Uses the existing description as context for better SEO output.
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import { requireAuth } from '@/lib/api/admin'
import { generateArtworkSEO, PROMPT_VERSION } from '@/lib/ai'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  const { id } = await params

  try {
    // Fetch artwork with existing description for context
    const supabase = await createClient()
    const { data: artworkData, error: fetchError } = await supabase
      .from('artworks')
      .select('id, title, year, medium, dimensions, series, description, image_url')
      .eq('id', id)
      .single()

    if (fetchError || !artworkData) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Artwork not found', 404)
    }

    // Type assertion for fields not yet in generated Supabase types
    const artwork = artworkData as {
      id: string
      title: string
      year: number | null
      medium: string | null
      dimensions: string | null
      series: string | null
      description: string | null
      image_url: string
    }

    if (!artwork.image_url || artwork.image_url === '/images/placeholder.jpg') {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Artwork must have an uploaded image to generate SEO metadata',
        400
      )
    }

    const startTime = Date.now()

    const result = await generateArtworkSEO({
      image_url: artwork.image_url,
      metadata: {
        title: artwork.title,
        year: artwork.year,
        medium: artwork.medium,
        dimensions: artwork.dimensions,
        series: artwork.series,
        description: artwork.description,
      },
      include_translations: true,
    })

    const processingTime = Date.now() - startTime

    return successResponse({
      seo_title: result.seo_title,
      alt_text: result.alt_text,
      meta_title: result.meta_title,
      meta_description: result.meta_description,
      translations: result.translations,
      metadata: {
        tokens_used: result.tokens_used,
        estimated_cost_usd: result.cost_usd,
        processing_time_ms: processingTime,
        prompt_version: PROMPT_VERSION,
      },
    })
  } catch (error) {
    console.error('SEO generation error:', error)

    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return errorResponse('OPENAI_CONFIG_ERROR', 'OpenAI API is not properly configured', 500)
      }
      if (error.message.includes('rate limit')) {
        return errorResponse(ErrorCodes.RATE_LIMIT, 'AI service rate limit exceeded. Please try again later.', 429)
      }
    }

    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to generate SEO metadata. Please try again.', 500)
  }
}
