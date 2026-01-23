/**
 * PUT /api/admin/artworks/[id]/apply-description
 *
 * Apply AI-generated description to an artwork.
 * Saves the description, translations, and tags to the database.
 */

import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import { requireAuth, logActivity, getCurrentUserEmail } from '@/lib/api/admin'
import { aiApplyDescriptionSchema } from '@/lib/api/validation'
import { cacheArtworkTranslations, PROMPT_VERSION } from '@/lib/ai'

export async function PUT(
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
    const validation = aiApplyDescriptionSchema.safeParse(body)

    if (!validation.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid request data',
        400,
        validation.error.flatten().fieldErrors
      )
    }

    const data = validation.data
    const supabase = await createAdminClient()

    // Verify artwork exists
    const { data: artworkData, error: fetchError } = await supabase
      .from('artworks')
      .select('id, title')
      .eq('id', id)
      .single()

    if (fetchError || !artworkData) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Artwork not found', 404)
    }

    // Type assertion for the artwork data
    const artwork = artworkData as { id: string; title: string }

    // Update artwork with AI-generated content
    // Using type assertion for new fields not yet in generated types
    const { error: updateError } = await supabase
      .from('artworks')
      .update({
        description: data.description,
        short_description: data.short_description,
        seo_title: data.seo_title,
        alt_text: data.alt_text,
        ai_generated: true,
        ai_confidence_score: data.confidence_score,
        ai_generated_at: new Date().toISOString(),
        ai_prompt_version: PROMPT_VERSION,
        updated_at: new Date().toISOString(),
      } as never)
      .eq('id', id)

    if (updateError) {
      console.error('Failed to update artwork:', updateError)
      return errorResponse(ErrorCodes.DB_ERROR, 'Failed to update artwork', 500)
    }

    // Delete existing AI-suggested tags and insert new ones
    // Type assertions for new table not yet in generated types
    await (supabase.from('artwork_tags') as ReturnType<typeof supabase.from>)
      .delete()
      .eq('artwork_id', id)
      .eq('ai_suggested', true)

    if (data.tags.length > 0) {
      const tagEntries = data.tags.map((tag) => ({
        artwork_id: id,
        tag: tag.toLowerCase().trim(),
        ai_suggested: true,
      }))

      const { error: tagError } = await supabase
        .from('artwork_tags')
        .insert(tagEntries as never)

      if (tagError) {
        console.error('Failed to insert tags:', tagError)
        // Don't fail the whole request if tags fail
      }
    }

    // Cache translations for the artwork
    try {
      await cacheArtworkTranslations(
        id,
        {
          description: data.description,
          short_description: data.short_description,
          seo_title: data.seo_title,
          alt_text: data.alt_text,
        },
        data.translations
      )
    } catch (cacheError) {
      console.error('Failed to cache translations:', cacheError)
      // Don't fail the whole request if caching fails
    }

    // Log activity
    const userEmail = await getCurrentUserEmail()
    if (userEmail) {
      await logActivity(userEmail, 'update', 'artwork', id, artwork.title, {
        ai_generated: true,
        confidence_score: data.confidence_score,
        tags_applied: data.tags.length,
      })
    }

    return successResponse({
      artwork_id: id,
      updated_fields: [
        'description',
        'short_description',
        'seo_title',
        'alt_text',
        'ai_generated',
        'ai_confidence_score',
        'ai_generated_at',
        'ai_prompt_version',
      ],
      tags_applied: data.tags.length,
    })
  } catch (error) {
    console.error('Apply description error:', error)
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Failed to apply description',
      500
    )
  }
}
