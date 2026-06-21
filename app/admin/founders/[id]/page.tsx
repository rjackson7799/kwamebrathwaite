'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/components/admin/PageHeader'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { PrintFulfillmentPanel } from '@/components/admin/PrintFulfillmentPanel'
import { FOUNDER_TERMS_VERSION } from '@/lib/founders/terms'

interface Founder {
  user_id: string
  email: string
  full_name: string
  recognition_name: string | null
  recognition_visibility: 'private' | 'public_opt_in'
  tier: string | null
  pledge_amount: number | null
  pledge_term_years: number | null
  pledge_fulfilled_amount: number
  status: 'invited' | 'active' | 'paused' | 'archived' | 'declined'
  phone: string | null
  organization: string | null
  relationship_owner_email: string | null
  preferred_locale: string
  internal_notes: string | null
  donation_amount: number | null
  donation_confirmed_at: string | null
  payment_reference: string | null
  terms_version: string | null
  terms_accepted_at: string | null
  activated_by: string | null
  invited_at: string
  last_invited_at: string | null
  activated_at: string | null
  last_login_at: string | null
  created_at: string
  updated_at: string
}

// Tier + pledge controls are retired for the flat-$10k special fundraiser
// (the DB columns are kept for possible future tiers), so they're omitted
// from the editable form to stop staff entering obsolete data.
type FormState = {
  full_name: string
  recognition_name: string
  recognition_visibility: 'private' | 'public_opt_in'
  status: 'invited' | 'active' | 'paused' | 'archived' | 'declined'
  phone: string
  organization: string
  relationship_owner_email: string
  preferred_locale: 'en' | 'fr' | 'ja'
  internal_notes: string
}

function toFormState(f: Founder): FormState {
  return {
    full_name: f.full_name ?? '',
    recognition_name: f.recognition_name ?? '',
    recognition_visibility: f.recognition_visibility ?? 'private',
    status: f.status,
    phone: f.phone ?? '',
    organization: f.organization ?? '',
    relationship_owner_email: f.relationship_owner_email ?? '',
    preferred_locale: (f.preferred_locale as 'en' | 'fr' | 'ja') ?? 'en',
    internal_notes: f.internal_notes ?? '',
  }
}

export default function AdminFounderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = String(params.id)

  const [founder, setFounder] = useState<Founder | null>(null)
  const [form, setForm] = useState<FormState | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resending, setResending] = useState(false)
  const [revoking, setRevoking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [revokeDialog, setRevokeDialog] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [activating, setActivating] = useState(false)
  const [donationRef, setDonationRef] = useState('')
  const [donationAmount, setDonationAmount] = useState('10000')
  const [copyingLink, setCopyingLink] = useState(false)
  const [revokingLinks, setRevokingLinks] = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [inviteLinkExpires, setInviteLinkExpires] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const fetchFounder = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/founders/${id}`)
      const json = await res.json()
      if (!json.success) {
        setError(json.error?.message || 'Founder not found')
        return
      }
      setFounder(json.data)
      setForm(toFormState(json.data))
    } catch {
      setError('Failed to load founder')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (id) fetchFounder()
  }, [id, fetchFounder])

  const handleSave = async () => {
    if (!form) return
    setSaving(true)
    try {
      // Marshal numeric/optional fields back to the API shape
      const body: Record<string, unknown> = {
        full_name: form.full_name,
        recognition_name: form.recognition_name || null,
        recognition_visibility: form.recognition_visibility,
        status: form.status,
        phone: form.phone || null,
        organization: form.organization || null,
        relationship_owner_email: form.relationship_owner_email || null,
        preferred_locale: form.preferred_locale,
        internal_notes: form.internal_notes || null,
      }
      const res = await fetch(`/api/admin/founders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (json.success) {
        setFounder(json.data)
        setForm(toFormState(json.data))
        setSavedAt(Date.now())
      } else {
        alert(json.error?.message || 'Failed to save changes')
      }
    } catch {
      alert('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const handleActivate = async () => {
    setActivating(true)
    try {
      const res = await fetch(`/api/admin/founders/${id}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          donation_amount: donationAmount === '' ? null : Number(donationAmount),
          payment_reference: donationRef || null,
          terms_version: FOUNDER_TERMS_VERSION,
        }),
      })
      const json = await res.json()
      if (json.success) {
        await fetchFounder()
      } else {
        alert(json.error?.message || 'Failed to activate founder')
      }
    } catch {
      alert('Failed to activate founder')
    } finally {
      setActivating(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/founders/${id}/delete`, { method: 'POST' })
      const json = await res.json()
      if (json.success) {
        router.push('/admin/founders')
        return
      }
      alert(json.error?.message || 'Failed to delete founder')
    } catch {
      alert('Failed to delete founder')
    }
    setDeleting(false)
  }

  const handleResendInvite = async () => {
    setResending(true)
    try {
      const res = await fetch(`/api/admin/founders/${id}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const json = await res.json()
      if (!json.success) {
        alert(json.error?.message || 'Failed to send invitation')
      } else {
        alert('Invitation email sent.')
      }
    } catch {
      alert('Failed to send invitation')
    } finally {
      setResending(false)
    }
  }

  const handleRevoke = async () => {
    setRevoking(true)
    try {
      const res = await fetch(`/api/admin/founders/${id}/revoke`, {
        method: 'POST',
      })
      const json = await res.json()
      if (json.success) {
        await fetchFounder()
      } else {
        alert(json.error?.message || 'Failed to revoke access')
      }
    } catch {
      alert('Failed to revoke access')
    } finally {
      setRevoking(false)
      setRevokeDialog(false)
    }
  }

  const showToast = (message: string) => {
    setToast(message)
    setTimeout(() => setToast(null), 2500)
  }

  // Mint a fresh durable link and copy it. Each call creates a NEW link (older
  // copies keep working until they expire or are revoked), so the admin can
  // safely re-generate when a previous paste is lost.
  const handleCopyLink = async () => {
    setCopyingLink(true)
    try {
      const res = await fetch(`/api/admin/founders/${id}/invite-link`, { method: 'POST' })
      const json = await res.json()
      if (!json.success) {
        showToast(json.error?.message || 'Failed to generate link')
        return
      }
      setInviteLink(json.data.link)
      setInviteLinkExpires(json.data.expires_at)
      try {
        await navigator.clipboard.writeText(json.data.link)
        showToast('Link copied. Paste it into your email to the founder.')
      } catch {
        showToast('Link generated — copy it from the box below.')
      }
    } catch {
      showToast('Failed to generate link')
    } finally {
      setCopyingLink(false)
    }
  }

  const copyExistingLink = async () => {
    if (!inviteLink) return
    try {
      await navigator.clipboard.writeText(inviteLink)
      showToast('Link copied.')
    } catch {
      showToast('Could not copy — select the link and copy manually.')
    }
  }

  const handleRevokeLinks = async () => {
    setRevokingLinks(true)
    try {
      const res = await fetch(`/api/admin/founders/${id}/invite-link`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.success) {
        showToast(json.error?.message || 'Failed to revoke links')
        return
      }
      setInviteLink(null)
      setInviteLinkExpires(null)
      const n = json.data.revoked as number
      showToast(`Revoked ${n} link${n === 1 ? '' : 's'}.`)
    } catch {
      showToast('Failed to revoke links')
    } finally {
      setRevokingLinks(false)
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader title="Founder" breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Founders', href: '/admin/founders' }, { label: 'Loading…' }]} />
        <div className="p-8">
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </>
    )
  }

  if (error || !founder || !form) {
    return (
      <>
        <PageHeader title="Founder" breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Founders', href: '/admin/founders' }, { label: 'Error' }]} />
        <div className="p-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-700 mb-4">{error || 'Founder not found'}</p>
            <button
              onClick={() => router.push('/admin/founders')}
              className="px-4 py-2 bg-black text-white text-sm font-medium rounded-md hover:bg-gray-800"
            >
              Back to Founders
            </button>
          </div>
        </div>
      </>
    )
  }

  const formatDate = (d: string | null) => {
    if (!d) return '—'
    return new Date(d).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const set = (k: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm((prev) => (prev ? { ...prev, [k]: e.target.value } : prev))

  return (
    <>
      <PageHeader
        title={founder.full_name}
        description={founder.email}
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Founders', href: '/admin/founders' },
          { label: founder.full_name },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={founder.status} />
            <button
              onClick={handleResendInvite}
              disabled={resending}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              {resending ? 'Sending…' : 'Resend invite'}
            </button>
            {(founder.status === 'invited' || founder.status === 'active') && (
              <button
                onClick={handleCopyLink}
                disabled={copyingLink}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                {copyingLink
                  ? 'Generating…'
                  : founder.status === 'invited'
                    ? 'Copy invite link'
                    : 'Copy sign-in link'}
              </button>
            )}
            {founder.status !== 'archived' && (
              <button
                onClick={() => setRevokeDialog(true)}
                className="px-3 py-1.5 text-sm border border-red-300 text-red-600 rounded-md hover:bg-red-50"
              >
                Revoke access
              </button>
            )}
            <button
              onClick={() => setDeleteDialog(true)}
              className="px-3 py-1.5 text-sm border border-red-400 text-red-700 rounded-md hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        }
      />

      <div className="p-8">
        <div className="max-w-4xl space-y-6">
          {/* Copyable durable link reveal — shown after "Copy invite/sign-in link".
              Lets the admin verify, re-copy, or revoke the link they're sending. */}
          {inviteLink && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-amber-900 uppercase tracking-wider mb-2">
                    {founder.status === 'invited' ? 'Invite link' : 'Sign-in link'} — paste into your email to the founder
                  </p>
                  <input
                    readOnly
                    value={inviteLink}
                    onFocus={(e) => e.currentTarget.select()}
                    className="w-full text-sm font-mono bg-white border border-amber-300 rounded px-2 py-1.5 text-gray-800"
                  />
                  {inviteLinkExpires && (
                    <p className="text-xs text-amber-800 mt-2">
                      Expires {formatDate(inviteLinkExpires)}. Anyone with this link can sign in as this founder until then — send it only to {founder.email}.
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button
                    onClick={copyExistingLink}
                    className="px-3 py-1.5 text-sm bg-black text-white rounded-md hover:bg-gray-800"
                  >
                    Copy
                  </button>
                  <button
                    onClick={handleRevokeLinks}
                    disabled={revokingLinks}
                    className="px-3 py-1.5 text-sm border border-red-300 text-red-600 rounded-md hover:bg-red-50 disabled:opacity-50"
                  >
                    {revokingLinks ? 'Revoking…' : 'Revoke all links'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Recognition & visibility */}
          <Card title="Recognition">
            <Field label="Full name">
              <input className="input" value={form.full_name} onChange={set('full_name')} />
            </Field>
            <Field label="Recognition name (how the name appears in the permanent record)">
              <input
                className="input"
                value={form.recognition_name}
                onChange={set('recognition_name')}
                placeholder={form.full_name}
              />
            </Field>
            <Field label="Recognition visibility (Phase 4 public Founders Wall)">
              <select className="input" value={form.recognition_visibility} onChange={set('recognition_visibility')}>
                <option value="private">Private — never shown publicly</option>
                <option value="public_opt_in">Public (opt-in)</option>
              </select>
            </Field>
          </Card>

          {/* Donation & status (flat $10k fundraiser — tier/pledge retired) */}
          <Card title="Donation & status">
            {founder.status === 'invited' ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-4 space-y-3">
                <p className="text-sm font-medium text-amber-900">
                  Confirm donation &amp; activate
                </p>
                <p className="text-xs text-amber-800">
                  Activating grants portal access. Do this only after the
                  donation is confirmed in Givebutter.
                  {founder.terms_accepted_at
                    ? ` Member accepted the terms (${FOUNDER_TERMS_VERSION}) on ${formatDate(founder.terms_accepted_at)}.`
                    : ' Member has not yet accepted the terms on the invitation page.'}
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Donation amount (USD)">
                    <input
                      className="input"
                      type="number"
                      min="0"
                      step="100"
                      value={donationAmount}
                      onChange={(e) => setDonationAmount(e.target.value)}
                    />
                  </Field>
                  <Field label="Payment reference (Givebutter)">
                    <input
                      className="input"
                      value={donationRef}
                      onChange={(e) => setDonationRef(e.target.value)}
                      placeholder="e.g. GB-XXXX"
                    />
                  </Field>
                </div>
                <button
                  onClick={handleActivate}
                  disabled={activating}
                  className="px-4 py-2 bg-emerald-700 text-white text-sm font-medium rounded-md hover:bg-emerald-800 disabled:opacity-50"
                >
                  {activating ? 'Activating…' : 'Confirm donation & activate'}
                </button>
              </div>
            ) : (
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <DLRow
                  label="Donation amount"
                  value={founder.donation_amount != null ? `$${founder.donation_amount.toLocaleString()}` : '—'}
                />
                <DLRow label="Confirmed" value={formatDate(founder.donation_confirmed_at)} />
                <DLRow label="Payment reference" value={founder.payment_reference || '—'} />
                <DLRow
                  label="Terms accepted"
                  value={founder.terms_accepted_at ? `${founder.terms_version ?? ''} · ${formatDate(founder.terms_accepted_at)}` : '—'}
                />
              </dl>
            )}
            <Field label="Status">
              <select className="input" value={form.status} onChange={set('status')}>
                <option value="invited">Invited — awaiting donation</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="archived">Archived</option>
                <option value="declined">Declined</option>
              </select>
            </Field>
            <p className="text-xs text-gray-500">
              Status changes here cover pause / archive / decline / re-invite.
              Moving an invitee to <strong>Active</strong> must go through
              “Confirm donation &amp; activate” above so the donation is recorded.
            </p>
          </Card>

          {/* Stewardship */}
          <Card title="Stewardship">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Phone">
                <input className="input" value={form.phone} onChange={set('phone')} />
              </Field>
              <Field label="Organization">
                <input className="input" value={form.organization} onChange={set('organization')} />
              </Field>
              <Field label="Relationship owner (staff email)">
                <input className="input" type="email" value={form.relationship_owner_email} onChange={set('relationship_owner_email')} />
              </Field>
              <Field label="Preferred locale">
                <select className="input" value={form.preferred_locale} onChange={set('preferred_locale')}>
                  <option value="en">English</option>
                  <option value="fr">Français</option>
                  <option value="ja">日本語</option>
                </select>
              </Field>
            </div>
            <Field label="Internal notes (admin-only — never shown to member)">
              <textarea
                className="input resize-none"
                rows={4}
                value={form.internal_notes}
                onChange={set('internal_notes')}
              />
            </Field>
          </Card>

          {/* Account state */}
          <Card title="Account">
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <DLRow label="Email" value={founder.email} />
              <DLRow label="Invited" value={formatDate(founder.invited_at)} />
              <DLRow
                label="Activated"
                value={founder.activated_at ? formatDate(founder.activated_at) : 'Not yet activated'}
              />
              <DLRow
                label="Last sign-in"
                value={founder.last_login_at ? formatDate(founder.last_login_at) : '—'}
              />
            </dl>
          </Card>

          {/* Phase 2C — Print fulfillment panel. Self-contained: loads + saves
              via its own API route, no coupling to the profile save flow. */}
          <PrintFulfillmentPanel founderId={founder.user_id} />

          {/* Save bar */}
          <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
            <Link
              href="/admin/founders"
              className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50"
            >
              Back
            </Link>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-black text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            {savedAt && (
              <span className="text-xs text-gray-500">
                Saved at {new Date(savedAt).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={revokeDialog}
        onClose={() => setRevokeDialog(false)}
        onConfirm={handleRevoke}
        title="Revoke access"
        description={`Archive ${founder.full_name} and sign them out of every active session? They can be unarchived later by changing their status back to active.`}
        confirmLabel="Revoke access"
        variant="danger"
        loading={revoking}
      />

      <ConfirmDialog
        open={deleteDialog}
        onClose={() => setDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Delete permanently"
        description={`This permanently removes ${founder.full_name} and every associated record — their login, print fulfillment, and briefing history. It cannot be undone. To temporarily disable access instead, use Revoke access.`}
        confirmLabel="Delete permanently"
        variant="danger"
        loading={deleting}
        requireConfirmText={founder.email}
        confirmTextLabel={`Type the founder's email (${founder.email}) to confirm`}
      />

      {toast && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-4 py-3 rounded-md shadow-lg text-sm max-w-md z-50">
          {toast}
        </div>
      )}
    </>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Small layout helpers — kept local since they're admin-detail-page-only
// ──────────────────────────────────────────────────────────────────────

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-5">
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function DLRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 mb-1">{label}</dt>
      <dd className="text-sm text-gray-900">{value}</dd>
    </div>
  )
}
