'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { PageHeader } from '@/components/admin/PageHeader'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'

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
  const [adminNotes, setAdminNotes] = useState('')

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
        setAdminNotes(data.data.admin_notes || '')
      } catch (err) {
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
      const response = await fetch(`/api/admin/inquiries/${inquiry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          admin_notes: adminNotes || null,
        }),
      })

      const data = await response.json()
      if (data.success) {
        setInquiry(data.data)
      } else {
        alert(data.error?.message || 'Failed to save changes')
      }
    } catch (err) {
      alert('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const handleMarkResponded = async () => {
    if (!inquiry) return

    setSaving(true)
    try {
      const response = await fetch(`/api/admin/inquiries/${inquiry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'responded',
          admin_notes: adminNotes || null,
          responded_at: new Date().toISOString(),
          responded_by: 'admin', // This would ideally come from the session
        }),
      })

      const data = await response.json()
      if (data.success) {
        setInquiry(data.data)
        setStatus('responded')
      } else {
        alert(data.error?.message || 'Failed to update')
      }
    } catch (err) {
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
                  <dt className="text-sm font-medium text-gray-500">Type</dt>
                  <dd className="text-sm text-gray-900">
                    {inquiry.inquiry_type ? (
                      <StatusBadge status={inquiry.inquiry_type} />
                    ) : (
                      <span className="text-gray-400">Not specified</span>
                    )}
                  </dd>
                </div>
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
                    Status
                  </label>
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
                {status !== 'responded' && (
                  <button
                    onClick={handleMarkResponded}
                    disabled={saving}
                    className="w-full px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Mark as Responded'}
                  </button>
                )}
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
