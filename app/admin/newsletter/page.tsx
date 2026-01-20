'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PageHeader } from '@/components/admin/PageHeader'
import { DataTable, Column, ActionButtons } from '@/components/admin/DataTable'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'

interface Subscriber {
  id: string
  email: string
  locale: string
  subscribed_at: string
  [key: string]: unknown
}

export default function AdminNewsletterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1)
  const [total, setTotal] = useState(0)
  const [pageSize] = useState(20)

  // Filters
  const [localeFilter, setLocaleFilter] = useState(searchParams.get('locale') || '')
  const [search, setSearch] = useState(searchParams.get('q') || '')

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<Subscriber | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Export state
  const [exporting, setExporting] = useState(false)

  const fetchSubscribers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(pageSize))
      if (localeFilter) params.set('locale', localeFilter)
      if (search) params.set('q', search)

      const response = await fetch(`/api/admin/newsletter?${params}`)
      const data = await response.json()

      if (data.success) {
        setSubscribers(data.data)
        setTotal(data.metadata?.total || 0)
      }
    } catch (error) {
      console.error('Failed to fetch subscribers:', error)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, localeFilter, search])

  useEffect(() => {
    fetchSubscribers()
  }, [fetchSubscribers])

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams()
    if (page > 1) params.set('page', String(page))
    if (localeFilter) params.set('locale', localeFilter)
    if (search) params.set('q', search)

    const newUrl = params.toString() ? `?${params}` : '/admin/newsletter'
    router.replace(newUrl, { scroll: false })
  }, [page, localeFilter, search, router])

  const handleDelete = async () => {
    if (!deleteTarget) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/admin/newsletter/${deleteTarget.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchSubscribers()
        setDeleteTarget(null)
      }
    } catch (error) {
      console.error('Failed to delete subscriber:', error)
    } finally {
      setDeleting(false)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const response = await fetch('/api/admin/newsletter/export')

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `newsletter-subscribers-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        a.remove()
      }
    } catch (error) {
      console.error('Failed to export subscribers:', error)
    } finally {
      setExporting(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getLocaleLabel = (locale: string) => {
    switch (locale) {
      case 'en': return 'English'
      case 'fr': return 'French'
      case 'ja': return 'Japanese'
      default: return locale
    }
  }

  const columns: Column<Subscriber>[] = [
    {
      key: 'email',
      label: 'Email',
      sortable: true,
      render: (row) => (
        <span className="font-medium text-gray-900">{row.email}</span>
      ),
    },
    {
      key: 'locale',
      label: 'Language',
      render: (row) => (
        <StatusBadge status={row.locale || 'en'} />
      ),
    },
    {
      key: 'subscribed_at',
      label: 'Subscribed',
      sortable: true,
      render: (row) => (
        <span className="text-sm text-gray-600">
          {formatDate(row.subscribed_at)}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      className: 'w-16',
      render: (row) => (
        <ActionButtons
          onDelete={() => setDeleteTarget(row)}
        />
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Newsletter Subscribers"
        description={`Manage email subscribers (${total} total)`}
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Newsletter' },
        ]}
        actions={
          <button
            onClick={handleExport}
            disabled={exporting || total === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-black rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        }
      />

      <div className="p-8">
        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4">
          <input
            type="text"
            placeholder="Search by email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm w-80 focus:outline-none focus:ring-2 focus:ring-black"
          />

          <select
            value={localeFilter}
            onChange={(e) => {
              setLocaleFilter(e.target.value)
              setPage(1)
            }}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black"
          >
            <option value="">All Languages</option>
            <option value="en">English</option>
            <option value="fr">French</option>
            <option value="ja">Japanese</option>
          </select>

          {(search || localeFilter) && (
            <button
              onClick={() => {
                setSearch('')
                setLocaleFilter('')
                setPage(1)
              }}
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Table */}
        <DataTable
          data={subscribers}
          columns={columns}
          keyField="id"
          loading={loading}
          emptyMessage="No subscribers found"
          pagination={{
            page,
            pageSize,
            total,
            onPageChange: setPage,
          }}
        />
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Subscriber"
        description={`Are you sure you want to remove "${deleteTarget?.email}" from the newsletter? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
      />
    </>
  )
}
