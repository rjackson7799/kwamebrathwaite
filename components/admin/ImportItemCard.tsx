'use client'

import { useCallback, useRef, useState } from 'react'
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Loader2,
  RefreshCw,
  Radio,
} from 'lucide-react'
import { FormField, Input, Select, Textarea } from './FormField'
import { ImportMatchDiff, type FieldDiff } from './ImportMatchDiff'

export interface ImportItem {
  id: string
  source_index: number
  source_text: string
  target_type: 'exhibition' | 'press'
  entry_kind: string | null
  parsed_data: Record<string, unknown>
  edited_data: Record<string, unknown> | null
  apply_mask: string[]
  reviewed_at: string | null
  confidence: number | null
  warnings: string[]
  match_exhibition_id: string | null
  match_press_id: string | null
  match_summary: Record<string, FieldDiff> | null
  match_snapshot: { id: string; title: string; status?: string } | null
  match_target_updated_at: string | null
  action: 'create' | 'update' | 'skip'
  status: string
  error_message: string | null
}

type SaveState = 'clean' | 'dirty' | 'saving' | 'saved' | 'error'

interface ImportItemCardProps {
  item: ImportItem
  importId: string
  selected: boolean
  /** True when the matched record is currently published. */
  isLive: boolean
  onSelectedChange: (selected: boolean) => void
  onItemChange: (item: ImportItem) => void
  onSaveStateChange: (itemId: string, state: SaveState) => void
}

const EXHIBITION_FIELDS = [
  { key: 'title', label: 'Title', type: 'text' },
  { key: 'venue', label: 'Venue', type: 'text' },
  { key: 'city', label: 'City', type: 'text' },
  { key: 'state_region', label: 'State / region', type: 'text' },
  { key: 'country', label: 'Country', type: 'text' },
  { key: 'start_date', label: 'Start date', type: 'date' },
  { key: 'end_date', label: 'End date', type: 'date' },
  { key: 'exhibition_url', label: 'Exhibition URL', type: 'url' },
  { key: 'venue_url', label: 'Venue URL', type: 'url' },
] as const

const PRESS_FIELDS = [
  { key: 'title', label: 'Title', type: 'text' },
  { key: 'publication', label: 'Publication', type: 'text' },
  { key: 'author', label: 'Author', type: 'text' },
  { key: 'publish_date', label: 'Published', type: 'date' },
  { key: 'url', label: 'URL', type: 'url' },
] as const

export function ImportItemCard({
  item,
  importId,
  selected,
  isLive,
  onSelectedChange,
  onItemChange,
  onSaveStateChange,
}: ImportItemCardProps) {
  const [expanded, setExpanded] = useState(
    () => (item.confidence ?? 1) < 0.7 || item.warnings.length > 0 || item.status === 'failed'
  )
  const [saveState, setSaveState] = useState<SaveState>('clean')
  const [notices, setNotices] = useState<string[]>([])

  // Saves are serialized per card: a queued PATCH waits for the in-flight one,
  // so two blur events can never land out of order and clobber each other.
  const queue = useRef<Promise<unknown>>(Promise.resolve())

  const effective = { ...(item.parsed_data ?? {}), ...(item.edited_data ?? {}) }
  const fields = item.target_type === 'exhibition' ? EXHIBITION_FIELDS : PRESS_FIELDS
  const isParseFailed = item.status === 'parse_failed'
  const isPublished = item.status === 'published'
  const isSkipped = item.status === 'skipped'
  const needsReview = isLive && item.action === 'update' && !item.reviewed_at

  const setState = useCallback(
    (state: SaveState) => {
      setSaveState(state)
      onSaveStateChange(item.id, state)
    },
    [item.id, onSaveStateChange]
  )

  const patch = useCallback(
    (body: Record<string, unknown>) => {
      setState('saving')
      queue.current = queue.current
        .then(async () => {
          const response = await fetch(
            `/api/admin/import/${importId}/items/${item.id}`,
            {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            }
          )
          const payload = await response.json()
          if (!response.ok) {
            setState('error')
            setNotices([payload?.error?.message ?? 'Could not save this change.'])
            return
          }
          onItemChange(payload.data.item)
          setNotices(payload.data.notices ?? [])
          setState('saved')
        })
        .catch(() => setState('error'))
      return queue.current
    },
    [importId, item.id, onItemChange, setState]
  )

  function onFieldBlur(key: string, value: string) {
    const current = effective[key]
    const next = value === '' ? null : value
    if (String(current ?? '') === String(next ?? '')) return
    patch({ edited_data: { [key]: next } })
  }

  const confidence = item.confidence ?? 1
  const lowConfidence = confidence < 0.7

  return (
    <article
      className={`rounded-sm border bg-white dark:bg-[#1A1A1A] ${
        needsReview
          ? 'border-gold'
          : item.status === 'failed'
            ? 'border-red-400'
            : 'border-gray-200 dark:border-[#2A2A2A]'
      }`}
    >
      <header className="flex items-start gap-3 p-4">
        <input
          type="checkbox"
          checked={selected}
          disabled={isPublished || isSkipped || isParseFailed}
          onChange={(e) => onSelectedChange(e.target.checked)}
          aria-label={`Select ${String(effective.title ?? 'item')}`}
          className="mt-1.5 h-4 w-4 flex-shrink-0"
        />

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-0.5 flex-shrink-0 text-gray-warm"
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-medium text-black dark:text-[#F0F0F0]">
              {String(effective.title ?? '(untitled)')}
            </h3>

            {isLive && (
              <span className="inline-flex items-center gap-1 rounded-sm bg-red-100 dark:bg-red-950/40 px-2 py-0.5 text-caption font-semibold text-red-700 dark:text-red-300">
                <Radio className="h-3 w-3" />
                LIVE
              </span>
            )}
            {item.action === 'update' && !isLive && (
              <span className="rounded-sm bg-charcoal/10 dark:bg-[#2A2A2A] px-2 py-0.5 text-caption">
                Updates a draft
              </span>
            )}
            {item.action === 'create' && (
              <span className="rounded-sm bg-charcoal/10 dark:bg-[#2A2A2A] px-2 py-0.5 text-caption">
                New
              </span>
            )}
            {item.entry_kind && item.entry_kind !== 'exhibition' && (
              <span className="rounded-sm bg-charcoal/10 dark:bg-[#2A2A2A] px-2 py-0.5 text-caption capitalize">
                {item.entry_kind}
              </span>
            )}
            {lowConfidence && !isParseFailed && (
              <span className="rounded-sm bg-amber-100 dark:bg-amber-950/40 px-2 py-0.5 text-caption text-amber-800 dark:text-amber-300">
                Low confidence
              </span>
            )}
            {isPublished && (
              <span className="inline-flex items-center gap-1 rounded-sm bg-green-100 dark:bg-green-950/40 px-2 py-0.5 text-caption text-green-800 dark:text-green-300">
                <Check className="h-3 w-3" /> Published
              </span>
            )}
            {isSkipped && <span className="text-caption text-gray-warm">Skipped</span>}
          </div>

          <p className="mt-1 text-caption text-gray-warm">
            {[effective.venue, effective.city, effective.start_date]
              .filter(Boolean)
              .map(String)
              .join(' · ') || 'No location or date detected'}
          </p>
        </div>

        <div className="flex-shrink-0 text-caption text-gray-warm" aria-live="polite">
          {saveState === 'saving' && <Loader2 className="h-4 w-4 animate-spin" />}
          {saveState === 'saved' && 'Saved'}
          {saveState === 'error' && <span className="text-red-600">Not saved</span>}
        </div>
      </header>

      {expanded && (
        <div className="border-t border-gray-200 dark:border-[#2A2A2A] p-4 space-y-5">
          {isParseFailed ? (
            <div className="space-y-2">
              <p className="flex items-start gap-2 text-sm text-red-700 dark:text-red-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                {item.error_message ?? 'This section could not be parsed.'}
              </p>
              <pre className="overflow-x-auto rounded-sm bg-gray-50 dark:bg-[#121212] p-3 text-caption whitespace-pre-wrap">
                {item.source_text}
              </pre>
            </div>
          ) : (
            <>
              {item.warnings.length > 0 && (
                <ul className="space-y-1">
                  {item.warnings.map((warning, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-300"
                    >
                      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                      {warning}
                    </li>
                  ))}
                </ul>
              )}

              {item.status === 'failed' && item.error_message && (
                <div
                  role="alert"
                  className="flex items-start justify-between gap-3 rounded-sm bg-red-50 dark:bg-red-950/30 p-3"
                >
                  <span className="text-sm text-red-700 dark:text-red-300">
                    {item.error_message}
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      const endpoint = /changed after it was matched|STALE_TARGET/i.test(
                        item.error_message ?? ''
                      )
                        ? 'rematch'
                        : 'retry'
                      const response = await fetch(
                        `/api/admin/import/${importId}/items/${item.id}/${endpoint}`,
                        { method: 'POST' }
                      )
                      const payload = await response.json()
                      if (response.ok) onItemChange(payload.data.item)
                    }}
                    className="inline-flex flex-shrink-0 items-center gap-1 text-sm underline"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    {/changed after it was matched|STALE_TARGET/i.test(item.error_message ?? '')
                      ? 'Refresh match'
                      : 'Retry'}
                  </button>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                {fields.map((field) => (
                  <FormField key={field.key} label={field.label} htmlFor={`${item.id}-${field.key}`}>
                    <Input
                      id={`${item.id}-${field.key}`}
                      type={field.type}
                      defaultValue={String(effective[field.key] ?? '')}
                      disabled={isPublished}
                      onBlur={(e) => onFieldBlur(field.key, e.target.value)}
                    />
                  </FormField>
                ))}

                {item.target_type === 'exhibition' && (
                  <FormField label="Entry kind" htmlFor={`${item.id}-entry_kind`}>
                    <Select
                      id={`${item.id}-entry_kind`}
                      defaultValue={item.entry_kind ?? 'exhibition'}
                      disabled={isPublished}
                      onChange={(e) => patch({ entry_kind: e.target.value })}
                    >
                      <option value="exhibition">Exhibition</option>
                      <option value="screening">Screening</option>
                      <option value="talk">Talk</option>
                      <option value="event">Event</option>
                    </Select>
                  </FormField>
                )}
              </div>

              <FormField label="Description" htmlFor={`${item.id}-description`}>
                <Textarea
                  id={`${item.id}-description`}
                  rows={3}
                  defaultValue={String(effective.description ?? effective.excerpt ?? '')}
                  disabled={isPublished}
                  onBlur={(e) =>
                    onFieldBlur(
                      item.target_type === 'exhibition' ? 'description' : 'excerpt',
                      e.target.value
                    )
                  }
                />
              </FormField>

              {item.match_summary && item.action === 'update' && (
                <section className="rounded-sm bg-gray-50 dark:bg-[#121212] p-4">
                  <h4 className="text-sm font-medium text-black dark:text-[#F0F0F0]">
                    {isLive ? 'Changes to a LIVE record' : 'Changes to an existing draft'}
                  </h4>
                  {isLive && (
                    <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                      This record is published. Ticked changes go live immediately.
                    </p>
                  )}
                  <div className="mt-3">
                    <ImportMatchDiff
                      summary={item.match_summary}
                      applyMask={item.apply_mask}
                      isLive={isLive}
                      disabled={isPublished}
                      onToggle={(field, checked) => {
                        const next = checked
                          ? [...item.apply_mask, field]
                          : item.apply_mask.filter((f) => f !== field)
                        patch({ apply_mask: next })
                      }}
                    />
                  </div>

                  {needsReview && (
                    <button
                      type="button"
                      onClick={() => patch({ reviewed: true })}
                      className="mt-4 rounded-sm bg-charcoal px-4 py-2 text-sm font-medium text-white hover:bg-black"
                    >
                      I have reviewed these changes
                    </button>
                  )}
                  {isLive && item.reviewed_at && (
                    <p className="mt-3 inline-flex items-center gap-1 text-sm text-green-700 dark:text-green-400">
                      <Check className="h-4 w-4" /> Reviewed — this item can be published.
                    </p>
                  )}
                </section>
              )}

              <details className="text-caption">
                <summary className="cursor-pointer text-gray-warm">
                  Show the original pasted text
                </summary>
                <pre className="mt-2 overflow-x-auto rounded-sm bg-gray-50 dark:bg-[#121212] p-3 whitespace-pre-wrap">
                  {item.source_text}
                </pre>
              </details>

              {notices.length > 0 && (
                <ul className="space-y-1" aria-live="polite">
                  {notices.map((notice, i) => (
                    <li key={i} className="text-sm text-amber-800 dark:text-amber-300">
                      {notice}
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => patch({ action: isSkipped ? 'create' : 'skip' })}
                  disabled={isPublished}
                  className="rounded-sm border border-gray-300 dark:border-[#2A2A2A] px-3 py-1.5 text-sm disabled:opacity-40"
                >
                  {isSkipped ? 'Un-skip' : 'Skip this entry'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </article>
  )
}
