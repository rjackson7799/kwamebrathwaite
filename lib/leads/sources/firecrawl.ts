/**
 * Firecrawl scrape API for sites without RSS.
 * Docs: https://docs.firecrawl.dev/api-reference/endpoint/scrape
 * Pricing (2026): ~$0.001 per scrape on the hobby tier.
 */

import { BudgetTracker } from '../budget'

const ENDPOINT = 'https://api.firecrawl.dev/v1/scrape'
const COST_PER_SCRAPE_USD = 0.001

export interface FirecrawlResult {
  url: string
  title: string
  markdown: string
}

export async function firecrawlScrape(
  url: string,
  budget: BudgetTracker
): Promise<FirecrawlResult | null> {
  const apiKey = process.env.FIRECRAWL_API_KEY
  if (!apiKey) return null

  budget.assertAffordable(COST_PER_SCRAPE_USD)

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      url,
      formats: ['markdown'],
      onlyMainContent: true,
      timeout: 20_000,
    }),
  })

  budget.record('firecrawl', COST_PER_SCRAPE_USD)

  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`Firecrawl ${res.status}: ${txt.slice(0, 200)}`)
  }

  const json = (await res.json()) as {
    success?: boolean
    data?: { markdown?: string; metadata?: { title?: string; sourceURL?: string } }
  }

  const md = json.data?.markdown
  if (!md) return null

  return {
    url: json.data?.metadata?.sourceURL || url,
    title: json.data?.metadata?.title || url,
    markdown: md.slice(0, 8000),
  }
}
