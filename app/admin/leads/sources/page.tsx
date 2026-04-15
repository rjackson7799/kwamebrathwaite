'use client'

import { useState, useEffect, useCallback } from 'react'
import { PageHeader } from '@/components/admin/PageHeader'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import {
  LeadSource,
  LeadQueryTemplate,
  LeadSettings,
  DEFAULT_LEAD_SETTINGS,
  LEAD_CATEGORIES,
  LEAD_CATEGORY_LABELS,
  LEAD_REGIONS,
  LEAD_REGION_LABELS,
  LEAD_SOURCE_KINDS,
  LeadSourceKind,
  LeadCategory,
  LeadRegion,
} from '@/lib/leads/types'

const SOURCE_KIND_LABELS: Record<LeadSourceKind, string> = {
  rss: 'RSS feed',
  website: 'Website',
  social: 'Social account',
  alerts_inbox: 'Google Alerts inbox',
}

type Tab = 'sources' | 'queries' | 'settings'

const INPUT_CLS =
  'w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent'
const SELECT_CLS = INPUT_CLS

export default function LeadSourcesPage() {
  const [tab, setTab] = useState<Tab>('sources')

  return (
    <>
      <PageHeader
        title="Lead Sources"
        description="Curated sites, search query templates, and run settings for the AI sweep."
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Leads', href: '/admin/leads' },
          { label: 'Sources' },
        ]}
      />

      <div className="px-8 pt-6">
        <div className="flex gap-1 border-b border-gray-200">
          <TabButton active={tab === 'sources'} onClick={() => setTab('sources')}>
            Sources
          </TabButton>
          <TabButton active={tab === 'queries'} onClick={() => setTab('queries')}>
            Query templates
          </TabButton>
          <TabButton active={tab === 'settings'} onClick={() => setTab('settings')}>
            Settings
          </TabButton>
        </div>
      </div>

      <div className="p-8">
        {tab === 'sources' && <SourcesSection />}
        {tab === 'queries' && <QueriesSection />}
        {tab === 'settings' && <SettingsSection />}
      </div>
    </>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
        active
          ? 'border-black text-black'
          : 'border-transparent text-gray-500 hover:text-gray-800'
      }`}
    >
      {children}
    </button>
  )
}

// -------------------------------------------------------------------
// Sources
// -------------------------------------------------------------------

function SourcesSection() {
  const [sources, setSources] = useState<LeadSource[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<LeadSource | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<LeadSource | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/admin/leads/sources')
    const j = await r.json()
    if (j.success) setSources(j.data)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    await fetch(`/api/admin/leads/sources/${deleteTarget.id}`, { method: 'DELETE' })
    setDeleting(false)
    setDeleteTarget(null)
    load()
  }

  const toggleActive = async (s: LeadSource) => {
    await fetch(`/api/admin/leads/sources/${s.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !s.active }),
    })
    load()
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-600">
          {sources.length} source{sources.length === 1 ? '' : 's'} configured
        </p>
        <button
          onClick={() => {
            setEditing(null)
            setShowForm(true)
          }}
          className="btn-primary"
        >
          Add source
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Loading…</div>
      ) : sources.length === 0 ? (
        <EmptyState
          title="No sources yet"
          description="Add curated RSS feeds, websites, social accounts, or your Google Alerts forwarding inbox."
        />
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Source</th>
                <th className="text-left px-4 py-3">Kind</th>
                <th className="text-left px-4 py-3">Category</th>
                <th className="text-left px-4 py-3">Region</th>
                <th className="text-left px-4 py-3">Active</th>
                <th className="text-right px-4 py-3 w-32">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sources.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{s.label || s.url_or_handle}</div>
                    {s.label && (
                      <div className="text-xs text-gray-500 truncate max-w-md">
                        {s.url_or_handle}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {SOURCE_KIND_LABELS[s.kind]}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {s.category_hint ? LEAD_CATEGORY_LABELS[s.category_hint] : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {LEAD_REGION_LABELS[s.region]}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(s)}
                      className={`text-xs px-2 py-1 rounded ${
                        s.active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {s.active ? 'Active' : 'Paused'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right space-x-3">
                    <button
                      onClick={() => {
                        setEditing(s)
                        setShowForm(true)
                      }}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteTarget(s)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <SourceFormModal
          source={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false)
            load()
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete source"
        description={`Remove "${deleteTarget?.label || deleteTarget?.url_or_handle}"? Existing leads from this source will not be deleted.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
      />
    </div>
  )
}

function SourceFormModal({
  source,
  onClose,
  onSaved,
}: {
  source: LeadSource | null
  onClose: () => void
  onSaved: () => void
}) {
  const [kind, setKind] = useState<LeadSourceKind>(source?.kind ?? 'website')
  const [urlOrHandle, setUrlOrHandle] = useState(source?.url_or_handle ?? '')
  const [label, setLabel] = useState(source?.label ?? '')
  const [categoryHint, setCategoryHint] = useState<LeadCategory | ''>(
    source?.category_hint ?? ''
  )
  const [region, setRegion] = useState<LeadRegion>(source?.region ?? 'other')
  const [language, setLanguage] = useState(source?.language ?? 'en')
  const [active, setActive] = useState(source?.active ?? true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const payload = {
      kind,
      url_or_handle: urlOrHandle.trim(),
      label: label.trim() || null,
      category_hint: categoryHint || null,
      region,
      language: language.trim() || null,
      active,
    }
    const url = source
      ? `/api/admin/leads/sources/${source.id}`
      : '/api/admin/leads/sources'
    const r = await fetch(url, {
      method: source ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const j = await r.json()
    setSaving(false)
    if (!j.success) {
      setError(j.error?.message || 'Failed to save')
      return
    }
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <form onSubmit={submit}>
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium">
              {source ? 'Edit source' : 'Add source'}
            </h3>
          </div>
          <div className="p-6 space-y-4">
            <Field label="Kind">
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as LeadSourceKind)}
                className={SELECT_CLS}
              >
                {LEAD_SOURCE_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {SOURCE_KIND_LABELS[k]}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label={
                kind === 'alerts_inbox'
                  ? 'Inbox email'
                  : kind === 'social'
                    ? 'Handle or profile URL'
                    : 'URL'
              }
            >
              <input
                type="text"
                value={urlOrHandle}
                onChange={(e) => setUrlOrHandle(e.target.value)}
                required
                className={INPUT_CLS}
                placeholder={
                  kind === 'rss'
                    ? 'https://example.com/feed.xml'
                    : kind === 'social'
                      ? '@handle or https://instagram.com/handle'
                      : kind === 'alerts_inbox'
                        ? 'alerts@kwamebrathwaite.com'
                        : 'https://example.com'
                }
              />
            </Field>

            <Field label="Label (optional)">
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className={INPUT_CLS}
                placeholder="Aperture Magazine"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Category hint">
                <select
                  value={categoryHint}
                  onChange={(e) => setCategoryHint(e.target.value as LeadCategory | '')}
                  className={SELECT_CLS}
                >
                  <option value="">— Any —</option>
                  {LEAD_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {LEAD_CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Region">
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value as LeadRegion)}
                  className={SELECT_CLS}
                >
                  {LEAD_REGIONS.map((r) => (
                    <option key={r} value={r}>
                      {LEAD_REGION_LABELS[r]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Language">
              <input
                type="text"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className={INPUT_CLS}
                placeholder="en"
                maxLength={5}
              />
            </Field>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
              Active
            </label>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>
            )}
          </div>
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : source ? 'Save' : 'Add source'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// -------------------------------------------------------------------
// Query templates
// -------------------------------------------------------------------

function QueriesSection() {
  const [items, setItems] = useState<LeadQueryTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<LeadQueryTemplate | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<LeadQueryTemplate | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/admin/leads/query-templates')
    const j = await r.json()
    if (j.success) setItems(j.data)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    await fetch(`/api/admin/leads/query-templates/${deleteTarget.id}`, {
      method: 'DELETE',
    })
    setDeleting(false)
    setDeleteTarget(null)
    load()
  }

  const toggleActive = async (t: LeadQueryTemplate) => {
    await fetch(`/api/admin/leads/query-templates/${t.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !t.active }),
    })
    load()
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-600">
          {items.length} query template{items.length === 1 ? '' : 's'} configured
        </p>
        <button
          onClick={() => {
            setEditing(null)
            setShowForm(true)
          }}
          className="btn-primary"
        >
          Add query
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Loading…</div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No query templates yet"
          description="Add search queries grouped by category, region, and language. Each will run during the weekly sweep."
        />
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Query</th>
                <th className="text-left px-4 py-3">Category</th>
                <th className="text-left px-4 py-3">Region</th>
                <th className="text-left px-4 py-3">Lang</th>
                <th className="text-left px-4 py-3">Active</th>
                <th className="text-right px-4 py-3 w-32">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{t.label || t.query_text}</div>
                    {t.label && (
                      <div className="text-xs text-gray-500 truncate max-w-md">
                        {t.query_text}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {LEAD_CATEGORY_LABELS[t.category]}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {LEAD_REGION_LABELS[t.region]}
                  </td>
                  <td className="px-4 py-3 text-gray-600 uppercase">{t.language}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(t)}
                      className={`text-xs px-2 py-1 rounded ${
                        t.active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {t.active ? 'Active' : 'Paused'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right space-x-3">
                    <button
                      onClick={() => {
                        setEditing(t)
                        setShowForm(true)
                      }}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteTarget(t)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <QueryFormModal
          template={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false)
            load()
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete query template"
        description={`Remove "${deleteTarget?.label || deleteTarget?.query_text}"?`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
      />
    </div>
  )
}

function QueryFormModal({
  template,
  onClose,
  onSaved,
}: {
  template: LeadQueryTemplate | null
  onClose: () => void
  onSaved: () => void
}) {
  const [category, setCategory] = useState<LeadCategory>(template?.category ?? 'press')
  const [region, setRegion] = useState<LeadRegion>(template?.region ?? 'us')
  const [language, setLanguage] = useState(template?.language ?? 'en')
  const [queryText, setQueryText] = useState(template?.query_text ?? '')
  const [label, setLabel] = useState(template?.label ?? '')
  const [active, setActive] = useState(template?.active ?? true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const payload = {
      category,
      region,
      language: language.trim(),
      query_text: queryText.trim(),
      label: label.trim() || null,
      active,
    }
    const url = template
      ? `/api/admin/leads/query-templates/${template.id}`
      : '/api/admin/leads/query-templates'
    const r = await fetch(url, {
      method: template ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const j = await r.json()
    setSaving(false)
    if (!j.success) {
      setError(j.error?.message || 'Failed to save')
      return
    }
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <form onSubmit={submit}>
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium">
              {template ? 'Edit query template' : 'Add query template'}
            </h3>
          </div>
          <div className="p-6 space-y-4">
            <Field label="Query text">
              <textarea
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                required
                rows={3}
                className={INPUT_CLS}
                placeholder='e.g. "Black photography exhibitions opening 2026"'
              />
            </Field>

            <Field label="Label (optional)">
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className={INPUT_CLS}
                placeholder="US press — Black photo history"
              />
            </Field>

            <div className="grid grid-cols-3 gap-4">
              <Field label="Category">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as LeadCategory)}
                  className={SELECT_CLS}
                >
                  {LEAD_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {LEAD_CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Region">
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value as LeadRegion)}
                  className={SELECT_CLS}
                >
                  {LEAD_REGIONS.map((r) => (
                    <option key={r} value={r}>
                      {LEAD_REGION_LABELS[r]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Language">
                <input
                  type="text"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className={INPUT_CLS}
                  maxLength={5}
                />
              </Field>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
              Active
            </label>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>
            )}
          </div>
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : template ? 'Save' : 'Add query'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// -------------------------------------------------------------------
// Settings
// -------------------------------------------------------------------

function SettingsSection() {
  const [settings, setSettings] = useState<LeadSettings>(DEFAULT_LEAD_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/leads/settings')
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setSettings(j.data)
        setLoading(false)
      })
  }, [])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const r = await fetch('/api/admin/leads/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    const j = await r.json()
    setSaving(false)
    if (!j.success) {
      setError(j.error?.message || 'Failed to save')
      return
    }
    setSettings(j.data)
    setSavedAt(Date.now())
  }

  if (loading) return <div className="text-sm text-gray-500">Loading…</div>

  return (
    <form onSubmit={save} className="max-w-xl space-y-6">
      <Field
        label="Per-run budget cap (USD)"
        hint="Hard ceiling on paid API spend per sweep. The job stops if exceeded."
      >
        <input
          type="number"
          step="0.5"
          min="0"
          value={settings.budget_cap_usd}
          onChange={(e) =>
            setSettings({ ...settings, budget_cap_usd: Number(e.target.value) })
          }
          className={`${INPUT_CLS} w-32`}
        />
      </Field>

      <Field
        label="Digest recipient email"
        hint="Where the weekly summary email is sent."
      >
        <input
          type="email"
          value={settings.digest_recipient}
          onChange={(e) =>
            setSettings({ ...settings, digest_recipient: e.target.value })
          }
          className={INPUT_CLS}
          placeholder="admin@kwamebrathwaite.com"
        />
      </Field>

      <Field
        label="Top N leads per category"
        hint="How many top-scored leads to include in the digest per category."
      >
        <input
          type="number"
          min="1"
          max="50"
          value={settings.top_n_per_category}
          onChange={(e) =>
            setSettings({
              ...settings,
              top_n_per_category: Number(e.target.value),
            })
          }
          className={`${INPUT_CLS} w-32`}
        />
      </Field>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={settings.deep_research_enabled}
          onChange={(e) =>
            setSettings({ ...settings, deep_research_enabled: e.target.checked })
          }
          className="mt-0.5"
        />
        <span>
          <span className="font-medium">Enable deep research pass</span>
          <span className="block text-xs text-gray-500">
            Run Perplexity Deep Research on top candidates for richer briefs and contact
            enrichment. Disable to keep costs minimal.
          </span>
        </span>
      </label>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>
      )}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : 'Save settings'}
        </button>
        {savedAt && !saving && (
          <span className="text-xs text-green-700">Saved.</span>
        )}
      </div>
    </form>
  )
}

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  )
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-white border border-dashed border-gray-300 rounded-lg p-12 text-center">
      <h3 className="text-base font-medium mb-1">{title}</h3>
      <p className="text-sm text-gray-600 max-w-md mx-auto">{description}</p>
    </div>
  )
}
