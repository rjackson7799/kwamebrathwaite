'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { PageHeader } from '@/components/admin/PageHeader'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { ConvertInquiryButton } from '@/components/admin/ConvertInquiryButton'

interface Inquiry {
  id: string
  name: string
  email: string
  phone: string | null
  subject: string | null
  message: string
  inquiry_type: string | null
  artwork_id: string | null
  status: string
  source: string
  founder_status: string | null
  converted_founder_id: string | null
  locale: string
  admin_notes: string | null
  responded_at: string | null
  responded_by: string | null
  created_at: string
  artwork?: {
    id: string
    title: string
    image_url: string | null
    image_thumbnail_url: string | null
  } | null
}

const FOUNDER_STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'read', label: 'Read' },
  { value: 'in_conversation', label: 'In conversation' },
  { value: 'converted', label: 'Converted' },
  { value: 'declined', label: 'Declined' },
  { value: 'archived', label: 'Archived' },
]

const SLA_WARN_MS  = 24 * 60 * 60 * 1000
const SLA_ERROR_MS = 48 * 60 * 60 * 1000

export default function InquiryDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [inquiry, setInquiry] = useState<Inquiry | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // Form state
  const [status, setStatus] = useState('')
  const [founderStatus, setFounderStatus] = useState('')
  const [adminNotes, setAdminNotes] = useState('')

  const isFounderInquiry = inquiry?.source === 'founder_inquiry'

  useEffect(() => {
    const fetchInquiry = async () => {
      try {
        const response = await fetch(`/api/admin/inquiries/${params.id}`)
        const data = await response.json()

        if (!data.success) {
          setError(data.error?.message || 'Inquiry not found')
          return
        }

        setInquiry(data.data)
        setStatus(data.data.status)
        setFounderStatus(data.data.founder_status || '')
        setAdminNotes(data.data.admin_notes || '')
      } catch {
        setError('Failed to load inquiry')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchInquiry()
    }
  }, [params.id])

  const handleSave = async () => {
    if (!inquiry) return

    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        admin_notes: adminNotes || null,
      }
      if (inquiry.source === 'founder_inquiry') {
        body.founder_status = founderStatus
      } else {
        body.status = status
      }

      const response = await fetch(`/api/admin/inquiries/${inquiry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()
      if (data.success) {
        setInquiry(data.data)
      } else {
        alert(data.error?.message || 'Failed to save changes')
      }
    } catch {
      alert('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const handleMarkResponded = async () => {
    if (!inquiry) return

    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        admin_notes: adminNotes || null,
        responded_at: new Date().toISOString(),
        responded_by: 'admin',
      }
      if (inquiry.source === 'founder_inquiry') {
        // For founder inquiries, "marking responded" means moving them
        // into the in_conversation lifecycle stage.
        body.founder_status = 'in_conversation'
      } else {
        body.status = 'responded'
      }

      const response = await fetch(`/api/admin/inquiries/${inquiry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()
      if (data.success) {
        setInquiry(data.data)
        if (inquiry.source === 'founder_inquiry') {
          setFounderStatus('in_conversation')
        } else {
          setStatus('responded')
        }
      } else {
        alert(data.error?.message || 'Failed to update')
      }
    } catch {
      alert('Failed to update')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!inquiry) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/admin/inquiries/${inquiry.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        router.push('/admin/inquiries')
      } else {
        alert('Failed to delete inquiry')
      }
    } catch (err) {
      alert('Failed to delete inquiry')
    } finally {
      setDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <>
        <PageHeader
          title="View Inquiry"
          breadcrumbs={[
            { label: 'Admin', href: '/admin' },
            { label: 'Inquiries', href: '/admin/inquiries' },
            { label: 'Loading...' },
          ]}
        />
        <div className="p-8">
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </>
    )
  }

  if (error || !inquiry) {
    return (
      <>
        <PageHeader
          title="View Inquiry"
          breadcrumbs={[
            { label: 'Admin', href: '/admin' },
            { label: 'Inquiries', href: '/admin/inquiries' },
            { label: 'Error' },
          ]}
        />
        <div className="p-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-700 mb-4">{error || 'Inquiry not found'}</p>
            <button
              onClick={() => router.push('/admin/inquiries')}
              className="px-4 py-2 bg-black text-white text-sm font-medium rounded-md hover:bg-gray-800"
            >
              Back to Inquiries
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title={`Inquiry from ${inquiry.name}`}
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Inquiries', href: '/admin/inquiries' },
          { label: inquiry.subject || `From ${inquiry.name}` },
        ]}
      />

      <div className="p-8">
        <div className="max-w-4xl">
          {/* Convert to invitation — only for founder inquiries that haven't
              been converted yet. Sits above the SLA banner so it's the first
              action an admin sees. */}
          {isFounderInquiry && !inquiry.converted_founder_id && (
            <ConvertInquiryButton
              inquiryId={inquiry.id}
              defaultName={inquiry.name}
              defaultEmail={inquiry.email}
              defaultLocale={inquiry.locale}
              onConverted={(founderId) => {
                router.push(`/admin/founders/${founderId}`)
              }}
            />
          )}

          {/* If already converted, show a quiet pointer to the resulting founder */}
          {isFounderInquiry && inquiry.converted_founder_id && (
            <div className="bg-[#FAF6EC] border border-[#C9A961] rounded-md px-4 py-3 mb-6 text-sm text-[#8a6f2b] flex items-center justify-between">
              <span>
                This inquiry was converted to a Founder invitation.
              </span>
              <Link
                href={`/admin/founders/${inquiry.converted_founder_id}`}
                className="font-medium underline hover:no-underline"
              >
                Open Founder record &rarr;
              </Link>
            </div>
          )}

          {/* SLA banner for founder inquiries that haven't been picked up */}
          {isFounderInquiry && (inquiry.founder_status === 'new' || inquiry.founder_status === 'read') && (
            (() => {
              const ageMs = Date.now() - new Date(inquiry.created_at).getTime()
              const past48 = ageMs >= SLA_ERROR_MS
              const past24 = ageMs >= SLA_WARN_MS
              const tone = past48
                ? 'bg-red-50 border-red-300 text-red-900'
                : past24
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-[#FAF6EC] border-[#C9A961] text-[#8a6f2b]'
              const label = past48
                ? 'Past the 48-hour SLA window.'
                : past24
                ? 'Approaching the 48-hour SLA window.'
                : "Founder's Circle inquiry · 24–48h response SLA."
              return (
                <div className={`border rounded-md px-4 py-3 mb-6 text-sm ${tone}`}>
                  <strong className="font-medium">{label}</strong>{' '}
                  Personal follow-up expected.
                </div>
              )
            })()
          )}

          {/* Two-column layout for contact info and status */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Contact Information */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Name</dt>
                  <dd className="text-sm text-gray-900">{inquiry.name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Email</dt>
                  <dd className="text-sm text-gray-900">
                    <a
                      href={`mailto:${inquiry.email}`}
                      className="text-blue-600 hover:underline"
                    >
                      {inquiry.email}
                    </a>
                  </dd>
                </div>
                {inquiry.phone && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Phone</dt>
                    <dd className="text-sm text-gray-900">
                      <a
                        href={`tel:${inquiry.phone}`}
                        className="text-blue-600 hover:underline"
                      >
                        {inquiry.phone}
                      </a>
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-gray-500">Source</dt>
                  <dd className="text-sm text-gray-900">
                    {isFounderInquiry ? (
                      <span className="inline-flex items-center gap-1 text-xs uppercase tracking-wider text-[#8a6f2b] bg-[#FAF6EC] border border-[#C9A961] px-2 py-0.5 rounded">
                        Founder&rsquo;s Circle
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500">General contact</span>
                    )}
                  </dd>
                </div>
                {!isFounderInquiry && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Type</dt>
                    <dd className="text-sm text-gray-900">
                      {inquiry.inquiry_type ? (
                        <StatusBadge status={inquiry.inquiry_type} />
                      ) : (
                        <span className="text-gray-400">Not specified</span>
                      )}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-gray-500">Submitted</dt>
                  <dd className="text-sm text-gray-900">{formatDate(inquiry.created_at)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Locale</dt>
                  <dd className="text-sm text-gray-900 uppercase">{inquiry.locale}</dd>
                </div>
              </dl>
            </div>

            {/* Status & Notes */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Status & Notes</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    {isFounderInquiry ? 'Founder lifecycle' : 'Status'}
                  </label>
                  {isFounderInquiry ? (
                    <select
                      value={founderStatus}
                      onChange={(e) => setFounderStatus(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black"
                    >
                      {FOUNDER_STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black"
                    >
                      <option value="new">New</option>
                      <option value="read">Read</option>
                      <option value="responded">Responded</option>
                      <option value="archived">Archived</option>
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Admin Notes
                  </label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={4}
                    placeholder="Add internal notes about this inquiry..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none"
                  />
                </div>
                {(() => {
                  if (isFounderInquiry) {
                    // For founder inquiries, the "first reply" action moves
                    // the row into the in_conversation lifecycle stage.
                    if (founderStatus === 'new' || founderStatus === 'read') {
                      return (
                        <button
                          onClick={handleMarkResponded}
                          disabled={saving}
                          className="w-full px-4 py-2 bg-[#C9A961] text-[#0e0e0e] text-sm font-medium rounded-md hover:bg-[#d4b572] disabled:opacity-50"
                        >
                          {saving ? 'Saving...' : 'Mark as in conversation'}
                        </button>
                      )
                    }
                    return null
                  }
                  // Original behavior for general_contact inquiries.
                  return status !== 'responded' ? (
                    <button
                      onClick={handleMarkResponded}
                      disabled={saving}
                      className="w-full px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Mark as Responded'}
                    </button>
                  ) : null
                })()}
                {inquiry.responded_at && (
                  <div className="text-sm text-gray-500 pt-2 border-t border-gray-200">
                    <p>
                      Responded on {formatDate(inquiry.responded_at)}
                      {inquiry.responded_by && ` by ${inquiry.responded_by}`}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Subject */}
          {inquiry.subject && (
            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Subject</h2>
              <p className="text-gray-900">{inquiry.subject}</p>
            </div>
          )}

          {/* Message */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Message</h2>
            <div className="bg-gray-50 rounded-lg p-4 text-gray-900 whitespace-pre-wrap">
              {inquiry.message}
            </div>
          </div>

          {/* Linked Artwork */}
          {inquiry.artwork && (
            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Linked Artwork</h2>
              <Link
                href={`/admin/artworks/${inquiry.artwork.id}/edit`}
                className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {inquiry.artwork.image_thumbnail_url ? (
                  <div className="w-16 h-16 relative rounded overflow-hidden flex-shrink-0">
                    <Image
                      src={inquiry.artwork.image_thumbnail_url}
                      alt={inquiry.artwork.title}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                    </svg>
                  </div>
                )}
                <div>
                  <p className="font-medium text-gray-900">{inquiry.artwork.title}</p>
                  <p className="text-sm text-blue-600">View artwork</p>
                </div>
              </Link>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
            <Link
              href="/admin/inquiries"
              className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50"
            >
              Back to Inquiries
            </Link>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-black text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={() => setShowDeleteDialog(true)}
              className="px-4 py-2 border border-red-300 text-red-600 text-sm font-medium rounded-md hover:bg-red-50 ml-auto"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Delete Inquiry"
        description={`Are you sure you want to delete this inquiry from "${inquiry.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
      />
    </>
  )
}
