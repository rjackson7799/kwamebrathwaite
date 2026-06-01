'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  givebutterUrl: string
  initiallyAccepted: boolean
  labels: {
    termsAgree: string
    donate: string
    accepting: string
    decline: string
    declineConfirm: string
    error: string
  }
}

// Invitation-page actions. Accepting the terms (checkbox) records
// terms_accepted_at server-side and unlocks the donate button. The donate
// button links out to Givebutter. Self-decline confirms, then refreshes so the
// page re-reads status and renders the closed state.
export function InvitationActions({ givebutterUrl, initiallyAccepted, labels }: Props) {
  const router = useRouter()
  const [accepted, setAccepted] = useState(initiallyAccepted)
  const [accepting, setAccepting] = useState(false)
  const [declining, setDeclining] = useState(false)

  const onToggleTerms = async (checked: boolean) => {
    // Acceptance is sticky — once recorded it stays recorded.
    if (!checked || accepted) {
      setAccepted(checked && accepted)
      return
    }
    setAccepting(true)
    try {
      const res = await fetch('/api/founders/accept-terms', { method: 'POST' })
      const json = await res.json()
      if (json.success && json.data?.accepted) {
        setAccepted(true)
      } else {
        alert(labels.error)
      }
    } catch {
      alert(labels.error)
    } finally {
      setAccepting(false)
    }
  }

  const onDecline = async () => {
    if (!window.confirm(labels.declineConfirm)) return
    setDeclining(true)
    try {
      const res = await fetch('/api/founders/decline', { method: 'POST' })
      const json = await res.json()
      if (json.success) {
        router.refresh()
      } else {
        alert(labels.error)
      }
    } catch {
      alert(labels.error)
    } finally {
      setDeclining(false)
    }
  }

  return (
    <div className="space-y-6">
      <label className="flex items-start gap-3 cursor-pointer max-w-xl">
        <input
          type="checkbox"
          checked={accepted}
          disabled={accepting || accepted}
          onChange={(e) => onToggleTerms(e.target.checked)}
          className="mt-1 h-4 w-4 accent-[#C9A961]"
        />
        <span className="text-sm text-[#C0BBA8] leading-relaxed">{labels.termsAgree}</span>
      </label>

      <div className="flex flex-wrap items-center gap-6">
        {accepted ? (
          <a
            href={givebutterUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 bg-[#C9A961] text-[#0e0e0e] text-sm font-medium rounded-md hover:bg-[#d8bd7e] transition-colors"
          >
            {labels.donate}
          </a>
        ) : (
          <button
            type="button"
            disabled
            aria-disabled="true"
            className="px-6 py-3 bg-[#2a2620] text-[#7a745f] text-sm font-medium rounded-md cursor-not-allowed"
          >
            {accepting ? labels.accepting : labels.donate}
          </button>
        )}

        <button
          type="button"
          onClick={onDecline}
          disabled={declining}
          className="text-sm text-[#8a8473] underline underline-offset-4 hover:text-[#C0BBA8] disabled:opacity-50"
        >
          {labels.decline}
        </button>
      </div>
    </div>
  )
}
