'use client'

import { useState, useTransition } from 'react'

export type BriefingNotificationStatus = 'queued' | 'sent' | 'failed' | 'skipped'

export interface BriefingNotificationRow {
  user_id: string
  status: BriefingNotificationStatus
  sent_at: string | null
  error: string | null
}

interface BriefingNotificationPanelProps {
  briefingId: string
  briefingStatus: 'draft' | 'published' | 'archived'
  notifications: BriefingNotificationRow[]
  readCount: number
  onChanged: () => void
}

interface NotifyResult {
  sent: number
  failed: number
  skipped: number
  queued: number
}

export function BriefingNotificationPanel({
  briefingId,
  briefingStatus,
  notifications,
  readCount,
  onChanged,
}: BriefingNotificationPanelProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<NotifyResult | null>(null)

  const tally = notifications.reduce(
    (acc, n) => {
      acc[n.status]++
      return acc
    },
    { queued: 0, sent: 0, failed: 0, skipped: 0 } as Record<BriefingNotificationStatus, number>
  )
  const totalRecipients = tally.queued + tally.sent + tally.failed + tally.skipped

  async function notify() {
    setError(null)
    setLastResult(null)
    const res = await fetch(`/api/admin/briefings/${briefingId}/notify`, { method: 'POST' })
    const json = await res.json()
    if (!json.success) {
      setError(json.error?.message ?? 'Failed to send notifications')
      return
    }
    setLastResult({
      sent: json.data.sent ?? 0,
      failed: json.data.failed ?? 0,
      skipped: json.data.skipped ?? 0,
      queued: json.data.queued ?? 0,
    })
    startTransition(() => onChanged())
  }

  async function retry() {
    setError(null)
    setLastResult(null)
    const res = await fetch(`/api/admin/briefings/${briefingId}/notify/retry`, { method: 'POST' })
    const json = await res.json()
    if (!json.success) {
      setError(json.error?.message ?? 'Retry failed')
      return
    }
    setLastResult({
      sent: json.data.sent ?? 0,
      failed: json.data.failed ?? 0,
      skipped: json.data.skipped ?? 0,
      queued: json.data.queued ?? 0,
    })
    startTransition(() => onChanged())
  }

  const canNotify = briefingStatus === 'published'

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
      <div>
        <h2 className="text-sm font-medium uppercase tracking-wider text-gray-500">
          Notification
        </h2>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {lastResult ? (
        <div
          className={`rounded-md border px-3 py-2 text-sm ${
            lastResult.sent + lastResult.failed + lastResult.skipped + lastResult.queued === 0
              ? 'border-amber-200 bg-amber-50 text-amber-800'
              : 'border-green-200 bg-green-50 text-green-800'
          }`}
        >
          {lastResult.sent + lastResult.failed + lastResult.skipped + lastResult.queued === 0
            ? 'No active Founders matched. A Founder must have signed in at least once (status=active) before they can be notified.'
            : `Result: sent ${lastResult.sent} · failed ${lastResult.failed} · skipped (opted-out) ${lastResult.skipped}.`}
        </div>
      ) : null}

      {totalRecipients === 0 ? (
        <p className="text-sm text-gray-600">
          {canNotify
            ? 'No notifications sent yet. Press the button below to email all active Founders who have not opted out of briefings.'
            : 'Publish the briefing first to enable notification.'}
        </p>
      ) : (
        <dl className="grid grid-cols-4 gap-3 text-center">
          <Stat label="Sent" value={tally.sent} tone="green" />
          <Stat label="Failed" value={tally.failed} tone={tally.failed > 0 ? 'red' : 'gray'} />
          <Stat label="Skipped" value={tally.skipped} tone="gray" />
          <Stat label="Pending" value={tally.queued} tone={tally.queued > 0 ? 'amber' : 'gray'} />
        </dl>
      )}

      {readCount > 0 ? (
        <p className="text-xs text-gray-500">
          {readCount} of {totalRecipients || '—'} founders have opened this briefing.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-100">
        <button
          type="button"
          onClick={notify}
          disabled={!canNotify || isPending}
          className="px-3 py-1.5 bg-black text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-50"
        >
          {totalRecipients === 0 ? 'Notify Founders' : 'Send to new recipients'}
        </button>
        <button
          type="button"
          onClick={retry}
          disabled={tally.failed === 0 || isPending}
          className="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          Retry failed ({tally.failed})
        </button>
      </div>

      {tally.failed > 0 ? (
        <details className="text-xs">
          <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
            Show failure details
          </summary>
          <ul className="mt-2 space-y-1 text-gray-600">
            {notifications
              .filter((n) => n.status === 'failed')
              .map((n) => (
                <li key={n.user_id} className="font-mono">
                  {n.user_id.slice(0, 8)}… — {n.error ?? 'unknown error'}
                </li>
              ))}
          </ul>
        </details>
      ) : null}
    </div>
  )
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'green' | 'red' | 'amber' | 'gray'
}) {
  const colors = {
    green: 'text-green-700',
    red: 'text-red-700',
    amber: 'text-amber-700',
    gray: 'text-gray-600',
  } as const
  return (
    <div>
      <div className={`text-2xl font-light ${colors[tone]}`}>{value}</div>
      <div className="text-xs uppercase tracking-wider text-gray-500">{label}</div>
    </div>
  )
}
