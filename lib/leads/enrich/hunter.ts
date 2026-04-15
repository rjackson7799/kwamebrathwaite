/**
 * Hunter.io domain-search wrapper for contact enrichment.
 * Docs: https://hunter.io/api-documentation/v2#domain-search
 * Pricing: ~$0.005/lookup on starter; free tier 25/mo.
 */

import { BudgetTracker } from '../budget'

const ENDPOINT = 'https://api.hunter.io/v2/domain-search'
const COST_PER_LOOKUP_USD = 0.005

export interface HunterContact {
  name: string | null
  role: string | null
  email: string | null
  phone: string | null
}

export async function hunterDomainSearch(
  domain: string,
  budget: BudgetTracker
): Promise<HunterContact | null> {
  const apiKey = process.env.HUNTER_API_KEY
  if (!apiKey) return null

  budget.assertAffordable(COST_PER_LOOKUP_USD)

  const u = new URL(ENDPOINT)
  u.searchParams.set('domain', domain)
  u.searchParams.set('api_key', apiKey)
  u.searchParams.set('limit', '1')

  const res = await fetch(u.toString())
  budget.record('hunter', COST_PER_LOOKUP_USD)

  if (!res.ok) {
    if (res.status === 429 || res.status === 401) return null
    throw new Error(`Hunter ${res.status}`)
  }

  const json = (await res.json()) as {
    data?: {
      emails?: Array<{
        value?: string
        first_name?: string
        last_name?: string
        position?: string
        phone_number?: string
      }>
    }
  }

  const top = json.data?.emails?.[0]
  if (!top?.value) return null

  const fullName = [top.first_name, top.last_name].filter(Boolean).join(' ').trim() || null

  return {
    name: fullName,
    role: top.position || null,
    email: top.value,
    phone: top.phone_number || null,
  }
}

export function domainOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}
