'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AlertCircle } from 'lucide-react'
import { PageHeader } from '@/components/admin/PageHeader'
import { ImportReviewList } from '@/components/admin/ImportReviewList'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import type { ImportItem } from '@/components/admin/ImportItemCard'

interface ImportBatchDetail {
  id: string
  source_label: string | null
  status: string
  progress: string
  item_count: number
  error_message: string | null
  created_at: string
  items: ImportItem[]
}

// params is read with useParams(), not taken as a prop. On Next.js 14 a page's
// `params` is a PLAIN OBJECT; the `use(params)` form is the Next 15 idiom and
// hands React a non-Promise, which throws React #438 during render and blanks
// the page. It compiles and builds — only the browser catches it.
// tests/next14-params-convention.test.ts pins this repo-wide.
export default function ImportReviewPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const router = useRouter()

  const [batch, setBatch] = useState<ImportBatchDetail | null>(null)
  const [liveMatchIds, setLiveMatchIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)

  useEffect(() => {
    async function load() {
      const response = await fetch(`/api/admin/import/${id}`)
      if (!response.ok) {
        setNotFound(true)
        setLoading(false)
        return
      }
      const body = await response.json()
      const detail = body.data as ImportBatchDetail
      setBatch(detail)

      // Which matched records are LIVE decides whether an item needs explicit
      // review before it can publish, so it is resolved once here.
      const matchIds = detail.items
        .map((i) => i.match_exhibition_id ?? i.match_press_id)
        .filter(Boolean) as string[]

      if (matchIds.length > 0) {
        const live = detail.items
          .filter((i) => i.match_snapshot?.status === 'published')
          .map((i) => (i.match_exhibition_id ?? i.match_press_id) as string)
        setLiveMatchIds(live)
      }

      setLoading(false)
    }
    load().catch(() => {
      setNotFound(true)
      setLoading(false)
    })
  }, [id])

  async function discard() {
    setDiscardOpen(false)
    const response = await fetch(`/api/admin/import/${id}`, { method: 'DELETE' })
    if (response.ok) router.push('/admin/import')
  }

  if (loading) {
    return (
      <>
        <PageHeader title="Review import" breadcrumbs={[{ label: 'Admin', href: '/admin' }]} />
        <div className="p-8 text-sm text-gray-warm">Loading…</div>
      </>
    )
  }

  if (notFound || !batch) {
    return (
      <>
        <PageHeader title="Import not found" breadcrumbs={[{ label: 'Admin', href: '/admin' }]} />
        <div className="p-8 text-sm text-gray-warm">
          That import no longer exists. It may have been discarded.
        </div>
      </>
    )
  }

  const stale =
    batch.status === 'parsing' &&
    Date.now() - new Date(batch.created_at).getTime() > 10 * 60 * 1000

  return (
    <>
      <PageHeader
        title={batch.source_label || 'Review import'}
        description={`${batch.item_count} ${batch.item_count === 1 ? 'entry' : 'entries'} found. Nothing is published until you say so.`}
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Smart Import', href: '/admin/import' },
          { label: 'Review' },
        ]}
        actions={
          <button
            type="button"
            onClick={() => setDiscardOpen(true)}
            className="rounded-sm border border-gray-300 dark:border-[#2A2A2A] px-3 py-1.5 text-sm"
          >
            Discard batch
          </button>
        }
      />

      <div className="p-8">
        {(batch.status === 'failed' || stale) && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-2 rounded-sm bg-red-50 dark:bg-red-950/30 p-4 text-sm text-red-700 dark:text-red-300"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>
              {stale
                ? 'This import stopped partway through. Start a new one — your reviewed edits here are kept.'
                : (batch.error_message ?? 'This import failed to parse.')}
            </span>
          </div>
        )}

        {batch.error_message && batch.status === 'ready' && (
          <p className="mb-6 rounded-sm bg-amber-50 dark:bg-amber-950/30 p-4 text-sm text-amber-800 dark:text-amber-300">
            {batch.error_message}
          </p>
        )}

        {batch.items.length > 0 ? (
          <ImportReviewList
            importId={batch.id}
            initialItems={batch.items}
            liveMatchIds={liveMatchIds}
          />
        ) : (
          <p className="text-sm text-gray-warm">No entries were found in that text.</p>
        )}
      </div>

      <ConfirmDialog
        open={discardOpen}
        onClose={() => setDiscardOpen(false)}
        onConfirm={discard}
        variant="danger"
        title="Discard this import?"
        description="Anything already published stays published — this only removes the staging batch. If some entries were published, the batch is archived instead so the record of what happened is kept."
        confirmLabel="Discard"
      />
    </>
  )
}
