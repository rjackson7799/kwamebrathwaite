import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes, translateSchema } from '@/lib/api'
import crypto from 'crypto'

interface TranslationCacheInsert {
  source_table: string
  source_id: string
  source_field: string
  source_hash: string
  target_language: string
  translated_content: string
  translation_service: string
}

interface TranslationCacheRow {
  translated_content: string
}

export async function POST(request: NextRequest) {
  try {
    // Parse body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid JSON body', 400)
    }

    // Validate with Zod
    const validationResult = translateSchema.safeParse(body)
    if (!validationResult.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Validation failed',
        400,
        validationResult.error.flatten()
      )
    }

    const { sourceTable, sourceId, sourceField, sourceContent, targetLanguage } =
      validationResult.data

    // Generate hash of source content for cache lookup
    const sourceHash = crypto.createHash('md5').update(sourceContent).digest('hex')

    const supabase = await createClient()

    // Check cache first
    const { data: cached } = await supabase
      .from('translation_cache')
      .select('translated_content')
      .eq('source_table', sourceTable)
      .eq('source_id', sourceId)
      .eq('source_field', sourceField)
      .eq('target_language', targetLanguage)
      .eq('source_hash', sourceHash)
      .single()

    if (cached) {
      const cachedData = cached as unknown as TranslationCacheRow
      return successResponse({
        translatedContent: cachedData.translated_content,
        fromCache: true,
      })
    }

    // Check if DeepL API key is configured
    const deeplApiKey = process.env.DEEPL_API_KEY
    if (!deeplApiKey) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Translation service not configured',
        503
      )
    }

    // Call DeepL API
    const deeplResponse = await fetch('https://api-free.deepl.com/v2/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `DeepL-Auth-Key ${deeplApiKey}`,
      },
      body: JSON.stringify({
        text: [sourceContent],
        target_lang: targetLanguage.toUpperCase(),
        source_lang: 'EN',
      }),
    })

    if (!deeplResponse.ok) {
      console.error('DeepL API error:', await deeplResponse.text())
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Translation service error', 503)
    }

    const deeplData = await deeplResponse.json()
    const translatedContent = deeplData.translations?.[0]?.text

    if (!translatedContent) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'No translation received', 503)
    }

    // Cache the translation
    const cacheData: TranslationCacheInsert = {
      source_table: sourceTable,
      source_id: sourceId,
      source_field: sourceField,
      source_hash: sourceHash,
      target_language: targetLanguage,
      translated_content: translatedContent,
      translation_service: 'deepl',
    }

    const { error: cacheError } = await supabase
      .from('translation_cache')
      .upsert(cacheData as never, {
        onConflict: 'source_table,source_id,source_field,target_language',
      })

    if (cacheError) {
      console.error('Failed to cache translation:', cacheError)
      // Continue anyway - translation was successful
    }

    return successResponse({
      translatedContent,
      fromCache: false,
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
