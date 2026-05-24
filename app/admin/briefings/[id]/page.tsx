'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/components/admin/PageHeader'
import { BriefingForm } from '@/components/admin/BriefingForm'
import {
  BriefingNotificationPanel,
  type BriefingNotificationRow,
} from '@/components/admin/BriefingNotificationPanel'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'

interface Briefing {
  id: string
  title: string
  excerpt: string | null
  body_html: string
  status: 'draft' | 'published' | 'archived'
  published_at: string | null
  published_by: string | null
  created_at: string
  updated_at: string
}

export default function AdminBriefingDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params.id

  const [briefing, setBriefing] = useState<Briefing | null>(null)
  const [notifications, setNotifications] = useState<BriefingNotificationRow[]>([])
  const [readCount, setReadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const fetchBriefing = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/briefings/${id}`)
      const json = await res.json()
      if (!json.success) {
        setError(json.error?.message ?? 'Failed to load briefing')
        return
      }
      setBriefing(json.data.briefing)
      setNotifications(json.data.notifications ?? [])
      setReadCount(json.data.read_count ?? 0)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchBriefing()
  }, [fetchBriefing])

  async function handleDelete() {
    const res = await fetch(`/api/admin/briefings/${id}`, { method: 'DELETE' })
    const json = await res.json()
    if (!json.success) {
      setError(json.error?.message ?? 'Failed to delete briefing')
      return
    }
    router.push('/admin/briefings')
  }

  async function handleArchive() {
    const res = await fetch(`/api/admin/briefings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'archived' }),
    })
    const json = await res.json()
    if (!json.success) {
      setError(json.error?.message ?? 'Failed to archive briefing')
      return
    }
    fetchBriefing()
  }

  if (loading && !briefing) {
    return <div className="p-8 text-sm text-gray-500">Loading…</div>
  }
  if (error && !briefing) {
    return <div className="p-8 text-sm text-red-600">{error}</div>
  }
  if (!briefing) return null

  return (
    <>
      <PageHeader
        title={briefing.title || 'Briefing'}
        description={
          briefing.status === 'draft'
            ? 'Draft — not visible to Founders yet.'
            : briefing.status === 'archived'
            ? 'Archived — hidden from the portal.'
            : `Published ${briefing.published_at ? new Date(briefing.published_at).toLocaleString() : ''}`
        }
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Briefings', href: '/admin/briefings' },
          { label: briefing.title || 'Detail' },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <StatusBadge status={briefing.status} />
            {briefing.status !== 'archived' ? (
              <button
                onClick={handleArchive}
                className="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50"
              >
                Archive
              </button>
            ) : null}
            <button
              onClick={() => setConfirmDelete(true)}
              className="px-3 py-1.5 border border-red-300 text-red-700 text-sm font-medium rounded-md hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        }
      />

      <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <BriefingForm
            mode="edit"
            initial={{
              id: briefing.id,
              title: briefing.title,
              excerpt: briefing.excerpt,
              body_html: briefing.body_html,
              status: briefing.status,
            }}
          />
        </div>

        <aside className="space-y-6">
          <BriefingNotificationPanel
            briefingId={briefing.id}
            briefingStatus={briefing.status}
            notifications={notifications}
            readCount={readCount}
            onChanged={fetchBriefing}
          />
          <div className="bg-white border border-gray-200 rounded-lg p-4 text-xs text-gray-500 space-y-1">
            <p>
              <span className="font-medium text-gray-700">Created:</span>{' '}
              {new Date(briefing.created_at).toLocaleString()}
            </p>
            <p>
              <span className="font-medium text-gray-700">Updated:</span>{' '}
              {new Date(briefing.updated_at).toLocaleString()}
            </p>
            {briefing.published_at ? (
              <p>
                <span className="font-medium text-gray-700">Published:</span>{' '}
                {new Date(briefing.published_at).toLocaleString()}
              </p>
            ) : null}
          </div>
          <Link
            href="/admin/briefings"
            className="block text-center text-sm text-gray-500 hover:text-gray-700"
          >
            ← All briefings
          </Link>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete briefing?"
        description="This permanently removes the briefing, its notification records, and any read receipts. This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
      />
    </>
  )
}
