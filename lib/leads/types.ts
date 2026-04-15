export type LeadCategory =
  | 'exhibition'
  | 'press'
  | 'collector'
  | 'brand_partnership'
  | 'academic'
  | 'mention'

export const LEAD_CATEGORIES: LeadCategory[] = [
  'exhibition',
  'press',
  'collector',
  'brand_partnership',
  'academic',
  'mention',
]

export const LEAD_CATEGORY_LABELS: Record<LeadCategory, string> = {
  exhibition: 'Exhibition',
  press: 'Press',
  collector: 'Collector',
  brand_partnership: 'Brand Partnership',
  academic: 'Academic',
  mention: 'Mention',
}

export type LeadStatus =
  | 'new'
  | 'qualified'
  | 'contacted'
  | 'responded'
  | 'converted'
  | 'dismissed'

export const LEAD_STATUSES: LeadStatus[] = [
  'new',
  'qualified',
  'contacted',
  'responded',
  'converted',
  'dismissed',
]

export type LeadRegion = 'us' | 'europe' | 'japan' | 'other'

export const LEAD_REGIONS: LeadRegion[] = ['us', 'europe', 'japan', 'other']

export const LEAD_REGION_LABELS: Record<LeadRegion, string> = {
  us: 'United States',
  europe: 'Europe',
  japan: 'Japan',
  other: 'Other',
}

export type LeadSourceKind = 'rss' | 'website' | 'social' | 'alerts_inbox'

export const LEAD_SOURCE_KINDS: LeadSourceKind[] = [
  'rss',
  'website',
  'social',
  'alerts_inbox',
]

export type LeadSourceType =
  | 'exa'
  | 'perplexity'
  | 'firecrawl'
  | 'rss'
  | 'google_alerts'
  | 'manual'

export type LeadRunStatus = 'running' | 'completed' | 'cap_reached' | 'failed'

export type LeadRunTrigger = 'cron' | 'manual'

export interface LeadSource {
  id: string
  created_at: string
  kind: LeadSourceKind
  url_or_handle: string
  label: string | null
  category_hint: LeadCategory | null
  region: LeadRegion
  language: string | null
  active: boolean
  last_fetched_at: string | null
  last_error: string | null
}

export interface LeadQueryTemplate {
  id: string
  created_at: string
  category: LeadCategory
  region: LeadRegion
  language: string
  query_text: string
  label: string | null
  active: boolean
}

export interface LeadSettings {
  budget_cap_usd: number
  digest_recipient: string
  top_n_per_category: number
  deep_research_enabled: boolean
}

export const DEFAULT_LEAD_SETTINGS: LeadSettings = {
  budget_cap_usd: 5,
  digest_recipient: '',
  top_n_per_category: 5,
  deep_research_enabled: true,
}
