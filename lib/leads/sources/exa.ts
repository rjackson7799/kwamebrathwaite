/**
 * Exa search wrapper.
 * Docs: https://docs.exa.ai/reference/search
 *
 * Pricing (as of 2026-04): $0.005 per search request (10 results) + $0.001 per
 * additional content payload. We bill per search request to keep accounting simple.
 */

import { BudgetTracker } from '../budget'

const EXA_ENDPOINT = 'https://api.exa.ai/search'
const COST_PER_SEARCH_USD = 0.005

export interface ExaSearchResult {
  title: string
  url: string
  publishedDate?: string | null
  author?: string | null
  text?: string | null
  highlights?: string[] | null
  score?: number | null
}

interface ExaApiResponse {
  results: Array<{
    title?: string
    url: string
    publishedDate?: string
    author?: string
    text?: string
    highlights?: string[]
    score?: number
  }>
}

export interface ExaSearchOptions {
  query: string
  numResults?: number
  startPublishedDate?: string // ISO date — only return results newer than this
  includeText?: boolean
}

export async function exaSearch(
  opts: ExaSearchOptions,
  budget: BudgetTracker
): Promise<ExaSearchResult[]> {
  const apiKey = process.env.EXA_API_KEY
  if (!apiKey) {
    throw new Error('EXA_API_KEY is not set')
  }

  budget.assertAffordable(COST_PER_SEARCH_USD)

  const body: Record<string, unknown> = {
    query: opts.query,
    numResults: opts.numResults ?? 10,
    type: 'auto',
    contents: {
      text: opts.includeText !== false,
      highlights: { numSentences: 2, highlightsPerUrl: 3 },
    },
  }
  if (opts.startPublishedDate) {
    body.startPublishedDate = opts.startPublishedDate
  }

  const res = await fetch(EXA_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify(body),
  })

  budget.record('exa', COST_PER_SEARCH_USD)

  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`Exa ${res.status}: ${txt.slice(0, 200)}`)
  }

  const json = (await res.json()) as ExaApiResponse

  return (json.results || []).map((r) => ({
    title: r.title || r.url,
    url: r.url,
    publishedDate: r.publishedDate || null,
    author: r.author || null,
    text: r.text || null,
    highlights: r.highlights || null,
    score: r.score ?? null,
  }))
}
