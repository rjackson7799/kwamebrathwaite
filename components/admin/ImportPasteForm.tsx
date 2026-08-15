'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Sparkles, AlertCircle } from 'lucide-react'
import { FormField, Input, Textarea } from './FormField'

const MAX_INPUT_CHARS = 40000

export function ImportPasteForm() {
  const router = useRouter()
  const [rawText, setRawText] = useState('')
  const [sourceLabel, setSourceLabel] = useState('')
  const [status, setStatus] = useState<'idle' | 'parsing'>('idle')
  const [error, setError] = useState<string | null>(null)
  /** Set when the server asks for confirmation on an expensive parse. */
  const [costConfirm, setCostConfirm] = useState<number | null>(null)

  const overLimit = rawText.length > MAX_INPUT_CHARS
  const canSubmit = rawText.trim().length > 0 && !overLimit && status === 'idle'

  async function submit(confirmedEstimate?: number) {
    setStatus('parsing')
    setError(null)

    try {
      const response = await fetch('/api/admin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raw_text: rawText,
          source_label: sourceLabel || null,
          ...(confirmedEstimate !== undefined
            ? { confirmed_cost_estimate: confirmedEstimate }
            : {}),
        }),
      })

      const body = await response.json()

      if (response.status === 409 && body?.error?.code === 'COST_CONFIRMATION_REQUIRED') {
        setCostConfirm(body.error.details?.estimated_cost_usd ?? 0)
        setStatus('idle')
        return
      }

      if (!response.ok) {
        setError(body?.error?.message || 'Could not parse that text.')
        setStatus('idle')
        return
      }

      router.push(`/admin/import/${body.data.id}`)
    } catch {
      setError('Network error — the import did not start.')
      setStatus('idle')
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="rounded-sm border border-gray-200 dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A] p-6">
        <h2 className="text-lg font-medium text-black dark:text-[#F0F0F0]">
          Paste a schedule or press list
        </h2>
        <p className="mt-1 text-sm text-gray-warm">
          Paste the raw text exactly as you have it. Every entry is parsed into a
          draft you review and correct before anything is published.
        </p>

        <div className="mt-6 space-y-4">
          <FormField
            label="Label"
            htmlFor="source_label"
            hint="Optional — helps you find this batch later, e.g. “2026 schedule, Feb update”"
          >
            <Input
              id="source_label"
              value={sourceLabel}
              onChange={(e) => setSourceLabel(e.target.value)}
              placeholder="2026 exhibit schedule"
              disabled={status === 'parsing'}
            />
          </FormField>

          <FormField
            label="Pasted text"
            htmlFor="raw_text"
            required
            error={overLimit ? 'That paste is too long — split it into smaller batches.' : undefined}
          >
            <Textarea
              id="raw_text"
              rows={16}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              disabled={status === 'parsing'}
              className="font-mono text-sm"
              placeholder={
                'Documentary Screening for African Film Festival Australia\nParramatta, AU\nSeptember 6, 2026\n\nSolo Exhibition in collaboration with…\nYou and I\nPhilip Martin Gallery, Los Angeles, CA\nOctober 1, 2026 - October 31, 2026'
              }
            />
          </FormField>

          <div
            className={`text-caption ${overLimit ? 'text-red-600 dark:text-red-400' : 'text-gray-warm'}`}
            aria-live="polite"
          >
            {rawText.length.toLocaleString()} / {MAX_INPUT_CHARS.toLocaleString()} characters
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-4 flex gap-2 rounded-sm bg-red-50 dark:bg-red-950/30 p-3 text-sm text-red-700 dark:text-red-300"
          >
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {costConfirm !== null && (
          <div className="mt-4 rounded-sm border border-gold/40 bg-gold/10 p-4">
            <p className="text-sm text-black dark:text-[#F0F0F0]">
              That is a large paste — parsing it will cost roughly{' '}
              <strong>${costConfirm.toFixed(2)}</strong>.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setCostConfirm(null)
                  submit(costConfirm)
                }}
                className="rounded-sm bg-charcoal px-4 py-2 text-sm font-medium text-white hover:bg-black"
              >
                Parse anyway
              </button>
              <button
                type="button"
                onClick={() => setCostConfirm(null)}
                className="rounded-sm border border-gray-300 dark:border-[#2A2A2A] px-4 py-2 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={() => submit()}
            disabled={!canSubmit}
            className="inline-flex items-center gap-2 rounded-sm bg-charcoal px-5 py-2.5 text-sm font-medium text-white hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {status === 'parsing' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Reading your text…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Parse
              </>
            )}
          </button>
          {status === 'parsing' && (
            <span className="text-sm text-gray-warm" aria-live="polite">
              This can take up to a minute for a long list.
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
