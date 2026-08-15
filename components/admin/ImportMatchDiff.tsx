'use client'

import { AlertTriangle } from 'lucide-react'

export interface FieldDiff {
  from: unknown
  to: unknown
  changed: boolean
}

interface ImportMatchDiffProps {
  summary: Record<string, FieldDiff>
  applyMask: string[]
  /** True when the matched record is live on the public site. */
  isLive: boolean
  disabled?: boolean
  onToggle: (field: string, checked: boolean) => void
}

function display(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'string' && value.length > 120) return `${value.slice(0, 120)}…`
  return String(value)
}

const FIELD_LABELS: Record<string, string> = {
  title: 'Title',
  venue: 'Venue',
  city: 'City',
  state_region: 'State / region',
  country: 'Country',
  start_date: 'Start date',
  end_date: 'End date',
  description: 'Description',
  entry_kind: 'Entry kind',
  venue_url: 'Venue URL',
  exhibition_url: 'Exhibition URL',
  publication: 'Publication',
  author: 'Author',
  publish_date: 'Published',
  url: 'URL',
  excerpt: 'Excerpt',
  press_type: 'Press type',
}

export function ImportMatchDiff({
  summary,
  applyMask,
  isLive,
  disabled,
  onToggle,
}: ImportMatchDiffProps) {
  const changed = Object.entries(summary).filter(([, diff]) => diff.changed)

  if (changed.length === 0) {
    return (
      <p className="text-sm text-gray-warm">
        Nothing differs from the existing record — there is nothing to apply.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-warm">
        {isLive
          ? 'Tick each change you want written to the live record. Nothing is written unless you tick it.'
          : 'Tick the changes to apply.'}
      </p>

      <ul className="divide-y divide-gray-200 dark:divide-[#2A2A2A] rounded-sm border border-gray-200 dark:border-[#2A2A2A]">
        {changed.map(([field, diff]) => {
          const inputId = `apply-${field}`
          return (
            <li key={field} className="flex items-start gap-3 p-3">
              <input
                id={inputId}
                type="checkbox"
                checked={applyMask.includes(field)}
                disabled={disabled}
                onChange={(e) => onToggle(field, e.target.checked)}
                className="mt-1 h-4 w-4 flex-shrink-0"
              />
              <label htmlFor={inputId} className="min-w-0 flex-1 cursor-pointer">
                <span className="block text-sm font-medium text-black dark:text-[#F0F0F0]">
                  {FIELD_LABELS[field] ?? field}
                </span>
                <span className="mt-1 block text-sm">
                  <span className="text-gray-warm line-through break-words">
                    {display(diff.from)}
                  </span>
                  <span className="mx-2 text-gray-warm" aria-hidden="true">
                    →
                  </span>
                  <span className="text-black dark:text-[#F0F0F0] break-words">
                    {display(diff.to)}
                  </span>
                </span>
              </label>
            </li>
          )
        })}
      </ul>

      {isLive && applyMask.length === 0 && (
        <p className="flex items-start gap-2 text-sm text-gray-warm">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          No changes ticked — this item will be skipped when you publish.
        </p>
      )}
    </div>
  )
}
