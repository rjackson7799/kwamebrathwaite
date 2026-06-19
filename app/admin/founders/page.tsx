'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/components/admin/PageHeader'
import { DataTable, Column } from '@/components/admin/DataTable'
import { StatusBadge } from '@/components/admin/StatusBadge'

interface Founder {
  user_id: string
  email: string
  full_name: string
  recognition_name: string | null
  tier: string | null
  status: 'invited' | 'active' | 'paused' | 'archived' | 'declined'
  organization: string | null
  invited_at: string
  activated_at: string | null
  last_login_at: string | null
  [key: string]: unknown
}

const TIER_LABEL: Record<string, string> = {
  founder: 'Founder',
  collector_circle: 'Collector Circle',
  leadership: 'Leadership',
  archive: 'Archive',
  legacy: 'Legacy',
}

export default function AdminFoundersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [founders, setFounders] = useState<Founder[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1)
  const [total, setTotal] = useState(0)
  const [pageSize] = useState(20)

  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '')
  const [tierFilter, setTierFilter] = useState(searchParams.get('tier') || '')
  const [search, setSearch] = useState(searchParams.get('q') || '')

  const fetchFounders = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(pageSize))
      if (statusFilter) params.set('status', statusFilter)
      if (tierFilter) params.set('tier', tierFilter)
      if (search) params.set('q', search)

      const response = await fetch(`/api/admin/founders?${params}`)
      const data = await response.json()
      if (data.success) {
        setFounders(data.data)
        setTotal(data.metadata?.total || 0)
      }
    } catch (err) {
      console.error('Failed to fetch founders:', err)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, statusFilter, tierFilter, search])

  useEffect(() => {
    fetchFounders()
  }, [fetchFounders])

  useEffect(() => {
    const params = new URLSearchParams()
    if (page > 1) params.set('page', String(page))
    if (statusFilter) params.set('status', statusFilter)
    if (tierFilter) params.set('tier', tierFilter)
    if (search) params.set('q', search)
    const newUrl = params.toString() ? `?${params}` : '/admin/founders'
    router.replace(newUrl, { scroll: false })
  }, [page, statusFilter, tierFilter, search, router])

  function formatDate(d: string | null) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const columns: Column<Founder>[] = [
    {
      key: 'full_name',
      label: 'Name',
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.full_name}</p>
          <p className="text-xs text-gray-500">{row.email}</p>
        </div>
      ),
    },
    {
      key: 'tier',
      label: 'Tier',
      render: (row) =>
        row.tier ? (
          <span className="text-xs uppercase tracking-wider text-[#8a6f2b]">
            {TIER_LABEL[row.tier] ?? row.tier}
          </span>
        ) : (
          <span className="text-gray-400 text-xs">—</span>
        ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'organization',
      label: 'Organization',
      render: (row) => (
        <span className="text-sm text-gray-600">{row.organization ?? '—'}</span>
      ),
    },
    {
      key: 'invited_at',
      label: 'Invited',
      sortable: true,
      render: (row) => (
        <span className="text-sm text-gray-600">{formatDate(row.invited_at)}</span>
      ),
    },
    {
      key: 'last_login_at',
      label: 'Last sign-in',
      render: (row) =>
        row.last_login_at ? (
          <span className="text-sm text-gray-600">{formatDate(row.last_login_at)}</span>
        ) : row.status === 'invited' ? (
          <span className="text-xs text-amber-700">Awaiting first sign-in</span>
        ) : (
          <span className="text-gray-400 text-sm">—</span>
        ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Founders Circle"
        description="Member records — invitations, recognition preferences, and stewardship details."
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Founders' },
        ]}
        actions={
          <Link
            href="/admin/founders/new"
            className="px-4 py-2 bg-black text-white text-sm font-medium rounded-md hover:bg-gray-800"
          >
            Invite a Founder
          </Link>
        }
      />

      <div className="p-8">
        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4">
          <input
            type="text"
            placeholder="Search by name, email, or organization…"
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
            <option value="invited">Invited</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="declined">Declined</option>
            <option value="archived">Archived</option>
          </select>

          <select
            value={tierFilter}
            onChange={(e) => {
              setTierFilter(e.target.value)
              setPage(1)
            }}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black"
          >
            <option value="">All Tiers</option>
            <option value="founder">Founder</option>
            <option value="collector_circle">Collector Circle</option>
            <option value="leadership">Leadership</option>
            <option value="archive">Archive</option>
            <option value="legacy">Legacy</option>
          </select>

          {(search || statusFilter || tierFilter) && (
            <button
              onClick={() => {
                setSearch('')
                setStatusFilter('')
                setTierFilter('')
                setPage(1)
              }}
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              Clear filters
            </button>
          )}
        </div>

        <DataTable
          data={founders}
          columns={columns}
          keyField="user_id"
          loading={loading}
          emptyMessage="No founders yet. Convert a founder inquiry from /admin/inquiries, or click New Founder above."
          onRowClick={(row) => router.push(`/admin/founders/${row.user_id}`)}
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
