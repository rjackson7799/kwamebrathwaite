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
} from './types'

// Description Generator
export {
  generateArtworkDescription,
  estimateBatchCost,
} from './description-generator'

// Translation Service
export {
  translateArtworkContent,
  cacheArtworkTranslations,
} from './translation-service'

// Prompts (for reference/debugging)
export { PROMPT_VERSION, SYSTEM_PROMPT, buildUserPrompt } from './prompts'
