/**
 * Lead generation orchestrator (v1: Exa + OpenAI qualify only).
 *
 * Flow per active query template:
 *   1. Search Exa for recent results
 *   2. Dedupe URLs against existing leads
 *   3. Hand new candidates to OpenAI qualifier
 *   4. Insert qualified leads into the leads table
 *
 * Stops gracefully when the budget cap is reached. Always writes a final
 * lead_runs row with status, cost breakdown, and error log.
 */

import { createAdminClient } from '@/lib/supabase/server'
import { exaSearch } from './sources/exa'
import { qualifyCandidates } from './qualify'
import { filterNewUrls } from './dedup'
import { BudgetTracker, BudgetCapReachedError } from './budget'
import type { LeadCategory, LeadRegion, LeadRunTrigger } from './types'

interface QueryTemplateRow {
  id: string
  category: LeadCategory
  region: LeadRegion
  language: string
  query_text: string
}

export interface RunOptions {
  budgetCapUsd: number
  triggeredBy: LeadRunTrigger
  /** Limit the run to a single category (manual test runs). */
  categoryFilter?: LeadCategory
}

export interface RunResult {
  runId: string
  status: 'completed' | 'cap_reached' | 'failed'
  costUsd: number
  leadsFound: number
  leadsNew: number
  errors: Array<{ stage: string; message: string }>
}

const DEFAULT_RESULTS_PER_QUERY = 10

export async function runLeadGeneration(opts: RunOptions): Promise<RunResult> {
  const supabase = createAdminClient()
  const budget = new BudgetTracker(opts.budgetCapUsd)
  const errors: Array<{ stage: string; message: string }> = []
  let leadsNew = 0
  let leadsFound = 0

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

  // 2. Load active query templates
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (supabase as any)
    .from('lead_query_templates')
    .select('id, category, region, language, query_text')
    .eq('active', true)
  if (opts.categoryFilter) q = q.eq('category', opts.categoryFilter)

  const { data: templates, error: tplErr } = await q
  if (tplErr) {
    await finalizeRun(supabase, runId, 'failed', budget, leadsFound, leadsNew, [
      { stage: 'load_templates', message: tplErr.message },
    ])
    throw new Error(`Failed to load query templates: ${tplErr.message}`)
  }

  const tpls = (templates as QueryTemplateRow[]) || []

  let status: 'completed' | 'cap_reached' | 'failed' = 'completed'

  try {
    for (const tpl of tpls) {
      try {
        // a) Exa search
        const results = await exaSearch(
          {
            query: tpl.query_text,
            numResults: DEFAULT_RESULTS_PER_QUERY,
            startPublishedDate: thirtyDaysAgoIso(),
          },
          budget
        )
        leadsFound += results.length
        if (results.length === 0) continue

        // b) Dedup
        const newUrls = await filterNewUrls(
          supabase,
          results.map((r) => r.url)
        )
        const fresh = results.filter((r) => newUrls.has(r.url))
        if (fresh.length === 0) continue

        // c) Qualify
        const qualified = await qualifyCandidates(
          fresh,
          {
            category: tpl.category,
            region: tpl.region,
            queryText: tpl.query_text,
          },
          budget
        )
        if (qualified.length === 0) continue

        // d) Insert
        const rows = qualified.map((lead) => ({
          status: 'new',
          category: tpl.category,
          region: tpl.region,
          language: tpl.language,
          title: lead.title.slice(0, 500),
          summary_en: lead.summary_en,
          source_url: lead.source_url,
          source_type: 'exa',
          score: lead.score,
          organization: lead.organization,
          contact_name: lead.contact_name,
          contact_role: lead.contact_role,
          contact_email: lead.contact_email,
          run_id: runId,
          raw: { template_id: tpl.id, query: tpl.query_text },
        }))

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: inserted, error: insErr } = await (supabase as any)
          .from('leads')
          .insert(rows)
          .select('id')

        if (insErr) {
          // 23505 = unique violation (race against another run / google_alerts).
          if (insErr.code !== '23505') {
            errors.push({
              stage: `insert_template_${tpl.id}`,
              message: insErr.message,
            })
          }
        } else {
          leadsNew += (inserted as Array<{ id: string }>)?.length ?? 0
        }
      } catch (e) {
        if (e instanceof BudgetCapReachedError) {
          status = 'cap_reached'
          break
        }
        errors.push({
          stage: `template_${tpl.id}`,
          message: e instanceof Error ? e.message : String(e),
        })
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

  return {
    runId,
    status,
    costUsd: budget.totalUsd,
    leadsFound,
    leadsNew,
    errors,
  }
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

function thirtyDaysAgoIso(): string {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString().slice(0, 10)
}
