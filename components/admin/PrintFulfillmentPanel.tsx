'use client'

import { useEffect, useState, useCallback } from 'react'

interface FulfillmentRow {
  user_id: string
  edition_number: number | null
  is_ap: boolean
  status: 'pending' | 'in_production' | 'ready' | 'shipped' | 'delivered'
  shipped_at: string | null
  delivered_at: string | null
  tracking_url: string | null
  internal_notes: string | null
}

interface PrintFulfillmentPanelProps {
  founderId: string
}

const STATUSES: FulfillmentRow['status'][] = [
  'pending',
  'in_production',
  'ready',
  'shipped',
  'delivered',
]

function toDateTimeLocal(value: string | null): string {
  if (!value) return ''
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return value
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  )
}

export function PrintFulfillmentPanel({ founderId }: PrintFulfillmentPanelProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [editionNumber, setEditionNumber] = useState<string>('')
  const [isAp, setIsAp] = useState(false)
  const [status, setStatus] = useState<FulfillmentRow['status']>('pending')
  const [shippedAt, setShippedAt] = useState('')
  const [deliveredAt, setDeliveredAt] = useState('')
  const [trackingUrl, setTrackingUrl] = useState('')
  const [internalNotes, setInternalNotes] = useState('')
  const [hasRow, setHasRow] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/founders/${founderId}/print-fulfillment`)
      const json = await res.json()
      if (!json.success) {
        setError(json.error?.message ?? 'Failed to load fulfillment')
        return
      }
      const row = json.data.fulfillment as FulfillmentRow | null
      if (row) {
        setHasRow(true)
        setEditionNumber(row.edition_number?.toString() ?? '')
        setIsAp(row.is_ap ?? false)
        setStatus(row.status)
        setShippedAt(toDateTimeLocal(row.shipped_at))
        setDeliveredAt(toDateTimeLocal(row.delivered_at))
        setTrackingUrl(row.tracking_url ?? '')
        setInternalNotes(row.internal_notes ?? '')
      } else {
        setHasRow(false)
      }
    } finally {
      setLoading(false)
    }
  }, [founderId])

  useEffect(() => {
    load()
  }, [load])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    const payload = {
      edition_number: editionNumber.trim() ? Number(editionNumber) : null,
      is_ap: isAp,
      status,
      shipped_at: shippedAt || null,
      delivered_at: deliveredAt || null,
      tracking_url: trackingUrl.trim() || null,
      internal_notes: internalNotes.trim() || null,
    }

    try {
      const res = await fetch(`/api/admin/founders/${founderId}/print-fulfillment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!json.success) {
        setError(json.error?.message ?? 'Failed to save fulfillment')
        return
      }
      setSuccess(hasRow ? 'Fulfillment updated.' : 'Fulfillment record created.')
      setHasRow(true)
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!confirm('Delete the fulfillment record for this founder? This cannot be undone.')) {
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/founders/${founderId}/print-fulfillment`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (!json.success) {
        setError(json.error?.message ?? 'Failed to delete fulfillment')
        return
      }
      // Reset to a blank form
      setHasRow(false)
      setEditionNumber('')
      setIsAp(false)
      setStatus('pending')
      setShippedAt('')
      setDeliveredAt('')
      setTrackingUrl('')
      setInternalNotes('')
      setSuccess('Fulfillment record deleted.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <p className="text-sm text-gray-500">Loading fulfillment…</p>
      </div>
    )
  }

  return (
    <form onSubmit={save} className="bg-white border border-gray-200 rounded-lg p-6 space-y-5">
      <div>
        <h2 className="text-sm font-medium uppercase tracking-wider text-gray-500">
          Print fulfillment
        </h2>
        <p className="text-xs text-gray-400 mt-1">
          Tracks this founder&rsquo;s physical framed print through production and shipping.
        </p>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {success}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">
            Edition number
          </label>
          <input
            type="number"
            min={1}
            className="input w-full"
            value={editionNumber}
            onChange={(e) => setEditionNumber(e.target.value)}
            placeholder="e.g. 12"
          />
          <p className="mt-1 text-xs text-gray-400">
            {isAp
              ? 'Artist’s Proof number: 1 or 2. Unique among APs.'
              : 'Numbered edition: 1–15. Unique among numbered editions.'}{' '}
            Leave blank until production assigns one.
          </p>
          <label className="mt-3 flex items-center gap-2 text-xs font-medium text-gray-600">
            <input
              type="checkbox"
              checked={isAp}
              onChange={(e) => setIsAp(e.target.checked)}
              className="h-4 w-4"
            />
            Artist’s Proof (AP) — labelled “AP n/2” instead of “Edition n of 15”
          </label>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Status</label>
          <select
            className="input w-full"
            value={status}
            onChange={(e) => setStatus(e.target.value as FulfillmentRow['status'])}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Shipped at</label>
          <input
            type="datetime-local"
            className="input w-full"
            value={shippedAt}
            onChange={(e) => setShippedAt(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Delivered at</label>
          <input
            type="datetime-local"
            className="input w-full"
            value={deliveredAt}
            onChange={(e) => setDeliveredAt(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Tracking URL</label>
        <input
          type="url"
          className="input w-full"
          value={trackingUrl}
          onChange={(e) => setTrackingUrl(e.target.value)}
          placeholder="https://..."
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">
          Internal notes
        </label>
        <textarea
          rows={3}
          className="input resize-none w-full"
          value={internalNotes}
          onChange={(e) => setInternalNotes(e.target.value)}
          placeholder="Admin-only. Never shown to the founder."
        />
        <p className="mt-1 text-xs text-amber-700">
          Internal — never shown to the founder.
        </p>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-black text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-50"
        >
          {saving ? 'Saving…' : hasRow ? 'Update' : 'Create record'}
        </button>
        {hasRow ? (
          <button
            type="button"
            onClick={remove}
            disabled={saving}
            className="px-3 py-1.5 border border-red-300 text-red-700 text-sm font-medium rounded-md hover:bg-red-50 disabled:opacity-50"
          >
            Delete record
          </button>
        ) : null}
      </div>
    </form>
  )
}
