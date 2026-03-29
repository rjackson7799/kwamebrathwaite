/**
 * AI Module - Artwork Description Generator
 *
 * Provides AI-powered description generation for the Kwame Brathwaite Archive
 * using OpenAI GPT-4o Vision and DeepL translation.
 */

// Types
export type {
  ArtworkMetadata,
  GeneratedContent,
  TranslatedContent,
  GenerationResult,
  GenerationOptions,
  GenerationLogEntry,
  GenerateDescriptionRequest,
  GenerateDescriptionResponse,
  ApplyDescriptionRequest,
  ApplyDescriptionResponse,
  GeneratedSEOContent,
  TranslatedSEOContent,
  SEOGenerationResult,
  SEOGenerationOptions,
} from './types'

// Description Generator
export {
  generateArtworkDescription,
  generateArtworkSEO,
  estimateBatchCost,
} from './description-generator'

// Translation Service
export {
  translateArtworkContent,
  translateSEOContent,
  cacheArtworkTranslations,
} from './translation-service'

// Press Summarizer
export { generatePressSummary } from './press-summarizer'

// Prompts (for reference/debugging)
export {
  PROMPT_VERSION,
  SYSTEM_PROMPT,
  buildUserPrompt,
  SEO_SYSTEM_PROMPT,
  buildSEOUserPrompt,
  PRESS_SUMMARY_SYSTEM_PROMPT,
  buildPressSummaryPrompt,
} from './prompts'
