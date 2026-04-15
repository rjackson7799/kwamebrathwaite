/**
 * Lead generation orchestrator.
 *
 * Pulls candidates from every active discovery channel:
 *   - Exa search per active query template
 *   - RSS feeds for each active lead_source of kind='rss'
 *   - Firecrawl for each active lead_source of kind='website' (only if FIRECRAWL_API_KEY set)
 *
 * Then dedupes URLs against existing leads, qualifies fresh candidates with
 * OpenAI per (category, region, language) bucket, optionally runs Perplexity
 * Deep Research on the top scorer per bucket, optionally enriches contacts
 * via Hunter.io, and inserts the results.
 *
 * Stops gracefully on budget cap. Always finalizes the lead_runs row.
 */

import { createAdminClient } from '@/lib/supabase/server'
import { exaSearch } from './sources/exa'
import { fetchRssFeed } from './sources/rss'
import { firecrawlScrape } from './sources/firecrawl'
import { deepResearch } from './sources/perplexity'
import { hunterDomainSearch, domainOf } from './enrich/hunter'
import { qualifyCandidates } from './qualify'
import { filterNewUrls } from './dedup'
import { BudgetTracker, BudgetCapReachedError } from './budget'
import type {
  LeadCategory,
  LeadRegion,
  LeadRunTrigger,
  LeadSourceType,
} from './types'

interface QueryTemplateRow {
  id: string
  category: LeadCategory
  region: LeadRegion
  language: string
  query_text: string
}

interface LeadSourceRow {
  id: string
  kind: 'rss' | 'website' | 'social' | 'alerts_inbox'
  url_or_handle: string
  category_hint: LeadCategory | null
  region: LeadRegion
  language: string | null
}

interface Candidate {
  title: string
  url: string
  snippet: string | null
  publishedDate: string | null
  category: LeadCategory
  region: LeadRegion
  language: string
  sourceType: LeadSourceType
  templateId?: string
  sourceRowId?: string
}

export interface RunOptions {
  budgetCapUsd: number
  triggeredBy: LeadRunTrigger
  categoryFilter?: LeadCategory
  deepResearchEnabled?: boolean
}

export interface RunResult {
  runId: string
  status: 'completed' | 'cap_reached' | 'failed'
  costUsd: number
  costBreakdown: Record<string, number>
  leadsFound: number
  leadsNew: number
  errors: Array<{ stage: string; message: string }>
}

const DEFAULT_RESULTS_PER_QUERY = 10
const DEFAULT_RSS_LOOKBACK_DAYS = 30

export async function runLeadGeneration(opts: RunOptions): Promise<RunResult> {
  const supabase = createAdminClient()
  const budget = new BudgetTracker(opts.budgetCapUsd)
  const errors: Array<{ stage: string; message: string }> = []
  let leadsFound = 0
  let leadsNew = 0

  // 1. Open run row
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: runRow, error: runErr } = await (supabase as any)
    .from('lead_runs')
    .insert({
      status: 'running',
      triggered_by: opts.triggeredBy,
      budget_cap_usd: opts.budgetCapUsd,
    })
    .select()
    .single()

  if (runErr || !runRow) {
    throw new Error(`Failed to create lead_runs row: ${runErr?.message}`)
  }
  const runId = runRow.id as string

  let status: 'completed' | 'cap_reached' | 'failed' = 'completed'
  const candidates: Candidate[] = []

  try {
    // 2. Collect candidates from all channels.
    await collectFromExa(supabase, candidates, budget, errors, opts.categoryFilter)
    await collectFromRss(supabase, candidates, errors, opts.categoryFilter)
    await collectFromWebsites(supabase, candidates, budget, errors, opts.categoryFilter)
    leadsFound = candidates.length

    if (candidates.length === 0) {
      await finalizeRun(supabase, runId, status, budget, leadsFound, leadsNew, errors)
      return done(runId, status, budget, leadsFound, leadsNew, errors)
    }

    // 3. Dedup all candidates against existing leads.
    const newUrls = await filterNewUrls(
      supabase,
      candidates.map((c) => c.url)
    )
    const fresh = dedupeWithinBatch(candidates.filter((c) => newUrls.has(c.url)))
    if (fresh.length === 0) {
      await finalizeRun(supabase, runId, status, budget, leadsFound, leadsNew, errors)
      return done(runId, status, budget, leadsFound, leadsNew, errors)
    }

    // 4. Qualify in (category, region, language) buckets.
    const buckets = bucketCandidates(fresh)
    const insertable: InsertableLead[] = []

    for (const [bucketKey, group] of Array.from(buckets.entries())) {
      try {
        const [category, region, language] = bucketKey.split('|') as [
          LeadCategory,
          LeadRegion,
          string,
        ]
        const qualified = await qualifyCandidates(
          group.map((c: Candidate) => ({
            title: c.title,
            url: c.url,
            text: c.snippet,
            highlights: null,
            publishedDate: c.publishedDate,
            author: null,
          })),
          { category, region, queryText: `Curated bucket ${category}/${region}/${language}` },
          budget
        )
        for (const q of qualified) {
          const cand = group.find((c: Candidate) => c.url === q.source_url)
          if (!cand) continue
          insertable.push({
            ...q,
            category,
            region,
            language,
            source_type: cand.sourceType,
            templateId: cand.templateId,
          })
        }
      } catch (e) {
        if (e instanceof BudgetCapReachedError) {
          status = 'cap_reached'
          break
        }
        errors.push({
          stage: `qualify_${bucketKey}`,
          message: e instanceof Error ? e.message : String(e),
        })
      }
    }

    // 5. Optional: deep-research the top scorer per category.
    if (status !== 'cap_reached' && opts.deepResearchEnabled !== false && insertable.length > 0) {
      const topPerCategory = pickTopPerCategory(insertable)
      for (const lead of topPerCategory) {
        try {
          const brief = await deepResearch(
            `Lead: "${lead.title}" — ${lead.summary_en}\nSource: ${lead.source_url}\nWhy is this an opportunity for the Kwame Brathwaite archive?`,
            budget
          )
          if (brief) {
            lead.deep_brief_md =
              brief.markdown +
              (brief.citations.length
                ? `\n\n**Citations**\n${brief.citations.map((c, i) => `${i + 1}. ${c}`).join('\n')}`
                : '')
          }
        } catch (e) {
          if (e instanceof BudgetCapReachedError) {
            status = 'cap_reached'
            break
          }
          errors.push({
            stage: `perplexity_${lead.source_url}`,
            message: e instanceof Error ? e.message : String(e),
          })
        }
      }
    }

    // 6. Optional: Hunter.io enrichment for any lead missing contact_email.
    if (status !== 'cap_reached' && process.env.HUNTER_API_KEY) {
      for (const lead of insertable) {
        if (lead.contact_email) continue
        const dom = domainOf(lead.source_url)
        if (!dom) continue
        try {
          const c = await hunterDomainSearch(dom, budget)
          if (c) {
            lead.contact_email = c.email
            lead.contact_name = lead.contact_name || c.name
            lead.contact_role = lead.contact_role || c.role
            lead.contact_phone = c.phone
          }
        } catch (e) {
          if (e instanceof BudgetCapReachedError) {
            status = 'cap_reached'
            break
          }
          errors.push({
            stage: `hunter_${dom}`,
            message: e instanceof Error ? e.message : String(e),
          })
        }
      }
    }

    // 7. Insert all leads.
    if (insertable.length > 0) {
      const rows = insertable.map((l) => ({
        status: 'new',
        category: l.category,
        region: l.region,
        language: l.language,
        title: l.title.slice(0, 500),
        summary_en: l.summary_en,
        deep_brief_md: l.deep_brief_md ?? null,
        source_url: l.source_url,
        source_type: l.source_type,
        score: l.score,
        organization: l.organization,
        contact_name: l.contact_name,
        contact_role: l.contact_role,
        contact_email: l.contact_email,
        contact_phone: l.contact_phone ?? null,
        run_id: runId,
        raw: { template_id: l.templateId ?? null },
      }))

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: inserted, error: insErr } = await (supabase as any)
        .from('leads')
        .insert(rows)
        .select('id')

      if (insErr && insErr.code !== '23505') {
        errors.push({ stage: 'insert', message: insErr.message })
      } else {
        leadsNew = (inserted as Array<{ id: string }>)?.length ?? 0
      }
    }
  } catch (e) {
    if (e instanceof BudgetCapReachedError) {
      status = 'cap_reached'
    } else {
      status = 'failed'
      errors.push({
        stage: 'orchestrator',
        message: e instanceof Error ? e.message : String(e),
      })
    }
  }

  await finalizeRun(supabase, runId, status, budget, leadsFound, leadsNew, errors)
  return done(runId, status, budget, leadsFound, leadsNew, errors)
}

// ----------------- collectors -----------------

async function collectFromExa(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  out: Candidate[],
  budget: BudgetTracker,
  errors: Array<{ stage: string; message: string }>,
  categoryFilter: LeadCategory | undefined
): Promise<void> {
  let q = supabase
    .from('lead_query_templates')
    .select('id, category, region, language, query_text')
    .eq('active', true)
  if (categoryFilter) q = q.eq('category', categoryFilter)
  const { data, error } = await q
  if (error) {
    errors.push({ stage: 'load_templates', message: error.message })
    return
  }
  const tpls = (data as QueryTemplateRow[]) || []
  for (const tpl of tpls) {
    try {
      const results = await exaSearch(
        {
          query: tpl.query_text,
          numResults: DEFAULT_RESULTS_PER_QUERY,
          startPublishedDate: daysAgoIso(DEFAULT_RSS_LOOKBACK_DAYS),
        },
        budget
      )
      for (const r of results) {
        out.push({
          title: r.title,
          url: r.url,
          snippet: r.text || (r.highlights || []).join(' ') || null,
          publishedDate: r.publishedDate ?? null,
          category: tpl.category,
          region: tpl.region,
          language: tpl.language,
          sourceType: 'exa',
          templateId: tpl.id,
        })
      }
    } catch (e) {
      if (e instanceof BudgetCapReachedError) throw e
      errors.push({
        stage: `exa_${tpl.id}`,
        message: e instanceof Error ? e.message : String(e),
      })
    }
  }
}

async function collectFromRss(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  out: Candidate[],
  errors: Array<{ stage: string; message: string }>,
  categoryFilter: LeadCategory | undefined
): Promise<void> {
  let q = supabase
    .from('lead_sources')
    .select('id, kind, url_or_handle, category_hint, region, language')
    .eq('active', true)
    .eq('kind', 'rss')
  if (categoryFilter) q = q.eq('category_hint', categoryFilter)
  const { data, error } = await q
  if (error) {
    errors.push({ stage: 'load_rss_sources', message: error.message })
    return
  }
  const sources = (data as LeadSourceRow[]) || []
  const cutoff = Date.now() - DEFAULT_RSS_LOOKBACK_DAYS * 24 * 60 * 60 * 1000

  for (const src of sources) {
    try {
      const items = await fetchRssFeed(src.url_or_handle)
      for (const item of items) {
        if (item.publishedDate) {
          const d = Date.parse(item.publishedDate)
          if (Number.isFinite(d) && d < cutoff) continue
        }
        out.push({
          title: item.title,
          url: item.url,
          snippet: item.snippet,
          publishedDate: item.publishedDate,
          category: src.category_hint || 'mention',
          region: src.region,
          language: src.language || 'en',
          sourceType: 'rss',
          sourceRowId: src.id,
        })
      }
      await markSourceFetched(supabase, src.id, null)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      errors.push({ stage: `rss_${src.id}`, message: msg })
      await markSourceFetched(supabase, src.id, msg)
    }
  }
}

async function collectFromWebsites(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  out: Candidate[],
  budget: BudgetTracker,
  errors: Array<{ stage: string; message: string }>,
  categoryFilter: LeadCategory | undefined
): Promise<void> {
  if (!process.env.FIRECRAWL_API_KEY) return

  let q = supabase
    .from('lead_sources')
    .select('id, kind, url_or_handle, category_hint, region, language')
    .eq('active', true)
    .eq('kind', 'website')
  if (categoryFilter) q = q.eq('category_hint', categoryFilter)
  const { data, error } = await q
  if (error) {
    errors.push({ stage: 'load_website_sources', message: error.message })
    return
  }
  const sources = (data as LeadSourceRow[]) || []

  for (const src of sources) {
    try {
      const result = await firecrawlScrape(src.url_or_handle, budget)
      if (!result) continue
      out.push({
        title: result.title,
        url: result.url,
        snippet: result.markdown.slice(0, 800),
        publishedDate: null,
        category: src.category_hint || 'mention',
        region: src.region,
        language: src.language || 'en',
        sourceType: 'firecrawl',
        sourceRowId: src.id,
      })
      await markSourceFetched(supabase, src.id, null)
    } catch (e) {
      if (e instanceof BudgetCapReachedError) throw e
      const msg = e instanceof Error ? e.message : String(e)
      errors.push({ stage: `firecrawl_${src.id}`, message: msg })
      await markSourceFetched(supabase, src.id, msg)
    }
  }
}

// ----------------- helpers -----------------

interface InsertableLead {
  title: string
  source_url: string
  summary_en: string
  score: number
  organization: string | null
  contact_name: string | null
  contact_role: string | null
  contact_email: string | null
  contact_phone?: string | null
  category: LeadCategory
  region: LeadRegion
  language: string
  source_type: LeadSourceType
  templateId?: string
  deep_brief_md?: string
}

function dedupeWithinBatch(cands: Candidate[]): Candidate[] {
  const seen = new Set<string>()
  return cands.filter((c) => {
    if (seen.has(c.url)) return false
    seen.add(c.url)
    return true
  })
}

function bucketCandidates(cands: Candidate[]): Map<string, Candidate[]> {
  const m = new Map<string, Candidate[]>()
  for (const c of cands) {
    const key = `${c.category}|${c.region}|${c.language}`
    const arr = m.get(key) || []
    arr.push(c)
    m.set(key, arr)
  }
  return m
}

function pickTopPerCategory(leads: InsertableLead[]): InsertableLead[] {
  const byCat = new Map<LeadCategory, InsertableLead>()
  for (const l of leads) {
    const cur = byCat.get(l.category)
    if (!cur || l.score > cur.score) byCat.set(l.category, l)
  }
  return Array.from(byCat.values())
}

async function markSourceFetched(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  id: string,
  errMsg: string | null
): Promise<void> {
  await supabase
    .from('lead_sources')
    .update({
      last_fetched_at: new Date().toISOString(),
      last_error: errMsg,
    })
    .eq('id', id)
}

async function finalizeRun(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  runId: string,
  status: 'completed' | 'cap_reached' | 'failed',
  budget: BudgetTracker,
  leadsFound: number,
  leadsNew: number,
  errors: Array<{ stage: string; message: string }>
): Promise<void> {
  await supabase
    .from('lead_runs')
    .update({
      status,
      finished_at: new Date().toISOString(),
      cost_usd: Number(budget.totalUsd.toFixed(4)),
      cost_breakdown: budget.breakdown,
      leads_found: leadsFound,
      leads_new: leadsNew,
      error_log: errors,
    })
    .eq('id', runId)
}

function done(
  runId: string,
  status: 'completed' | 'cap_reached' | 'failed',
  budget: BudgetTracker,
  leadsFound: number,
  leadsNew: number,
  errors: Array<{ stage: string; message: string }>
): RunResult {
  return {
    runId,
    status,
    costUsd: budget.totalUsd,
    costBreakdown: budget.breakdown,
    leadsFound,
    leadsNew,
    errors,
  }
}

function daysAgoIso(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}
