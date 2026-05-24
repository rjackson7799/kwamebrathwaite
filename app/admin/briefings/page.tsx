'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/components/admin/PageHeader'
import { DataTable, Column } from '@/components/admin/DataTable'
import { StatusBadge } from '@/components/admin/StatusBadge'

interface Briefing {
  id: string
  title: string
  excerpt: string | null
  status: 'draft' | 'published' | 'archived'
  published_at: string | null
  created_at: string
  updated_at: string
  [key: string]: unknown
}

export default function AdminBriefingsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [briefings, setBriefings] = useState<Briefing[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1)
  const [total, setTotal] = useState(0)
  const [pageSize] = useState(20)

  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '')
  const [search, setSearch] = useState(searchParams.get('q') || '')

  const fetchBriefings = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(pageSize))
      if (statusFilter) params.set('status', statusFilter)
      if (search) params.set('q', search)

      const response = await fetch(`/api/admin/briefings?${params}`)
      const data = await response.json()
      if (data.success) {
        setBriefings(data.data)
        setTotal(data.metadata?.total || 0)
      }
    } catch (err) {
      console.error('Failed to fetch briefings:', err)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, statusFilter, search])

  useEffect(() => {
    fetchBriefings()
  }, [fetchBriefings])

  useEffect(() => {
    const params = new URLSearchParams()
    if (page > 1) params.set('page', String(page))
    if (statusFilter) params.set('status', statusFilter)
    if (search) params.set('q', search)
    const newUrl = params.toString() ? `?${params}` : '/admin/briefings'
    router.replace(newUrl, { scroll: false })
  }, [page, statusFilter, search, router])

  function formatDate(d: string | null) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const columns: Column<Briefing>[] = [
    {
      key: 'title',
      label: 'Title',
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.title}</p>
          {row.excerpt ? (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{row.excerpt}</p>
          ) : null}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'published_at',
      label: 'Published',
      sortable: true,
      render: (row) => (
        <span className="text-sm text-gray-600">{formatDate(row.published_at)}</span>
      ),
    },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      render: (row) => (
        <span className="text-sm text-gray-600">{formatDate(row.created_at)}</span>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Briefings"
        description="Dispatches published to the Founder's Circle. News from the archive, exhibition openings, notes from Kwame's family."
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Briefings' },
        ]}
        actions={
          <Link
            href="/admin/briefings/new"
            className="px-4 py-2 bg-black text-white text-sm font-medium rounded-md hover:bg-gray-800"
          >
            New Briefing
          </Link>
        }
      />

      <div className="p-8">
        <div className="mb-6 flex flex-wrap gap-4">
          <input
            type="text"
            placeholder="Search by title or excerpt…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm w-80 focus:outline-none focus:ring-2 focus:ring-black"
          />

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setPage(1)
            }}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>

          {(search || statusFilter) && (
            <button
              onClick={() => {
                setSearch('')
                setStatusFilter('')
                setPage(1)
              }}
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              Clear filters
            </button>
          )}
        </div>

        <DataTable
          data={briefings}
          columns={columns}
          keyField="id"
          loading={loading}
          emptyMessage="No briefings yet. Click New Briefing to start a dispatch."
          onRowClick={(row) => router.push(`/admin/briefings/${row.id}`)}
          pagination={{
            page,
            pageSize,
            total,
            onPageChange: setPage,
          }}
        />
      </div>
    </>
  )
}
