'use client'

import { useState, useEffect, useCallback } from 'react'
import { PageHeader } from '@/components/admin/PageHeader'

type AggregateRow = {
  path: string
  hit_count: number
  last_seen: string
  first_seen: string
  referrer_count: number
  top_referrer: string | null
}

type RawRow = {
  id: string
  path: string
  referrer: string | null
  user_agent: string | null
  locale: string | null
  country: string | null
  created_at: string
}

type View = 'aggregate' | 'raw'
type DayRange = 7 | 30 | 90

export default function BrokenLinksPage() {
  const [view, setView] = useState<View>('aggregate')
  const [days, setDays] = useState<DayRange>(30)
  const [pathFilter, setPathFilter] = useState<string | null>(null)
  const [aggregate, setAggregate] = useState<AggregateRow[]>([])
  const [raw, setRaw] = useState<RawRow[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedPath, setCopiedPath] = useState<string | null>(null)
  const [pruning, setPruning] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('view', view)
      params.set('days', String(days))
      if (view === 'raw' && pathFilter) params.set('path', pathFilter)

      const res = await fetch(`/api/admin/broken-links?${params}`)
      const json = await res.json()

      if (json.success) {
        if (view === 'aggregate') {
          setAggregate(json.data || [])
        } else {
          setRaw(json.data || [])
        }
      }
    } catch (err) {
      console.error('Failed to fetch broken links:', err)
    } finally {
      setLoading(false)
    }
  }, [view, days, pathFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const showToast = (message: string) => {
    setToast(message)
    setTimeout(() => setToast(null), 2500)
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  const formatRelative = (iso: string) => {
    const ms = Date.now() - new Date(iso).getTime()
    const minutes = Math.floor(ms / 60_000)
    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const d = Math.floor(hours / 24)
    return `${d}d ago`
  }

  const buildRedirectSnippet = (path: string) => {
    const escaped = path.replace(/'/g, "\\'")
    return `  {\n    source: '${escaped}',\n    destination: '/', // TODO: replace with the correct new URL\n    permanent: true,\n  },`
  }

  const copyRedirect = async (path: string) => {
    try {
      await navigator.clipboard.writeText(buildRedirectSnippet(path))
      setCopiedPath(path)
      setTimeout(() => setCopiedPath(null), 2000)
      showToast('Redirect snippet copied. Paste into next.config.mjs redirects() array.')
    } catch {
      showToast('Failed to copy to clipboard')
    }
  }

  const dismiss = async (path: string) => {
    if (!confirm(`Hide "${path}" from the list? You can re-enable it later by clearing dismissed paths in the database.`)) {
      return
    }
    try {
      const res = await fetch('/api/admin/broken-links/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      })
      const json = await res.json()
      if (json.success) {
        showToast(`Dismissed: ${path}`)
        fetchData()
      } else {
        showToast('Failed to dismiss')
      }
    } catch {
      showToast('Failed to dismiss')
    }
  }

  const viewRawForPath = (path: string) => {
    setPathFilter(path)
    setView('raw')
  }

  const clearPathFilter = () => {
    setPathFilter(null)
  }

  const prune = async () => {
    if (!confirm('Delete log records older than 90 days? This cannot be undone.')) {
      return
    }
    setPruning(true)
    try {
      const res = await fetch('/api/admin/broken-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'prune', daysToKeep: 90 }),
      })
      const json = await res.json()
      if (json.success) {
        showToast(`Deleted ${json.data.deleted} old record(s)`)
        fetchData()
      } else {
        showToast('Prune failed')
      }
    } catch {
      showToast('Prune failed')
    } finally {
      setPruning(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Broken Links"
        description="Monitor 404 hits from legacy inbound links and plan targeted redirects."
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'Broken Links' },
        ]}
        actions={
          <button
            onClick={prune}
            disabled={pruning}
            className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            {pruning ? 'Pruning…' : 'Clear 90+ day records'}
          </button>
        }
      />

      <div className="p-8">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          {/* View toggle */}
          <div className="inline-flex rounded-md border border-gray-300 bg-white p-1">
            <button
              onClick={() => {
                setView('aggregate')
                setPathFilter(null)
              }}
              className={`px-3 py-1.5 text-sm rounded ${
                view === 'aggregate'
                  ? 'bg-black text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Aggregate
            </button>
            <button
              onClick={() => setView('raw')}
              className={`px-3 py-1.5 text-sm rounded ${
                view === 'raw'
                  ? 'bg-black text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Raw Log
            </button>
          </div>

          {/* Days */}
          <div className="inline-flex rounded-md border border-gray-300 bg-white p-1">
            {([7, 30, 90] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 text-sm rounded ${
                  days === d
                    ? 'bg-black text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {d} days
              </button>
            ))}
          </div>

          {/* Path filter chip (only in raw view) */}
          {view === 'raw' && pathFilter && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-md text-sm">
              <span className="text-gray-600">Path:</span>
              <code className="text-blue-900">{pathFilter}</code>
              <button
                onClick={clearPathFilter}
                className="text-blue-700 hover:text-blue-900"
                aria-label="Clear path filter"
              >
                ×
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center text-gray-500">
            Loading…
          </div>
        ) : view === 'aggregate' ? (
          <AggregateTable
            rows={aggregate}
            onCopyRedirect={copyRedirect}
            onDismiss={dismiss}
            onViewRaw={viewRawForPath}
            copiedPath={copiedPath}
            formatRelative={formatRelative}
          />
        ) : (
          <RawTable rows={raw} formatDate={formatDate} />
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-4 py-3 rounded-md shadow-lg text-sm max-w-md">
          {toast}
        </div>
      )}
    </div>
  )
}

function AggregateTable({
  rows,
  onCopyRedirect,
  onDismiss,
  onViewRaw,
  copiedPath,
  formatRelative,
}: {
  rows: AggregateRow[]
  onCopyRedirect: (path: string) => void
  onDismiss: (path: string) => void
  onViewRaw: (path: string) => void
  copiedPath: string | null
  formatRelative: (iso: string) => string
}) {
  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <p className="text-gray-900 font-medium mb-2">No 404 hits yet</p>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          Once visitors hit broken legacy URLs, they&apos;ll show up here grouped by path.
          You can then copy a redirect snippet for each one and paste it into{' '}
          <code className="px-1 py-0.5 bg-gray-100 rounded text-xs">next.config.mjs</code>.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Path
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Hits
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Last seen
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Top referrer
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {rows.map((row) => (
            <tr key={row.path} className="hover:bg-gray-50">
              <td className="px-6 py-4">
                <code className="text-sm text-gray-900 break-all">{row.path}</code>
              </td>
              <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                {row.hit_count.toLocaleString()}
              </td>
              <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                {formatRelative(row.last_seen)}
              </td>
              <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                {row.top_referrer ? (
                  <span title={row.top_referrer}>{row.top_referrer}</span>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td>
              <td className="px-6 py-4 text-right whitespace-nowrap">
                <div className="inline-flex gap-2">
                  <button
                    onClick={() => onViewRaw(row.path)}
                    className="text-xs text-gray-600 hover:text-gray-900 underline"
                  >
                    Details
                  </button>
                  <button
                    onClick={() => onCopyRedirect(row.path)}
                    className="text-xs text-blue-600 hover:text-blue-800 underline"
                  >
                    {copiedPath === row.path ? 'Copied!' : 'Copy redirect'}
                  </button>
                  <button
                    onClick={() => onDismiss(row.path)}
                    className="text-xs text-gray-500 hover:text-red-600 underline"
                  >
                    Dismiss
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function RawTable({
  rows,
  formatDate,
}: {
  rows: RawRow[]
  formatDate: (iso: string) => string
}) {
  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center text-gray-500">
        No entries for the selected range.
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              When
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Path
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Referrer
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Locale
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Country
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              User agent
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-gray-50">
              <td className="px-6 py-3 text-sm text-gray-500 whitespace-nowrap">
                {formatDate(row.created_at)}
              </td>
              <td className="px-6 py-3">
                <code className="text-sm text-gray-900 break-all">{row.path}</code>
              </td>
              <td className="px-6 py-3 text-sm text-gray-500 max-w-xs truncate">
                {row.referrer ? (
                  <span title={row.referrer}>{row.referrer}</span>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td>
              <td className="px-6 py-3 text-sm text-gray-500">
                {row.locale || <span className="text-gray-400">—</span>}
              </td>
              <td className="px-6 py-3 text-sm text-gray-500">
                {row.country || <span className="text-gray-400">—</span>}
              </td>
              <td className="px-6 py-3 text-sm text-gray-500 max-w-xs truncate">
                {row.user_agent ? (
                  <span title={row.user_agent}>{row.user_agent}</span>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
