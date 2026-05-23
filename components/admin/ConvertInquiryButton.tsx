'use client'

import { useState } from 'react'

interface Props {
  inquiryId: string
  defaultName: string
  defaultEmail: string
  defaultLocale: string
  onConverted: (founderId: string) => void
}

/**
 * "Convert to Founder invitation" action on the inquiry detail page.
 * Opens an inline dialog with prefilled name/locale that the admin can adjust,
 * plus an optional personal note that flows into the invitation email.
 */
export function ConvertInquiryButton({
  inquiryId,
  defaultName,
  defaultEmail,
  defaultLocale,
  onConverted,
}: Props) {
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fullName, setFullName] = useState(defaultName)
  const [preferredLocale, setPreferredLocale] = useState<'en' | 'fr' | 'ja'>(
    (defaultLocale === 'fr' || defaultLocale === 'ja' ? defaultLocale : 'en') as
      | 'en'
      | 'fr'
      | 'ja'
  )
  const [personalNote, setPersonalNote] = useState('')

  const handleConvert = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/inquiries/${inquiryId}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          personal_note: personalNote || null,
          preferred_locale: preferredLocale,
        }),
      })
      const json = await res.json()
      if (!json.success) {
        setError(json.error?.message || 'Failed to convert inquiry')
        setSubmitting(false)
        return
      }
      onConverted(json.data.founder.user_id)
    } catch (err) {
      console.error('ConvertInquiryButton submit:', err)
      setError('Failed to convert inquiry')
      setSubmitting(false)
    }
  }

  if (!open) {
    return (
      <div className="bg-[#0e0e0e] text-[#E6E2D6] rounded-md px-5 py-4 mb-6 flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-[#C9A961] mb-1">
            Founder&rsquo;s Circle action
          </p>
          <p className="text-sm">
            Convert this inquiry into a Founder invitation. An auth account
            will be provisioned and the magic-link email will go out
            immediately.
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="px-4 py-2 bg-[#C9A961] hover:bg-[#d4b572] text-[#0e0e0e] text-xs uppercase tracking-[0.14em] font-medium rounded-sm"
        >
          Convert to invitation
        </button>
      </div>
    )
  }

  return (
    <div className="bg-[#0e0e0e] text-[#E6E2D6] rounded-md px-6 py-5 mb-6">
      <p className="text-[10px] uppercase tracking-[0.16em] text-[#C9A961] mb-3">
        Convert to Founder invitation
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-[11px] uppercase tracking-wider text-[#C9A961] mb-1">
            Full name
          </label>
          <input
            className="w-full bg-transparent border-0 border-b border-[#3a3a3a] py-1.5 text-[#E6E2D6] focus:outline-none focus:border-[#C9A961]"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-[11px] uppercase tracking-wider text-[#C9A961] mb-1">
            Email (read-only)
          </label>
          <input
            className="w-full bg-transparent border-0 border-b border-[#3a3a3a] py-1.5 text-[#8a8a8a]"
            value={defaultEmail}
            readOnly
          />
        </div>

        <div>
          <label className="block text-[11px] uppercase tracking-wider text-[#C9A961] mb-1">
            Preferred locale
          </label>
          <select
            className="bg-[#0e0e0e] border border-[#3a3a3a] rounded-sm py-1.5 px-2 text-[#E6E2D6] focus:outline-none focus:border-[#C9A961]"
            value={preferredLocale}
            onChange={(e) => setPreferredLocale(e.target.value as 'en' | 'fr' | 'ja')}
          >
            <option value="en">English</option>
            <option value="fr">Français</option>
            <option value="ja">日本語</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] uppercase tracking-wider text-[#C9A961] mb-1">
            Personal note in invitation email (optional)
          </label>
          <textarea
            rows={3}
            className="w-full bg-transparent border border-[#3a3a3a] rounded-sm p-2 text-sm text-[#E6E2D6] placeholder-[#5a5a5a] focus:outline-none focus:border-[#C9A961] resize-none"
            value={personalNote}
            onChange={(e) => setPersonalNote(e.target.value)}
            placeholder="A short personal note that will appear in the invitation email."
          />
        </div>

        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleConvert}
            disabled={submitting || !fullName.trim()}
            className="px-4 py-2 bg-[#C9A961] hover:bg-[#d4b572] text-[#0e0e0e] text-xs uppercase tracking-[0.14em] font-medium rounded-sm disabled:opacity-50"
          >
            {submitting ? 'Sending invitation…' : 'Send invitation'}
          </button>
          <button
            onClick={() => setOpen(false)}
            disabled={submitting}
            className="px-4 py-2 text-xs uppercase tracking-[0.14em] text-[#8a8a8a] hover:text-[#E6E2D6] disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
