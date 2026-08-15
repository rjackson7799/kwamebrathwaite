'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { ConfirmDialog } from './ConfirmDialog'
import { ImportItemCard, type ImportItem } from './ImportItemCard'

type SaveState = 'clean' | 'dirty' | 'saving' | 'saved' | 'error'
type Filter = 'all' | 'warnings' | 'live' | 'failed' | 'new'

interface ImportReviewListProps {
  importId: string
  initialItems: ImportItem[]
  /** ids of matched records that are currently published. */
  liveMatchIds: string[]
}

export function ImportReviewList({
  importId,
  initialItems,
  liveMatchIds,
}: ImportReviewListProps) {
  const router = useRouter()
  const [items, setItems] = useState(initialItems)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({})
  const [filter, setFilter] = useState<Filter>('all')
  const [publishing, setPublishing] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const liveSet = useMemo(() => new Set(liveMatchIds), [liveMatchIds])

  const isLive = (item: ImportItem) =>
    Boolean(
      (item.match_exhibition_id && liveSet.has(item.match_exhibition_id)) ||
        (item.match_press_id && liveSet.has(item.match_press_id))
    )

  const visible = useMemo(() => {
    switch (filter) {
      case 'warnings':
        return items.filter((i) => i.warnings.length > 0 || (i.confidence ?? 1) < 0.7)
      case 'live':
        return items.filter(isLive)
      case 'failed':
        return items.filter((i) => i.status === 'failed' || i.status === 'parse_failed')
      case 'new':
        return items.filter((i) => i.action === 'create')
      default:
        return items
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, filter, liveSet])

  /**
   * An item can only be published when it is pending, not skipped, and — if it
   * updates a LIVE record — has been explicitly reviewed. The server enforces
   * the same rule; this only keeps the UI honest about what will happen.
   */
  function blockedReason(item: ImportItem): string | null {
    if (item.status === 'published') return 'Already published'
    if (item.status === 'parse_failed') return 'Could not be parsed'
    if (item.status === 'skipped' || item.action === 'skip') return 'Skipped'
    if (item.action === 'update' && isLive(item)) {
      if (!item.reviewed_at) return 'Needs review before it can go live'
      if (item.apply_mask.length === 0) return 'No changes ticked'
    }
    return null
  }

  const selectable = items.filter((i) => blockedReason(i) === null)
  const selectedItems = items.filter((i) => selected.has(i.id))
  const publishable = selectedItems.filter((i) => blockedReason(i) === null)
  const liveCount = publishable.filter(isLive).length
  const fieldCount = publishable.reduce(
    (sum, i) => sum + (i.action === 'update' ? i.apply_mask.length : 1),
    0
  )

  const savesPending = Object.values(saveStates).some((s) => s === 'saving')

  async function publish() {
    setConfirmOpen(false)
    setPublishing(true)
    setResult(null)

    try {
      const response = await fetch(`/api/admin/import/${importId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds: publishable.map((i) => i.id) }),
      })
      const payload = await response.json()

      if (!response.ok) {
        setResult(payload?.error?.message ?? 'Publishing failed.')
      } else {
        const { published, failed } = payload.data
        setResult(
          failed > 0
            ? `Published ${published}. ${failed} could not be published — see the highlighted items.`
            : `Published ${published} ${published === 1 ? 'record' : 'records'}.`
        )
        setSelected(new Set())
        router.refresh()
      }
    } catch {
      setResult('Network error — some items may not have been published.')
    } finally {
      setPublishing(false)
    }
  }

  const filters: [Filter, string, number][] = [
    ['all', 'All', items.length],
    ['new', 'New', items.filter((i) => i.action === 'create').length],
    ['live', 'Live updates', items.filter(isLive).length],
    [
      'warnings',
      'Needs a look',
      items.filter((i) => i.warnings.length > 0 || (i.confidence ?? 1) < 0.7).length,
    ],
    [
      'failed',
      'Problems',
      items.filter((i) => i.status === 'failed' || i.status === 'parse_failed').length,
    ],
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {filters.map(([key, label, count]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            disabled={count === 0 && key !== 'all'}
            className={`rounded-sm px-3 py-1.5 text-sm ${
              filter === key
                ? 'bg-charcoal text-white'
                : 'border border-gray-300 dark:border-[#2A2A2A] disabled:opacity-40'
            }`}
          >
            {label} ({count})
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-sm border border-gray-200 dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A] p-3">
        <button
          type="button"
          onClick={() =>
            setSelected(
              selected.size === selectable.length
                ? new Set()
                : new Set(selectable.map((i) => i.id))
            )
          }
          className="text-sm underline"
        >
          {selected.size === selectable.length && selectable.length > 0
            ? 'Clear selection'
            : `Select all ready (${selectable.length})`}
        </button>

        {/* Selection count is stable across filtering — it counts items, not rows on screen. */}
        <span className="text-sm text-gray-warm">{selected.size} selected</span>

        <div className="ml-auto flex items-center gap-3">
          {savesPending && (
            <span className="inline-flex items-center gap-1 text-sm text-gray-warm">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Saving edits…
            </span>
          )}
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={publishable.length === 0 || publishing || savesPending}
            className="inline-flex items-center gap-2 rounded-sm bg-charcoal px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {publishing && <Loader2 className="h-4 w-4 animate-spin" />}
            Publish {publishable.length > 0 ? publishable.length : ''}
          </button>
        </div>
      </div>

      {selected.size > publishable.length && (
        <p className="text-sm text-amber-800 dark:text-amber-300" aria-live="polite">
          {selected.size - publishable.length} selected{' '}
          {selected.size - publishable.length === 1 ? 'item is' : 'items are'} not ready to
          publish and will be left out.
        </p>
      )}

      {result && (
        <p
          className="rounded-sm bg-gray-50 dark:bg-[#121212] p-3 text-sm text-black dark:text-[#F0F0F0]"
          aria-live="polite"
        >
          {result}
        </p>
      )}

      <div className="space-y-3">
        {visible.map((item) => (
          <ImportItemCard
            key={item.id}
            item={item}
            importId={importId}
            isLive={isLive(item)}
            selected={selected.has(item.id)}
            onSelectedChange={(checked) =>
              setSelected((prev) => {
                const next = new Set(prev)
                if (checked) next.add(item.id)
                else next.delete(item.id)
                return next
              })
            }
            onItemChange={(updated) =>
              setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
            }
            onSaveStateChange={(id, state) =>
              setSaveStates((prev) => ({ ...prev, [id]: state }))
            }
          />
        ))}

        {visible.length === 0 && (
          <p className="rounded-sm border border-dashed border-gray-300 dark:border-[#2A2A2A] p-8 text-center text-sm text-gray-warm">
            Nothing matches this filter.
          </p>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={publish}
        loading={publishing}
        variant={liveCount > 0 ? 'danger' : 'default'}
        title={`Publish ${publishable.length} ${publishable.length === 1 ? 'item' : 'items'}?`}
        description={
          liveCount > 0
            ? `${liveCount} of these update records that are LIVE on the public site — those ${fieldCount} ticked ${fieldCount === 1 ? 'field goes' : 'fields go'} live immediately. New records are created as drafts.`
            : 'New records are created as drafts. You can review them in Exhibitions or Press before publishing.'
        }
        confirmLabel="Publish"
      />
    </div>
  )
}
