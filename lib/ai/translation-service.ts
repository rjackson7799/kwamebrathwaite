/**
 * Translation Service for AI-Generated Content
 * Uses DeepL API to translate artwork descriptions to French and Japanese.
 * Leverages the existing translation_cache table for caching.
 */

import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'
import type { TranslatedContent } from './types'

/**
 * DeepL API configuration
 */
const DEEPL_API_URL = process.env.DEEPL_API_URL || 'https://api-free.deepl.com/v2/translate'
const DEEPL_API_KEY = process.env.DEEPL_API_KEY

/**
 * Supported target languages
 */
type TargetLanguage = 'fr' | 'ja'

/**
 * DeepL language codes
 */
const DEEPL_LANGUAGE_MAP: Record<TargetLanguage, string> = {
  fr: 'FR',
  ja: 'JA',
}

/**
 * Content fields that need translation
 */
interface TranslatableContent {
  description: string
  short_description: string
  seo_title: string
  alt_text: string
}

/**
 * Generate MD5 hash for cache lookup
 */
function hashContent(content: string): string {
  return crypto.createHash('md5').update(content).digest('hex')
}

/**
 * Translate a single text string using DeepL API
 *
 * @param text - Text to translate
 * @param targetLanguage - Target language code ('fr' or 'ja')
 * @returns Translated text
 */
async function translateText(text: string, targetLanguage: TargetLanguage): Promise<string> {
  if (!text || !DEEPL_API_KEY) {
    return text
  }

  const response = await fetch(DEEPL_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `DeepL-Auth-Key ${DEEPL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: [text],
      target_lang: DEEPL_LANGUAGE_MAP[targetLanguage],
      source_lang: 'EN',
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`DeepL API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  return data.translations?.[0]?.text || text
}

/**
 * Translate text with caching support
 * First checks the translation_cache table, then calls DeepL if not cached.
 *
 * @param text - Text to translate
 * @param targetLanguage - Target language code
 * @param fieldName - Field name for cache key
 * @returns Translated text
 */
async function translateWithCache(
  text: string,
  targetLanguage: TargetLanguage,
  fieldName: string
): Promise<string> {
  if (!text) return ''

  const sourceHash = hashContent(text)

  try {
    // Check cache first
    const supabase = await createClient()
    const { data: cached } = await supabase
      .from('translation_cache')
      .select('translated_content')
      .eq('source_hash', sourceHash)
      .eq('target_language', targetLanguage)
      .single()

    // Type assertion for the response
    const cachedData = cached as { translated_content: string } | null
    if (cachedData?.translated_content) {
      return cachedData.translated_content
    }

    // Not cached, call DeepL API
    const translated = await translateText(text, targetLanguage)

    // Cache the result (use a placeholder source_id for AI-generated content)
    // We use a fixed UUID to indicate this is AI-generated content
    const AI_GENERATED_SOURCE_ID = '00000000-0000-0000-0000-000000000001'

    // Type assertion for upsert - table exists but types need DB migration
    await supabase.from('translation_cache').upsert(
      {
        source_table: 'artworks',
        source_id: AI_GENERATED_SOURCE_ID,
        source_field: `ai_${fieldName}`,
        source_hash: sourceHash,
        target_language: targetLanguage,
        translated_content: translated,
        translation_service: 'deepl',
      } as never,
      {
        onConflict: 'source_table,source_id,source_field,target_language',
      }
    )

    return translated
  } catch (error) {
    console.error(`Translation cache error for ${fieldName}:`, error)
    // Fall back to direct translation without caching
    return translateText(text, targetLanguage)
  }
}

/**
 * Translate all artwork content fields to a target language
 * Uses parallel requests for efficiency with caching support.
 *
 * @param content - Content to translate
 * @param targetLanguage - Target language ('fr' or 'ja')
 * @returns Translated content
 */
export async function translateArtworkContent(
  content: TranslatableContent,
  targetLanguage: TargetLanguage
): Promise<TranslatedContent> {
  // Translate all fields in parallel
  const [description, short_description, seo_title, alt_text] = await Promise.all([
    translateWithCache(content.description, targetLanguage, 'description'),
    translateWithCache(content.short_description, targetLanguage, 'short_description'),
    translateWithCache(content.seo_title, targetLanguage, 'seo_title'),
    translateWithCache(content.alt_text, targetLanguage, 'alt_text'),
  ])

  return {
    description,
    short_description,
    seo_title,
    alt_text,
  }
}

/**
 * Cache artwork-specific translations after applying to an artwork
 * This updates the cache with the actual artwork_id for better organization.
 *
 * @param artworkId - The artwork ID
 * @param content - English content
 * @param translations - Translated content for fr and ja
 */
export async function cacheArtworkTranslations(
  artworkId: string,
  content: TranslatableContent,
  translations: { fr: TranslatedContent; ja: TranslatedContent }
): Promise<void> {
  const supabase = await createClient()
  const fields = ['description', 'short_description', 'seo_title', 'alt_text'] as const

  const cacheEntries = []

  for (const lang of ['fr', 'ja'] as const) {
    for (const field of fields) {
      const sourceContent = content[field]
      const translatedContent = translations[lang][field]

      if (sourceContent && translatedContent) {
        cacheEntries.push({
          source_table: 'artworks',
          source_id: artworkId,
          source_field: field,
          source_hash: hashContent(sourceContent),
          target_language: lang,
          translated_content: translatedContent,
          translation_service: 'deepl',
        })
      }
    }
  }

  if (cacheEntries.length > 0) {
    // Type assertion for upsert
    await supabase.from('translation_cache').upsert(cacheEntries as never, {
      onConflict: 'source_table,source_id,source_field,target_language',
    })
  }
}
