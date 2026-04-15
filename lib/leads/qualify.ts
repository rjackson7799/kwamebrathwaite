/**
 * AI qualifier: takes raw search candidates and returns Brathwaite-archive-relevant
 * lead records with score, summary, and inferred contact info.
 *
 * Uses OpenAI gpt-4o-mini for cost; can swap to Claude later behind the same interface.
 */

import OpenAI from 'openai'
import type { ExaSearchResult } from './sources/exa'
import { BudgetTracker } from './budget'
import type { LeadCategory, LeadRegion } from './types'

const MODEL = 'gpt-4o-mini'
// gpt-4o-mini pricing as of 2026-04
const COST_PER_1K_INPUT = 0.00015
const COST_PER_1K_OUTPUT = 0.0006

let client: OpenAI | null = null
function getClient(): OpenAI {
  if (!client) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set')
    }
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return client
}

export interface QualifiedLead {
  title: string
  source_url: string
  summary_en: string
  score: number
  organization: string | null
  contact_name: string | null
  contact_role: string | null
  contact_email: string | null
}

const SYSTEM_PROMPT = `You evaluate search results for the Kwame Brathwaite photography archive.

Kwame Brathwaite (1938-2023) was the photographer who founded the "Black is Beautiful" movement in 1960s Harlem. His archive sells prints to collectors, lends works to museums, licenses images for editorial/film/brand use, and supports academic research on Black photography and civil-rights-era visual culture.

For each candidate result, return a relevance score 0-100 for whether it represents a real OPPORTUNITY for the archive in the given category. Skip pure noise (job postings, spam, unrelated photography listings).

Scoring guidance:
- 80-100: directly relevant, actionable now (e.g. an open call for Black photography exhibitions, a journalist actively covering this beat)
- 50-79: adjacent/relevant, worth a relationship (e.g. curator at a museum that collects this period)
- 20-49: weak signal but possible long-term relationship
- 0-19: not relevant, skip

Extract any contact info visible in the snippet (name, role, organization, email). Be conservative — never fabricate.

Return ONLY valid JSON matching the requested schema. No prose.`

export async function qualifyCandidates(
  candidates: ExaSearchResult[],
  context: { category: LeadCategory; region: LeadRegion; queryText: string },
  budget: BudgetTracker
): Promise<QualifiedLead[]> {
  if (candidates.length === 0) return []

  // Pre-flight estimate: ~500 tokens system + ~150/candidate input + ~100/candidate output.
  const estInputTokens = 500 + candidates.length * 150
  const estOutputTokens = candidates.length * 100
  const estCost =
    (estInputTokens / 1000) * COST_PER_1K_INPUT +
    (estOutputTokens / 1000) * COST_PER_1K_OUTPUT
  budget.assertAffordable(estCost)

  const userPrompt = `Category: ${context.category}
Region: ${context.region}
Original query: ${context.queryText}

Candidates:
${candidates
  .map(
    (c, i) => `[${i}] ${c.title}
URL: ${c.url}
${c.publishedDate ? `Published: ${c.publishedDate}` : ''}
${c.author ? `Author: ${c.author}` : ''}
Snippet: ${(c.text || (c.highlights || []).join(' ') || '').slice(0, 800)}`
  )
  .join('\n\n')}

Return JSON:
{
  "leads": [
    {
      "index": <0-based index from above>,
      "score": <0-100>,
      "summary_en": "<2-3 sentence summary of the OPPORTUNITY for the archive, not just the article>",
      "organization": <string or null>,
      "contact_name": <string or null>,
      "contact_role": <string or null>,
      "contact_email": <string or null>
    }
  ]
}

Omit candidates scoring below 20.`

  const openai = getClient()
  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
  })

  const usage = completion.usage
  if (usage) {
    const cost =
      (usage.prompt_tokens / 1000) * COST_PER_1K_INPUT +
      (usage.completion_tokens / 1000) * COST_PER_1K_OUTPUT
    budget.record('openai', cost)
  }

  const content = completion.choices[0]?.message?.content
  if (!content) return []

  let parsed: { leads?: Array<Record<string, unknown>> }
  try {
    parsed = JSON.parse(content)
  } catch (e) {
    console.error('qualify: invalid JSON from model:', e)
    return []
  }

  const out: QualifiedLead[] = []
  for (const item of parsed.leads || []) {
    const idx = Number(item.index)
    const score = Number(item.score)
    if (!Number.isFinite(idx) || idx < 0 || idx >= candidates.length) continue
    if (!Number.isFinite(score) || score < 20) continue

    const candidate = candidates[idx]
    out.push({
      title: candidate.title,
      source_url: candidate.url,
      summary_en: typeof item.summary_en === 'string' ? item.summary_en : '',
      score: Math.min(100, Math.max(0, Math.round(score))),
      organization: typeof item.organization === 'string' ? item.organization : null,
      contact_name: typeof item.contact_name === 'string' ? item.contact_name : null,
      contact_role: typeof item.contact_role === 'string' ? item.contact_role : null,
      contact_email: typeof item.contact_email === 'string' ? item.contact_email : null,
    })
  }

  return out
}
