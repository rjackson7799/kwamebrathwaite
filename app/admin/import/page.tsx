'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/admin/PageHeader'
import { ImportPasteForm } from '@/components/admin/ImportPasteForm'

interface ImportBatch {
  id: string
  source_label: string | null
  status: string
  progress: string
  item_count: number
  created_at: string
  created_by_email: string | null
  cost_usd: number | null
  archived_at: string | null
}

const PROGRESS_LABELS: Record<string, string> = {
  not_started: 'Ready to review',
  in_progress: 'Partly published',
  complete: 'Done',
  complete_with_parse_errors: 'Done, with skipped sections',
  needs_attention: 'Needs attention',
}

export default function ImportPage() {
  const [batches, setBatches] = useState<ImportBatch[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/import?limit=10')
      .then((r) => r.json())
      .then((body) => setBatches(body?.data ?? []))
      .catch(() => setBatches([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      <PageHeader
        title="Smart Import"
        description="Paste a schedule or press list and let AI turn it into reviewable drafts."
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Smart Import' }]}
      />

      <div className="p-8 space-y-10">
        <ImportPasteForm />

        <section className="max-w-3xl">
          <h2 className="text-lg font-medium text-black dark:text-[#F0F0F0]">Recent imports</h2>

          {loading ? (
            <p className="mt-3 text-sm text-gray-warm">Loading…</p>
          ) : batches.length === 0 ? (
            <p className="mt-3 text-sm text-gray-warm">
              Nothing imported yet. Paste something above to get started.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-gray-200 dark:divide-[#2A2A2A] rounded-sm border border-gray-200 dark:border-[#2A2A2A]">
              {batches.map((batch) => (
                <li key={batch.id}>
                  <Link
                    href={`/admin/import/${batch.id}`}
                    className="flex items-center justify-between gap-4 p-4 hover:bg-gray-50 dark:hover:bg-[#1A1A1A]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-black dark:text-[#F0F0F0]">
                        {batch.source_label || 'Untitled import'}
                      </p>
                      <p className="mt-0.5 text-caption text-gray-warm">
                        {new Date(batch.created_at).toLocaleString()} ·{' '}
                        {batch.item_count} {batch.item_count === 1 ? 'entry' : 'entries'}
                        {batch.created_by_email ? ` · ${batch.created_by_email}` : ''}
                      </p>
                    </div>
                    <span
                      className={`flex-shrink-0 rounded-sm px-2 py-0.5 text-caption ${
                        batch.status === 'failed' || batch.progress === 'needs_attention'
                          ? 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300'
                          : 'bg-charcoal/10 dark:bg-[#2A2A2A]'
                      }`}
                    >
                      {batch.status === 'failed'
                        ? 'Parse failed'
                        : (PROGRESS_LABELS[batch.progress] ?? batch.progress)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  )
}
