/**
 * Perplexity Sonar Deep Research — deeper brief + citations for top candidates.
 * Docs: https://docs.perplexity.ai/api-reference/chat-completions
 * Pricing (2026): sonar-deep-research is ~$5 / 1k requests + token cost.
 * We bill a flat estimate per call to keep the budget simple.
 */

import { BudgetTracker } from '../budget'

const ENDPOINT = 'https://api.perplexity.ai/chat/completions'
const MODEL = 'sonar-deep-research'
const COST_PER_CALL_USD = 0.05 // generous estimate; adjust after first invoice

export interface PerplexityBrief {
  markdown: string
  citations: string[]
}

export async function deepResearch(
  topic: string,
  budget: BudgetTracker
): Promise<PerplexityBrief | null> {
  const apiKey = process.env.PERPLEXITY_API_KEY
  if (!apiKey) return null

  budget.assertAffordable(COST_PER_CALL_USD)

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content:
            'You research opportunities for the Kwame Brathwaite photography archive (Black is Beautiful movement). Produce a concise, source-cited brief: (1) what the opportunity is, (2) the relevant people/organization, (3) why it fits Brathwaite, (4) suggested next step. Markdown only.',
        },
        { role: 'user', content: topic },
      ],
      max_tokens: 800,
    }),
  })

  budget.record('perplexity', COST_PER_CALL_USD)

  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`Perplexity ${res.status}: ${txt.slice(0, 200)}`)
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
    citations?: string[]
  }

  const content = json.choices?.[0]?.message?.content
  if (!content) return null

  return {
    markdown: content,
    citations: json.citations || [],
  }
}
