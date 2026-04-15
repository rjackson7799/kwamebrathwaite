/**
 * Build + send the weekly lead digest email.
 *
 * Pulls leads from the last `windowDays` days, optionally filtered to a single
 * run, and sends to the configured digest recipient (settings table or
 * LEADS_DIGEST_TO_EMAIL fallback). Returns a small summary the cron route logs.
 */

import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/send'
import {
  LeadDigestEmail,
  type DigestLead,
  type LeadDigestEmailProps,
} from '@/lib/email/templates/LeadDigestEmail'
import { EMAIL_CONFIG } from '@/lib/email/client'
import type { LeadCategory, LeadRegion } from './types'

interface RunRow {
  status: 'completed' | 'cap_reached' | 'failed' | 'running'
  cost_usd: number | string | null
  error_log: Array<{ stage: string; message: string }> | null
}

interface LeadRow {
  id: string
  title: string
  summary_en: string | null
  source_url: string
  category: LeadCategory
  region: LeadRegion
  score: number | null
  organization: string | null
}

export interface DigestOptions {
  windowDays?: number
  /** If set, only include leads from this run and use its status/cost in the banner. */
  runId?: string
  /** Override recipient. If unset, looks up settings.digest_recipient then env. */
  to?: string
}

export interface DigestResult {
  sent: boolean
  recipient: string | null
  leadCount: number
  emailId?: string
  skippedReason?: string
}

export async function sendLeadDigest(opts: DigestOptions = {}): Promise<DigestResult> {
  const supabase = createAdminClient()
  const windowDays = opts.windowDays ?? 7

  // Resolve recipient: explicit > settings > env.
  let recipient = opts.to || ''
  if (!recipient) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('lead_settings')
      .select('value')
      .eq('key', 'digest_recipient')
      .single()
    if (typeof data?.value === 'string' && data.value) {
      recipient = data.value
    }
  }
  if (!recipient) {
    recipient = process.env.LEADS_DIGEST_TO_EMAIL || EMAIL_CONFIG.adminEmail
  }
  if (!recipient) {
    return {
      sent: false,
      recipient: null,
      leadCount: 0,
      skippedReason: 'no recipient configured',
    }
  }

  // Pull leads.
  const since = new Date()
  since.setDate(since.getDate() - windowDays)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (supabase as any)
    .from('leads')
    .select('id, title, summary_en, source_url, category, region, score, organization')
    .gte('created_at', since.toISOString())
    .order('score', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(50)

  if (opts.runId) q = q.eq('run_id', opts.runId)

  const { data: leadsData, error: leadsErr } = await q
  if (leadsErr) {
    throw new Error(`Failed to load digest leads: ${leadsErr.message}`)
  }

  const leads: DigestLead[] = ((leadsData as LeadRow[]) || []).map((l) => ({
    id: l.id,
    title: l.title,
    summary_en: l.summary_en,
    source_url: l.source_url,
    category: l.category,
    region: l.region,
    score: l.score,
    organization: l.organization,
  }))

  // Pull run status if a runId was provided.
  let runStatus: LeadDigestEmailProps['runStatus'] = null
  let costUsd: number | null = null
  let capReached = false
  let errorCount = 0
  if (opts.runId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: runData } = await (supabase as any)
      .from('lead_runs')
      .select('status, cost_usd, error_log')
      .eq('id', opts.runId)
      .single()
    const run = runData as RunRow | null
    if (run && run.status !== 'running') {
      runStatus = run.status
      costUsd = run.cost_usd === null ? null : Number(run.cost_usd)
      capReached = run.status === 'cap_reached'
      errorCount = (run.error_log || []).length
    }
  }

  const subjectPrefix =
    leads.length === 0
      ? 'No new leads'
      : `${leads.length} new lead${leads.length === 1 ? '' : 's'}`

  const result = await sendEmail({
    to: recipient,
    subject: `[KB Archive] ${subjectPrefix} this week`,
    react: LeadDigestEmail({
      leads,
      windowDays,
      runStatus,
      costUsd,
      capReached,
      errorCount,
    }),
  })

  if (!result.success) {
    return {
      sent: false,
      recipient,
      leadCount: leads.length,
      skippedReason: result.error || 'send failed',
    }
  }

  return {
    sent: true,
    recipient,
    leadCount: leads.length,
    emailId: result.id,
  }
}
