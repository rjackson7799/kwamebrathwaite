'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/admin/PageHeader'
import {
  LEAD_CATEGORIES,
  LEAD_CATEGORY_LABELS,
  LEAD_REGIONS,
  LEAD_REGION_LABELS,
  LEAD_STATUSES,
  LeadCategory,
  LeadRegion,
  LeadStatus,
} from '@/lib/leads/types'

interface Lead {
  id: string
  created_at: string
  status: LeadStatus
  category: LeadCategory
  region: LeadRegion
  title: string
  summary_en: string | null
  source_url: string
  score: number | null
  organization: string | null
  contact_name: string | null
}

interface RunResult {
  runId: string
  status: 'completed' | 'cap_reached' | 'failed'
  costUsd: number
  costBreakdown?: Record<string, number>
  leadsFound: number
  leadsNew: number
  errors: Array<{ stage: string; message: string }>
}

interface SpendSummary {
  days: number
  runs: number
  cap_reached: number
  failed: number
  total_usd: number
  breakdown: Record<string, number>
}

const SELECT_CLS =
  'px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black'

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const [category, setCategory] = useState<LeadCategory | ''>('')
  const [region, setRegion] = useState<LeadRegion | ''>('')
  const [status, setStatus] = useState<LeadStatus | ''>('')
  const [q, setQ] = useState('')

  const [running, setRunning] = useState(false)
  const [runResult, setRunResult] = useState<RunResult | null>(null)
  const [runError, setRunError] = useState<string | null>(null)
  const [spend, setSpend] = useState<SpendSummary | null>(null)

  const loadSpend = useCallback(async () => {
    const r = await fetch('/api/admin/leads/runs/summary')
    const j = await r.json()
    if (j.success) setSpend(j.data)
  }, [])

  useEffect(() => {
    loadSpend()
  }, [loadSpend])

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (category) params.set('category', category)
    if (region) params.set('region', region)
    if (status) params.set('status', status)
    if (q) params.set('q', q)
    const r = await fetch(`/api/admin/leads?${params}`)
    const j = await r.json()
    if (j.success) {
      setLeads(j.data)
      setTotal(j.metadata?.total ?? 0)
    }
    setLoading(false)
  }, [category, region, status, q])

  useEffect(() => {
    load()
  }, [load])

  const runNow = async () => {
    setRunning(true)
    setRunError(null)
    setRunResult(null)
    try {
      const r = await fetch('/api/admin/leads/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const j = await r.json()
      if (!j.success) {
        setRunError(j.error?.message || 'Run failed')
      } else {
        setRunResult(j.data)
        load()
        loadSpend()
      }
    } catch (e) {
      setRunError(e instanceof Error ? e.message : 'Run failed')
    } finally {
      setRunning(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Leads"
        description="AI-discovered opportunities — partnerships, press, exhibitions, collectors, and more."
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Leads' },
        ]}
        actions={
          <div className="flex gap-2">
            <Link href="/admin/leads/sources" className="btn-secondary">
              Sources
            </Link>
            <button
              onClick={runNow}
              disabled={running}
              className="btn-primary disabled:opacity-50"
            >
              {running ? 'Running…' : 'Run now'}
            </button>
          </div>
        }
      />

      <div className="p-8">
        {spend && spend.runs > 0 && (
          <div className="mb-4 text-xs text-gray-500 flex flex-wrap items-center gap-2">
            <span>
              Last 30 days: <span className="font-medium text-gray-700">${spend.total_usd.toFixed(2)}</span> across {spend.runs} run{spend.runs === 1 ? '' : 's'}
            </span>
            {spend.cap_reached > 0 && (
              <span className="text-yellow-700">· {spend.cap_reached} cap-stopped</span>
            )}
            {spend.failed > 0 && (
              <span className="text-red-700">· {spend.failed} failed</span>
            )}
            {Object.keys(spend.breakdown).length > 0 && (
              <span className="flex flex-wrap gap-1 ml-1">
                {Object.entries(spend.breakdown)
                  .sort((a, b) => b[1] - a[1])
                  .map(([k, v]) => (
                    <CostChip key={k} provider={k} usd={v} />
                  ))}
              </span>
            )}
          </div>
        )}

        {(runResult || runError) && (
          <div
            className={`mb-6 p-4 rounded-md border text-sm ${
              runError
                ? 'bg-red-50 border-red-200 text-red-800'
                : runResult?.status === 'cap_reached'
                  ? 'bg-yellow-50 border-yellow-200 text-yellow-900'
                  : 'bg-green-50 border-green-200 text-green-900'
            }`}
          >
            {runError ? (
              <>Run failed: {runError}</>
            ) : runResult ? (
              <>
                <div className="font-medium">
                  {runResult.status === 'cap_reached'
                    ? '⚠ Budget cap reached'
                    : runResult.status === 'failed'
                      ? 'Run completed with errors'
                      : 'Run completed'}
                </div>
                <div className="mt-1">
                  {runResult.leadsNew} new lead{runResult.leadsNew === 1 ? '' : 's'}{' '}
                  ({runResult.leadsFound} candidates) · spent $
                  {runResult.costUsd.toFixed(4)}
                  {runResult.errors.length > 0 &&
                    ` · ${runResult.errors.length} error${runResult.errors.length === 1 ? '' : 's'}`}
                </div>
                {runResult.costBreakdown &&
                  Object.keys(runResult.costBreakdown).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {Object.entries(runResult.costBreakdown).map(([k, v]) => (
                        <CostChip key={k} provider={k} usd={v} />
                      ))}
                    </div>
                  )}
              </>
            ) : null}
          </div>
        )}

        <div className="mb-6 flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search title, summary, organization…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className={`${SELECT_CLS} w-80`}
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as LeadCategory | '')}
            className={SELECT_CLS}
          >
            <option value="">All categories</option>
            {LEAD_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {LEAD_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value as LeadRegion | '')}
            className={SELECT_CLS}
          >
            <option value="">All regions</option>
            {LEAD_REGIONS.map((r) => (
              <option key={r} value={r}>
                {LEAD_REGION_LABELS[r]}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as LeadStatus | '')}
            className={SELECT_CLS}
          >
            <option value="">All statuses</option>
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {(category || region || status || q) && (
            <button
              onClick={() => {
                setCategory('')
                setRegion('')
                setStatus('')
                setQ('')
              }}
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              Clear
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-sm text-gray-500">Loading…</div>
        ) : leads.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-lg p-12 text-center">
            <h3 className="text-base font-medium mb-1">No leads yet</h3>
            <p className="text-sm text-gray-600 max-w-md mx-auto mb-4">
              Configure sources and query templates, then click "Run now" to discover
              your first opportunities.
            </p>
            <Link href="/admin/leads/sources" className="btn-secondary">
              Set up sources
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600 mb-2">
              {total} lead{total === 1 ? '' : 's'} {total > leads.length && `(showing ${leads.length})`}
            </p>
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-3 w-16">Score</th>
                    <th className="text-left px-4 py-3">Lead</th>
                    <th className="text-left px-4 py-3">Category</th>
                    <th className="text-left px-4 py-3">Region</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {leads.map((l) => (
                    <tr key={l.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <ScoreBadge score={l.score} />
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/leads/${l.id}`}
                          className="font-medium text-gray-900 hover:underline"
                        >
                          {l.title}
                        </Link>
                        {l.organization && (
                          <div className="text-xs text-gray-500">{l.organization}</div>
                        )}
                        {l.summary_en && (
                          <div className="text-xs text-gray-600 mt-1 line-clamp-2 max-w-2xl">
                            {l.summary_en}
                          </div>
                        )}
                        <a
                          href={l.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-blue-600 hover:underline"
                        >
                          source ↗
                        </a>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {LEAD_CATEGORY_LABELS[l.category]}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {LEAD_REGION_LABELS[l.region]}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">
                          {l.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {new Date(l.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  )
}

function CostChip({ provider, usd }: { provider: string; usd: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
      <span className="font-medium">{provider}</span>
      <span className="text-gray-500">${usd.toFixed(4)}</span>
    </span>
  )
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-gray-400 text-xs">—</span>
  const color =
    score >= 80
      ? 'bg-green-100 text-green-800'
      : score >= 50
        ? 'bg-blue-100 text-blue-800'
        : 'bg-gray-100 text-gray-700'
  return (
    <span className={`text-xs font-medium px-2 py-1 rounded ${color}`}>{score}</span>
  )
}
