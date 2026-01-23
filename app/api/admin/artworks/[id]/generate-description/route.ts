/**
 * POST /api/admin/artworks/[id]/generate-description
 *
 * Generate an AI description for an artwork using GPT-4o Vision.
 * Requires authentication. Returns generated content with translations.
 */

import { NextRequest } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import { requireAuth } from '@/lib/api/admin'
import { aiGenerateDescriptionSchema } from '@/lib/api/validation'
import { generateArtworkDescription, PROMPT_VERSION } from '@/lib/ai'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verify authentication
  const { user, errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  const { id } = await params

  try {
    // Parse and validate request body
    const body = await request.json()
    const validation = aiGenerateDescriptionSchema.safeParse(body)

    if (!validation.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid request data',
        400,
        validation.error.flatten().fieldErrors
      )
    }

    const { image_url, metadata, options } = validation.data
    const startTime = Date.now()

    // Check if artwork exists and if description already exists
    const supabase = await createClient()
    const { data: artworkData, error: fetchError } = await supabase
      .from('artworks')
      .select('id, title, description, ai_generated')
      .eq('id', id)
      .single()

    if (fetchError || !artworkData) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Artwork not found', 404)
    }

    // Type assertion for new fields not yet in generated types
    const artwork = artworkData as {
      id: string
      title: string
      description: string | null
      ai_generated: boolean | null
    }

    // Check if description already exists (unless regenerating)
    if (!options?.regenerate && artwork.description && artwork.ai_generated) {
      return errorResponse(
        'DESCRIPTION_EXISTS',
        'AI description already exists. Set regenerate: true to override.',
        409
      )
    }

    // Generate description using AI
    const result = await generateArtworkDescription({
      image_url,
      metadata: {
        title: metadata.title || artwork.title,
        year: metadata.year,
        medium: metadata.medium,
        dimensions: metadata.dimensions,
        series: metadata.series,
      },
      include_translations: options?.include_translations ?? true,
    })

    const processingTime = Date.now() - startTime

    // Log generation to ai_generation_log
    const adminSupabase = await createAdminClient()
    await adminSupabase.from('ai_generation_log').insert({
      artwork_id: id,
      generation_type: options?.regenerate ? 'regenerate' : 'single',
      prompt_version: PROMPT_VERSION,
      tokens_used: result.tokens_used,
      cost_usd: result.cost_usd,
      processing_time_ms: processingTime,
      success: true,
      generated_description: result.description,
      confidence_score: result.confidence_score,
    } as never) // Type assertion until DB migration is applied

    // Return the generated content
    return successResponse({
      description: result.description,
      short_description: result.short_description,
      seo_title: result.seo_title,
      alt_text: result.alt_text,
      suggested_tags: result.suggested_tags,
      confidence_score: result.confidence_score,
      translations: result.translations,
      metadata: {
        tokens_used: result.tokens_used,
        estimated_cost_usd: result.cost_usd,
        processing_time_ms: processingTime,
        prompt_version: PROMPT_VERSION,
      },
    })
  } catch (error) {
    console.error('Description generation error:', error)

    // Log failure to ai_generation_log
    try {
      const adminSupabase = await createAdminClient()
      await adminSupabase.from('ai_generation_log').insert({
        artwork_id: id,
        generation_type: 'single',
        prompt_version: PROMPT_VERSION,
        success: false,
        error_message: error instanceof Error ? error.message : 'Unknown error',
      } as never) // Type assertion until DB migration is applied
    } catch (logError) {
      console.error('Failed to log generation error:', logError)
    }

    // Return appropriate error response
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return errorResponse(
          'OPENAI_CONFIG_ERROR',
          'OpenAI API is not properly configured',
          500
        )
      }
      if (error.message.includes('rate limit')) {
        return errorResponse(
          ErrorCodes.RATE_LIMIT,
          'AI service rate limit exceeded. Please try again later.',
          429
        )
      }
    }

    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Failed to generate description. Please try again.',
      500
    )
  }
}
