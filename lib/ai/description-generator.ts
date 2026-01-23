/**
 * AI Artwork Description Generator
 * Uses OpenAI GPT-4o Vision to analyze artwork images and generate
 * museum-quality descriptions for the Kwame Brathwaite Archive.
 */

import OpenAI from 'openai'
import { SYSTEM_PROMPT, buildUserPrompt } from './prompts'
import { translateArtworkContent } from './translation-service'
import type {
  GenerationOptions,
  GenerationResult,
  GeneratedContent,
  TranslatedContent,
} from './types'

// Lazy-load OpenAI client to avoid initialization errors during build
let openaiClient: OpenAI | null = null

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set')
    }
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  return openaiClient
}

// Model configuration
const GPT_MODEL = 'gpt-4o-2024-08-06'

// Cost estimation (per OpenAI pricing as of Jan 2026)
// GPT-4o: $2.50/1M input tokens, $10.00/1M output tokens
const COST_PER_1K_INPUT_TOKENS = 0.0025
const COST_PER_1K_OUTPUT_TOKENS = 0.01

/**
 * Default generated content to use as fallback in case of parsing errors
 */
const DEFAULT_CONTENT: GeneratedContent = {
  description: '',
  short_description: '',
  seo_title: '',
  alt_text: '',
  suggested_tags: [],
  confidence_score: 0,
}

/**
 * Empty translations to use when translations are not requested
 */
const EMPTY_TRANSLATIONS: { fr: TranslatedContent; ja: TranslatedContent } = {
  fr: {
    description: '',
    short_description: '',
    seo_title: '',
    alt_text: '',
  },
  ja: {
    description: '',
    short_description: '',
    seo_title: '',
    alt_text: '',
  },
}

/**
 * Generate an exhibition-quality description for an artwork using GPT-4o Vision
 *
 * @param options - Generation options including image URL and metadata
 * @returns Complete generation result with translations and usage metrics
 * @throws Error if the OpenAI API call fails
 */
export async function generateArtworkDescription(
  options: GenerationOptions
): Promise<GenerationResult> {
  const { image_url, metadata, include_translations = true } = options

  // Get the lazy-loaded OpenAI client
  const openai = getOpenAIClient()

  // Call GPT-4o Vision API
  const response = await openai.chat.completions.create({
    model: GPT_MODEL,
    messages: [
      {
        role: 'system',
        content: SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: buildUserPrompt(metadata),
          },
          {
            type: 'image_url',
            image_url: {
              url: image_url,
              detail: 'high', // Use high detail for better analysis
            },
          },
        ],
      },
    ],
    max_tokens: 1500,
    temperature: 0.7,
    response_format: { type: 'json_object' },
  })

  // Parse the generated content
  const content = response.choices[0]?.message?.content || '{}'
  let generated: GeneratedContent

  try {
    const parsed = JSON.parse(content)
    generated = {
      description: parsed.description || '',
      short_description: parsed.short_description || '',
      seo_title: parsed.seo_title || '',
      alt_text: parsed.alt_text || '',
      suggested_tags: Array.isArray(parsed.suggested_tags) ? parsed.suggested_tags : [],
      confidence_score:
        typeof parsed.confidence_score === 'number' ? parsed.confidence_score : 0.5,
    }
  } catch {
    console.error('Failed to parse AI response:', content)
    generated = DEFAULT_CONTENT
  }

  // Calculate token usage and cost
  const inputTokens = response.usage?.prompt_tokens || 0
  const outputTokens = response.usage?.completion_tokens || 0
  const totalTokens = inputTokens + outputTokens
  const cost =
    (inputTokens * COST_PER_1K_INPUT_TOKENS) / 1000 +
    (outputTokens * COST_PER_1K_OUTPUT_TOKENS) / 1000

  // Generate translations if requested
  let translations = EMPTY_TRANSLATIONS

  if (include_translations && generated.description) {
    try {
      const contentToTranslate = {
        description: generated.description,
        short_description: generated.short_description,
        seo_title: generated.seo_title,
        alt_text: generated.alt_text,
      }

      // Translate to both languages in parallel
      const [fr, ja] = await Promise.all([
        translateArtworkContent(contentToTranslate, 'fr'),
        translateArtworkContent(contentToTranslate, 'ja'),
      ])

      translations = { fr, ja }
    } catch (error) {
      console.error('Translation failed, returning empty translations:', error)
      // Continue without translations rather than failing the whole request
    }
  }

  return {
    ...generated,
    translations,
    tokens_used: totalTokens,
    cost_usd: Math.round(cost * 10000) / 10000, // Round to 4 decimal places
  }
}

/**
 * Estimate the cost of generating descriptions for a batch of artworks
 *
 * @param count - Number of artworks to process
 * @returns Estimated cost in USD
 */
export function estimateBatchCost(count: number): number {
  // Average cost per artwork based on typical token usage
  const AVG_COST_PER_ARTWORK = 0.045 // ~$0.035-0.045 for GPT-4o + DeepL
  return Math.round(count * AVG_COST_PER_ARTWORK * 100) / 100
}
