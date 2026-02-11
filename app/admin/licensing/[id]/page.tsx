'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { PageHeader } from '@/components/admin/PageHeader'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { ImagePlaceholder } from '@/components/ui/ImagePlaceholder'

interface LicenseRequestDetail {
  id: string
  request_number: string
  name: string
  email: string
  company: string | null
  phone: string | null
  territory: string | null
  duration: string | null
  print_run: string | null
  usage_description: string
  status: string
  admin_notes: string | null
  quoted_price: number | null
  quoted_at: string | null
  approved_at: string | null
  expires_at: string | null
  locale: string
  created_at: string
  updated_at: string
  license_type?: { id: string; name: string; description: string | null } | null
  artworks?: Array<{
    artwork: {
      id: string
      title: string
      image_url: string | null
      image_thumbnail_url: string | null
      year: number | null
      medium: string | null
    } | null
  }> | null
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default function AdminLicenseRequestDetailPage({ params }: PageProps) {
  const router = useRouter()
  const [request, setRequest] = useState<LicenseRequestDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sendingQuote, setSendingQuote] = useState(false)

  // Editable fields
  const [status, setStatus] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const [quotePrice, setQuotePrice] = useState('')
  const [quoteMessage, setQuoteMessage] = useState('')
  const [showQuoteForm, setShowQuoteForm] = useState(false)

  useEffect(() => {
    async function fetchRequest() {
      const { id } = await params
      try {
        const response = await fetch(`/api/admin/licensing/${id}`)
        const data = await response.json()

        if (data.success) {
          setRequest(data.data)
          setStatus(data.data.status)
          setAdminNotes(data.data.admin_notes || '')
        }
      } catch (error) {
        console.error('Failed to fetch license request:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRequest()
  }, [params])

  const handleSave = async () => {
    if (!request) return
    setSaving(true)

    try {
      const response = await fetch(`/api/admin/licensing/${request.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          admin_notes: adminNotes || null,
          ...(status === 'approved' ? { approved_at: new Date().toISOString() } : {}),
        }),
      })

      const data = await response.json()
      if (data.success) {
        setRequest(data.data)
      }
    } catch (error) {
      console.error('Failed to update license request:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleSendQuote = async () => {
    if (!request || !quotePrice || !quoteMessage) return
    setSendingQuote(true)

    try {
      const response = await fetch(`/api/admin/licensing/${request.id}/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoted_price: parseFloat(quotePrice),
          message: quoteMessage,
        }),
      })

      const data = await response.json()
      if (data.success) {
        setRequest(data.data)
        setStatus('quoted')
        setShowQuoteForm(false)
        setQuotePrice('')
        setQuoteMessage('')
      }
    } catch (error) {
      console.error('Failed to send quote:', error)
    } finally {
      setSendingQuote(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '\u2014'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatPrice = (price: number | null) => {
    if (price === null || price === undefined) return '\u2014'
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price)
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-4 bg-gray-200 rounded w-2/3" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    )
  }

  if (!request) {
    return (
      <div className="p-8">
        <p className="text-gray-500">License request not found.</p>
      </div>
    )
  }

  return (
    <>
      <PageHeader
        title={request.request_number}
        description={`License request from ${request.name}`}
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Licensing', href: '/admin/licensing' },
          { label: request.request_number },
        ]}
        actions={
          <button
            onClick={() => router.push('/admin/licensing')}
            className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Back to List
          </button>
        }
      />

      <div className="p-8 max-w-5xl space-y-8">
        {/* Status & Actions */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Status</h2>
            <StatusBadge status={request.status} size="md" />
          </div>

          <div className="flex items-center gap-4">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black"
            >
              <option value="new">New</option>
              <option value="quoted">Quoted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
            </select>

            <button
              onClick={handleSave}
              disabled={saving || status === request.status}
              className="px-4 py-2 bg-black text-white text-sm rounded-md hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Update Status'}
            </button>

            {request.status === 'new' && (
              <button
                onClick={() => setShowQuoteForm(!showQuoteForm)}
                className="px-4 py-2 bg-amber-600 text-white text-sm rounded-md hover:bg-amber-700 transition-colors"
              >
                Send Quote
              </button>
            )}
          </div>

          {/* Quote Form */}
          {showQuoteForm && (
            <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
              <h3 className="font-medium">Send Quote</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price (USD)
                </label>
                <input
                  type="number"
                  value={quotePrice}
                  onChange={(e) => setQuotePrice(e.target.value)}
                  min="0"
                  step="0.01"
                  placeholder="e.g., 500.00"
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm w-48 focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message to Requester
                </label>
                <textarea
                  value={quoteMessage}
                  onChange={(e) => setQuoteMessage(e.target.value)}
                  rows={4}
                  placeholder="Include any terms, conditions, or notes about the quote..."
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm w-full focus:outline-none focus:ring-2 focus:ring-black resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSendQuote}
                  disabled={sendingQuote || !quotePrice || !quoteMessage}
                  className="px-4 py-2 bg-amber-600 text-white text-sm rounded-md hover:bg-amber-700 disabled:opacity-50 transition-colors"
                >
                  {sendingQuote ? 'Sending...' : 'Send Quote Email'}
                </button>
                <button
                  onClick={() => setShowQuoteForm(false)}
                  className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Show existing quote info */}
          {request.quoted_price !== null && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Quoted: <span className="font-semibold">{formatPrice(request.quoted_price)}</span>
                {request.quoted_at && <span className="text-gray-400"> on {formatDate(request.quoted_at)}</span>}
              </p>
            </div>
          )}
        </div>

        {/* Contact Info */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Contact Information</h2>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-gray-500">Name</dt>
              <dd className="font-medium">{request.name}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Email</dt>
              <dd>
                <a href={`mailto:${request.email}`} className="text-blue-600 hover:underline">
                  {request.email}
                </a>
              </dd>
            </div>
            {request.company && (
              <div>
                <dt className="text-gray-500">Company</dt>
                <dd>{request.company}</dd>
              </div>
            )}
            {request.phone && (
              <div>
                <dt className="text-gray-500">Phone</dt>
                <dd>{request.phone}</dd>
              </div>
            )}
            <div>
              <dt className="text-gray-500">Submitted</dt>
              <dd>{formatDate(request.created_at)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Locale</dt>
              <dd><StatusBadge status={request.locale} /></dd>
            </div>
          </dl>
        </div>

        {/* License Details */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">License Details</h2>
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="text-gray-500">License Type</dt>
              <dd className="font-medium">{request.license_type?.name || '\u2014'}</dd>
              {request.license_type?.description && (
                <dd className="text-gray-400 text-xs mt-1">{request.license_type.description}</dd>
              )}
            </div>
            {request.territory && (
              <div>
                <dt className="text-gray-500">Territory</dt>
                <dd>{request.territory}</dd>
              </div>
            )}
            {request.duration && (
              <div>
                <dt className="text-gray-500">Duration</dt>
                <dd>{request.duration}</dd>
              </div>
            )}
            {request.print_run && (
              <div>
                <dt className="text-gray-500">Print Run / Reach</dt>
                <dd>{request.print_run}</dd>
              </div>
            )}
            <div>
              <dt className="text-gray-500">Usage Description</dt>
              <dd className="whitespace-pre-wrap">{request.usage_description}</dd>
            </div>
          </dl>
        </div>

        {/* Requested Artworks */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">
            Requested Artworks ({request.artworks?.length || 0})
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {request.artworks?.map((item) => {
              const artwork = item.artwork
              if (!artwork) return null
              return (
                <div key={artwork.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="aspect-square relative bg-gray-100">
                    {artwork.image_thumbnail_url || artwork.image_url ? (
                      <Image
                        src={artwork.image_thumbnail_url || artwork.image_url || ''}
                        alt={artwork.title}
                        fill
                        className="object-cover"
                        sizes="200px"
                      />
                    ) : (
                      <ImagePlaceholder />
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium truncate">{artwork.title}</p>
                    <p className="text-xs text-gray-500">
                      {[artwork.year, artwork.medium].filter(Boolean).join(' \u2022 ')}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Admin Notes */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Admin Notes</h2>
          <textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            rows={4}
            placeholder="Add internal notes about this request..."
            className="px-3 py-2 border border-gray-300 rounded-md text-sm w-full focus:outline-none focus:ring-2 focus:ring-black resize-none"
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-3 px-4 py-2 bg-black text-white text-sm rounded-md hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save Notes'}
          </button>
        </div>
      </div>
    </>
  )
}
