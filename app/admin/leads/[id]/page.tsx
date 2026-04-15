'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { PageHeader } from '@/components/admin/PageHeader'
import {
  LEAD_CATEGORY_LABELS,
  LEAD_REGION_LABELS,
  LEAD_STATUSES,
  LeadCategory,
  LeadRegion,
  LeadStatus,
} from '@/lib/leads/types'
import {
  INTRO_TONES,
  INTRO_TONE_LABELS,
  IntroTone,
  IntroLanguage,
} from '@/lib/leads/draft-message'

interface Lead {
  id: string
  created_at: string
  updated_at: string
  status: LeadStatus
  category: LeadCategory
  region: LeadRegion
  language: string
  title: string
  summary_en: string | null
  summary_ja: string | null
  deep_brief_md: string | null
  source_url: string
  source_type: string
  score: number | null
  organization: string | null
  contact_name: string | null
  contact_role: string | null
  contact_email: string | null
  contact_phone: string | null
  notes: string | null
  dismissed_reason: string | null
}

const INPUT_CLS =
  'w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black'

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id as string
  const router = useRouter()

  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingField, setSavingField] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch(`/api/admin/leads/${id}`)
    const j = await r.json()
    if (j.success) setLead(j.data)
    setLoading(false)
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const patch = async (changes: Partial<Lead>, fieldKey: string) => {
    setSavingField(fieldKey)
    const r = await fetch(`/api/admin/leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(changes),
    })
    const j = await r.json()
    setSavingField(null)
    if (j.success) setLead(j.data)
  }

  if (loading) {
    return (
      <>
        <PageHeader title="Lead" breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Leads', href: '/admin/leads' }, { label: '…' }]} />
        <div className="p-8 text-sm text-gray-500">Loading…</div>
      </>
    )
  }
  if (!lead) {
    return (
      <>
        <PageHeader title="Not found" breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Leads', href: '/admin/leads' }, { label: 'Not found' }]} />
        <div className="p-8 text-sm text-gray-500">
          Lead not found. <Link href="/admin/leads" className="underline">Back to leads</Link>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title={lead.title}
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Leads', href: '/admin/leads' },
          { label: truncate(lead.title, 60) },
        ]}
        actions={
          <button
            onClick={() => router.push('/admin/leads')}
            className="btn-secondary"
          >
            Back
          </button>
        }
      />

      <div className="p-8 grid grid-cols-3 gap-6 max-w-7xl">
        {/* Left column: brief + intro drafter */}
        <div className="col-span-2 space-y-6">
          <Card>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ScoreBadge score={lead.score} />
                <CategoryPill category={lead.category} />
                <RegionPill region={lead.region} />
                <span className="text-xs uppercase text-gray-500">{lead.source_type}</span>
              </div>
              <a
                href={lead.source_url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-600 hover:underline truncate max-w-xs"
                title={lead.source_url}
              >
                Open source ↗
              </a>
            </div>
            {lead.summary_en && (
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{lead.summary_en}</p>
            )}
          </Card>

          {lead.deep_brief_md && (
            <Card title="Deep research brief">
              <div className="prose prose-sm max-w-none whitespace-pre-wrap text-gray-800">
                {lead.deep_brief_md}
              </div>
            </Card>
          )}

          <DrafterCard leadId={lead.id} />
        </div>

        {/* Right column: status, contact, notes */}
        <div className="col-span-1 space-y-6">
          <Card title="Status">
            <select
              value={lead.status}
              onChange={(e) => patch({ status: e.target.value as LeadStatus }, 'status')}
              className={INPUT_CLS}
              disabled={savingField === 'status'}
            >
              {LEAD_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            {lead.status === 'dismissed' && (
              <input
                type="text"
                placeholder="Dismissed reason (optional)"
                value={lead.dismissed_reason || ''}
                onChange={(e) =>
                  setLead({ ...lead, dismissed_reason: e.target.value })
                }
                onBlur={() =>
                  patch(
                    { dismissed_reason: lead.dismissed_reason || null },
                    'dismissed_reason'
                  )
                }
                className={`${INPUT_CLS} mt-2`}
              />
            )}
          </Card>

          <Card title="Contact">
            <ContactField
              label="Name"
              value={lead.contact_name}
              onSave={(v) => patch({ contact_name: v }, 'contact_name')}
              saving={savingField === 'contact_name'}
            />
            <ContactField
              label="Role"
              value={lead.contact_role}
              onSave={(v) => patch({ contact_role: v }, 'contact_role')}
              saving={savingField === 'contact_role'}
            />
            <ContactField
              label="Organization"
              value={lead.organization}
              onSave={(v) => patch({ organization: v }, 'organization')}
              saving={savingField === 'organization'}
            />
            <ContactField
              label="Email"
              type="email"
              value={lead.contact_email}
              onSave={(v) => patch({ contact_email: v }, 'contact_email')}
              saving={savingField === 'contact_email'}
            />
            <ContactField
              label="Phone"
              value={lead.contact_phone}
              onSave={(v) => patch({ contact_phone: v }, 'contact_phone')}
              saving={savingField === 'contact_phone'}
            />
          </Card>

          <Card title="Notes">
            <textarea
              rows={6}
              value={lead.notes || ''}
              onChange={(e) => setLead({ ...lead, notes: e.target.value })}
              onBlur={() => patch({ notes: lead.notes || null }, 'notes')}
              className={INPUT_CLS}
              placeholder="Internal notes…"
            />
            {savingField === 'notes' && (
              <p className="text-xs text-gray-400 mt-1">Saving…</p>
            )}
          </Card>

          <Card title="Meta">
            <dl className="text-xs text-gray-600 space-y-1">
              <MetaRow k="Discovered" v={new Date(lead.created_at).toLocaleString()} />
              <MetaRow k="Updated" v={new Date(lead.updated_at).toLocaleString()} />
              <MetaRow k="Category" v={LEAD_CATEGORY_LABELS[lead.category]} />
              <MetaRow k="Region" v={LEAD_REGION_LABELS[lead.region]} />
              <MetaRow k="Lang" v={lead.language.toUpperCase()} />
            </dl>
          </Card>
        </div>
      </div>
    </>
  )
}

// ---------------------------------------------------------------
// Drafter
// ---------------------------------------------------------------

function DrafterCard({ leadId }: { leadId: string }) {
  const [tone, setTone] = useState<IntroTone>('formal_museum')
  const [language, setLanguage] = useState<IntroLanguage>('en')
  const [senderName, setSenderName] = useState('')
  const [senderTitle, setSenderTitle] = useState('')

  const [drafting, setDrafting] = useState(false)
  const [draftError, setDraftError] = useState<string | null>(null)

  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')

  const [to, setTo] = useState('')
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<string | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const generate = async (lang: IntroLanguage) => {
    setDrafting(true)
    setDraftError(null)
    setSendResult(null)
    setLanguage(lang)
    try {
      const r = await fetch(`/api/admin/leads/${leadId}/draft-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tone,
          language: lang,
          sender_name: senderName.trim() || undefined,
          sender_title: senderTitle.trim() || undefined,
        }),
      })
      const j = await r.json()
      if (!j.success) {
        setDraftError(j.error?.message || 'Draft failed')
      } else {
        setSubject(j.data.subject)
        setBody(j.data.body)
      }
    } finally {
      setDrafting(false)
    }
  }

  const copy = async () => {
    await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const send = async () => {
    setSending(true)
    setSendError(null)
    setSendResult(null)
    try {
      const r = await fetch(`/api/admin/leads/${leadId}/send-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, body }),
      })
      const j = await r.json()
      if (!j.success) {
        setSendError(j.error?.message || 'Send failed')
      } else {
        setSendResult('Sent.')
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <Card title="Intro message">
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Tone</label>
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value as IntroTone)}
            className={INPUT_CLS}
          >
            {INTRO_TONES.map((t) => (
              <option key={t} value={t}>
                {INTRO_TONE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Sender name</label>
          <input
            type="text"
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
            placeholder="(uses your admin email by default)"
            className={INPUT_CLS}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Sender title (optional)</label>
          <input
            type="text"
            value={senderTitle}
            onChange={(e) => setSenderTitle(e.target.value)}
            placeholder="e.g. Director, Kwame Brathwaite Archive"
            className={INPUT_CLS}
          />
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <button
            onClick={() => generate('en')}
            disabled={drafting}
            className="btn-primary disabled:opacity-50"
          >
            {drafting && language === 'en' ? 'Drafting…' : 'Generate (EN)'}
          </button>
          <button
            onClick={() => generate('fr')}
            disabled={drafting}
            className="btn-secondary disabled:opacity-50"
          >
            {drafting && language === 'fr' ? 'Translating…' : 'Translate to FR'}
          </button>
          <button
            onClick={() => generate('ja')}
            disabled={drafting}
            className="btn-secondary disabled:opacity-50"
          >
            {drafting && language === 'ja' ? 'Translating…' : 'Translate to JA'}
          </button>
        </div>
      </div>

      {draftError && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded mb-3">{draftError}</div>
      )}

      {(subject || body) && (
        <>
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className={INPUT_CLS}
            />
          </div>
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">Body</label>
            <textarea
              rows={12}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className={INPUT_CLS}
            />
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[240px]">
              <label className="block text-xs font-medium text-gray-600 mb-1">Send to</label>
              <input
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="recipient@example.com"
                className={INPUT_CLS}
              />
            </div>
            <button onClick={copy} className="btn-secondary">
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              onClick={send}
              disabled={sending || !to || !subject || !body}
              className="btn-primary disabled:opacity-50"
            >
              {sending ? 'Sending…' : 'Send via Resend'}
            </button>
          </div>

          {sendError && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded mt-3">{sendError}</div>
          )}
          {sendResult && (
            <div className="text-sm text-green-700 bg-green-50 p-2 rounded mt-3">{sendResult}</div>
          )}
        </>
      )}
    </Card>
  )
}

// ---------------------------------------------------------------
// Small UI helpers
// ---------------------------------------------------------------

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      {title && <h3 className="text-sm font-semibold text-gray-800 mb-3">{title}</h3>}
      {children}
    </div>
  )
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return null
  const color =
    score >= 80
      ? 'bg-green-100 text-green-800'
      : score >= 50
        ? 'bg-blue-100 text-blue-800'
        : 'bg-gray-100 text-gray-700'
  return <span className={`text-xs font-medium px-2 py-1 rounded ${color}`}>{score}</span>
}

function CategoryPill({ category }: { category: LeadCategory }) {
  return (
    <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">
      {LEAD_CATEGORY_LABELS[category]}
    </span>
  )
}

function RegionPill({ region }: { region: LeadRegion }) {
  return (
    <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">
      {LEAD_REGION_LABELS[region]}
    </span>
  )
}

function MetaRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-gray-500">{k}</dt>
      <dd className="text-gray-800 text-right">{v}</dd>
    </div>
  )
}

function ContactField({
  label,
  value,
  onSave,
  type = 'text',
  saving,
}: {
  label: string
  value: string | null
  onSave: (v: string | null) => void
  type?: string
  saving?: boolean
}) {
  const [v, setV] = useState(value || '')
  useEffect(() => {
    setV(value || '')
  }, [value])
  return (
    <div className="mb-2">
      <label className="block text-xs text-gray-500 mb-1">
        {label}
        {saving && <span className="ml-1 text-gray-400">(saving…)</span>}
      </label>
      <input
        type={type}
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => {
          if ((value || '') !== v) onSave(v.trim() || null)
        }}
        className={INPUT_CLS}
      />
    </div>
  )
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s
}
