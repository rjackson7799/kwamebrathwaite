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

// Shared model + pricing configuration
export {
  GPT_MODEL,
  COST_PER_1K_INPUT_TOKENS,
  COST_PER_1K_OUTPUT_TOKENS,
  calculateCost,
  estimateCost,
  estimateTokens,
} from './config'

// Smart Import parser
export {
  parseContentBlob,
  chunkSource,
  ContentParseError,
  MAX_INPUT_CHARS,
  MAX_ITEMS,
  MAX_CHUNKS,
} from './content-parser'
export type { ParseResult, ParsedBatchItem } from './content-parser'

// Prompts (for reference/debugging)
export {
  PROMPT_VERSION,
  SYSTEM_PROMPT,
  buildUserPrompt,
  SEO_SYSTEM_PROMPT,
  buildSEOUserPrompt,
  PRESS_SUMMARY_SYSTEM_PROMPT,
  buildPressSummaryPrompt,
  CONTENT_PARSER_PROMPT_VERSION,
  CONTENT_PARSER_SYSTEM_PROMPT,
  buildContentParserPrompt,
} from './prompts'
