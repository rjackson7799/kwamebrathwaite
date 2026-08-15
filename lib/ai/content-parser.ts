/**
 * Smart Import parser.
 *
 * Turns a pasted schedule/press block into validated, structured items.
 * Follows the lazy-client + json_object pattern already used by
 * description-generator.ts and press-summarizer.ts.
 *
 * Failure taxonomy is deliberate: some failures kill the batch, others produce
 * a single reviewable row, and the client must be able to tell which happened.
 */

import OpenAI from 'openai'
import {
  CONTENT_PARSER_SYSTEM_PROMPT,
  CONTENT_PARSER_PROMPT_VERSION,
  buildContentParserPrompt,
} from './prompts'
import { GPT_MODEL, calculateCost } from './config'
import { parsedItemSchema, type ParsedItem } from '@/lib/import/schemas'

let openaiClient: OpenAI | null = null

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set')
    }
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return openaiClient
}

// --- Caps. These bound cost and runtime; they are not advisory. -------------
export const MAX_INPUT_CHARS = 40_000
export const MAX_ITEMS = 200
export const MAX_CHUNKS = 4
export const CHUNK_TARGET_CHARS = 12_000
/** Per-model-call ceiling, well inside the route's 300s budget. */
export const MODEL_TIMEOUT_MS = 60_000
/** Leave room for matching + persistence after parsing. */
export const PARSE_WALL_CLOCK_BUDGET_MS = 200_000

export interface ParsedBatchItem {
  sourceIndex: number
  sourceText: string
  /** Null when this row represents a failure rather than a parsed entry. */
  item: ParsedItem | null
  /** Set when this row is a failure. */
  parseError: string | null
}

export interface ParseResult {
  items: ParsedBatchItem[]
  model: string
  promptVersion: string
  chunkCount: number
  inputTokens: number
  outputTokens: number
  costUsd: number
  latencyMs: number
  /** Batch-level warnings (truncation, aborted chunks). */
  warnings: string[]
}

/** Thrown for failures that kill the whole batch rather than one item. */
export class ContentParseError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'EMPTY_INPUT'
      | 'TOO_LARGE'
      | 'INVALID_JSON'
      | 'NO_ITEMS'
      | 'REFUSED'
      | 'TIMEOUT'
      | 'RATE_LIMIT'
      | 'API_ERROR'
  ) {
    super(message)
    this.name = 'ContentParseError'
  }
}

/**
 * Split on blank-line boundaries so chunks NEVER overlap.
 *
 * Non-overlap is what makes cross-chunk deduplication unnecessary — and
 * dedup would be actively harmful here, since two repeated screenings can
 * legitimately produce byte-identical blocks.
 */
export function chunkSource(raw: string, targetChars = CHUNK_TARGET_CHARS): string[] {
  const blocks = raw.split(/\n\s*\n/).filter((b) => b.trim().length > 0)
  if (blocks.length === 0) return []

  const chunks: string[] = []
  let current: string[] = []
  let currentLen = 0

  for (const block of blocks) {
    // A single oversized block still travels alone rather than being split
    // mid-entry, which would corrupt source_text.
    if (currentLen > 0 && currentLen + block.length > targetChars) {
      chunks.push(current.join('\n\n'))
      current = []
      currentLen = 0
    }
    current.push(block)
    currentLen += block.length + 2
  }
  if (current.length > 0) chunks.push(current.join('\n\n'))

  return chunks
}

interface ChunkOutcome {
  items: ParsedBatchItem[]
  inputTokens: number
  outputTokens: number
}

async function parseChunk(
  chunk: string,
  startIndex: number,
  signal?: AbortSignal
): Promise<ChunkOutcome> {
  const openai = getOpenAIClient()

  const response = await openai.chat.completions.create(
    {
      model: GPT_MODEL,
      messages: [
        { role: 'system', content: CONTENT_PARSER_SYSTEM_PROMPT },
        { role: 'user', content: buildContentParserPrompt(chunk) },
      ],
      response_format: { type: 'json_object' },
      // Extraction, not composition — there is nothing to be creative about, and
      // sampling actively hurts here. Matching uses HARD GATES (exact normalized
      // title + place + compatible dates), so if one run splits a location line
      // as venue="Museum of Contemporary Art" / city="San Diego" and the next
      // keeps them together, the re-paste fails to match and proposes a
      // duplicate create instead of an update. Observed live at temperature 0.1:
      // the same document matched 18/18 on one run and 17/18 on the next.
      temperature: 0,
      // Best-effort reproducibility on top of temperature 0.
      seed: 7,
      max_tokens: 8000,
    },
    { signal, timeout: MODEL_TIMEOUT_MS }
  )

  const choice = response.choices[0]
  if (choice?.finish_reason === 'content_filter') {
    throw new ContentParseError('The AI declined to process this text.', 'REFUSED')
  }

  const content = choice?.message?.content?.trim()
  if (!content) {
    throw new ContentParseError('The AI returned an empty response.', 'INVALID_JSON')
  }

  let raw: unknown
  try {
    raw = JSON.parse(content)
  } catch {
    throw new ContentParseError('The AI returned malformed JSON.', 'INVALID_JSON')
  }

  const rawItems = (raw as { items?: unknown })?.items
  if (!Array.isArray(rawItems)) {
    throw new ContentParseError('The AI response had no items array.', 'INVALID_JSON')
  }

  // Per-item validation. A malformed item becomes a visible failure row rather
  // than vanishing — "the AI returned something I couldn't use" is information
  // the client needs, and a silently shorter list hides it.
  const items: ParsedBatchItem[] = rawItems.map((candidate, i) => {
    const parsed = parsedItemSchema.safeParse(candidate)
    if (parsed.success) {
      return {
        sourceIndex: startIndex + i,
        sourceText: parsed.data.source_text,
        item: parsed.data,
        parseError: null,
      }
    }

    const issue = parsed.error.issues[0]
    const fallbackText =
      typeof (candidate as { source_text?: unknown })?.source_text === 'string'
        ? ((candidate as { source_text: string }).source_text as string)
        : '(the AI did not return the original text for this entry)'

    return {
      sourceIndex: startIndex + i,
      sourceText: fallbackText,
      item: null,
      parseError: issue
        ? `${issue.path.join('.') || 'item'}: ${issue.message}`
        : 'Item failed validation',
    }
  })

  return {
    items,
    inputTokens: response.usage?.prompt_tokens ?? 0,
    outputTokens: response.usage?.completion_tokens ?? 0,
  }
}

/**
 * Parse a pasted block into structured items.
 *
 * @throws ContentParseError for batch-level failures.
 */
export async function parseContentBlob(
  rawText: string,
  options: { signal?: AbortSignal; now?: () => number } = {}
): Promise<ParseResult> {
  const now = options.now ?? (() => Date.now())
  const startedAt = now()
  const warnings: string[] = []

  const trimmed = rawText.trim()
  if (!trimmed) {
    throw new ContentParseError('Nothing to parse.', 'EMPTY_INPUT')
  }
  if (trimmed.length > MAX_INPUT_CHARS) {
    throw new ContentParseError(
      `That paste is ${trimmed.length.toLocaleString()} characters. The limit is ${MAX_INPUT_CHARS.toLocaleString()} — split it into smaller batches.`,
      'TOO_LARGE'
    )
  }

  let chunks = chunkSource(trimmed)
  if (chunks.length === 0) {
    throw new ContentParseError('Nothing to parse.', 'EMPTY_INPUT')
  }
  if (chunks.length > MAX_CHUNKS) {
    // Never silently truncate: say exactly what was dropped.
    warnings.push(
      `Input split into ${chunks.length} chunks but only the first ${MAX_CHUNKS} were parsed. The remainder was not imported — paste it separately.`
    )
    chunks = chunks.slice(0, MAX_CHUNKS)
  }

  const items: ParsedBatchItem[] = []
  let inputTokens = 0
  let outputTokens = 0
  let chunkCount = 0
  let nextIndex = 0

  for (const chunk of chunks) {
    // Wall-clock guard: return partial results deliberately rather than being
    // killed mid-write by the platform.
    if (now() - startedAt > PARSE_WALL_CLOCK_BUDGET_MS) {
      warnings.push(
        `Stopped after ${chunkCount} of ${chunks.length} chunks to stay inside the time limit. The remainder was not imported.`
      )
      break
    }

    chunkCount += 1
    try {
      const outcome = await parseChunk(chunk, nextIndex, options.signal)
      items.push(...outcome.items)
      inputTokens += outcome.inputTokens
      outputTokens += outcome.outputTokens
      nextIndex += Math.max(outcome.items.length, 1)
    } catch (error) {
      // A failed chunk cannot produce per-entry rows — we do not know how many
      // entries it held. It becomes ONE synthetic failure row covering its
      // whole range, so the client sees exactly which part of their paste was
      // lost while successful chunks are retained.
      if (chunks.length === 1) throw normalizeApiError(error)

      items.push({
        sourceIndex: nextIndex,
        sourceText: chunk,
        item: null,
        parseError: `This section could not be parsed: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      })
      nextIndex += 1
    }
  }

  const usable = items.filter((i) => i.item !== null)
  if (usable.length === 0 && items.every((i) => i.parseError === null)) {
    throw new ContentParseError('No entries were found in that text.', 'NO_ITEMS')
  }

  if (items.length > MAX_ITEMS) {
    warnings.push(
      `Found ${items.length} entries but only the first ${MAX_ITEMS} were kept. The remainder was not imported.`
    )
    items.length = MAX_ITEMS
  }

  return {
    items,
    model: GPT_MODEL,
    promptVersion: CONTENT_PARSER_PROMPT_VERSION,
    chunkCount,
    inputTokens,
    outputTokens,
    costUsd: calculateCost(inputTokens, outputTokens),
    latencyMs: now() - startedAt,
    warnings,
  }
}

function normalizeApiError(error: unknown): ContentParseError {
  if (error instanceof ContentParseError) return error

  const message = error instanceof Error ? error.message : String(error)

  if (/abort|timeout|timed out/i.test(message)) {
    return new ContentParseError('The AI took too long to respond. Try a smaller paste.', 'TIMEOUT')
  }
  if (/rate limit|429/i.test(message)) {
    return new ContentParseError('AI rate limit reached. Try again in a moment.', 'RATE_LIMIT')
  }
  if (/api key/i.test(message)) {
    return new ContentParseError('The AI service is not configured.', 'API_ERROR')
  }
  return new ContentParseError('The AI service failed. Please try again.', 'API_ERROR')
}
