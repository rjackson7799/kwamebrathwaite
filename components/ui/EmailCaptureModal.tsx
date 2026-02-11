'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'

interface EmailCaptureModalProps {
  onEmailCaptured: (email: string) => void
  onClose: () => void
  artworkId?: string
}

export function EmailCaptureModal({
  onEmailCaptured,
  onClose,
  artworkId,
}: EmailCaptureModalProps) {
  const t = useTranslations('works')
  const tCommon = useTranslations('common')
  const [email, setEmail] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Honeypot check
    if (honeypot) return

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError(t('detail.aiRoom.invalidEmail'))
      return
    }

    setIsSubmitting(true)

    try {
      const res = await fetch('/api/generate-room/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase(),
          artwork_id: artworkId,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error?.message || t('detail.aiRoom.error'))
        setIsSubmitting(false)
        return
      }

      // Store in sessionStorage
      sessionStorage.setItem('wallViewEmail', email.toLowerCase())
      onEmailCaptured(email.toLowerCase())
    } catch {
      setError(t('detail.aiRoom.error'))
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center bg-black/60"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="bg-white rounded-lg p-6 sm:p-8 max-w-md w-full mx-4 relative"
        role="dialog"
        aria-modal="true"
        aria-label={t('detail.aiRoom.unlockTitle')}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label={tCommon('close')}
          className="absolute top-3 right-3 p-1 text-gray-warm hover:text-black transition-colors duration-fast"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Sparkle icon */}
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center">
            <svg className="w-6 h-6 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
            </svg>
          </div>
        </div>

        <h3 className="text-h4 text-center mb-2">
          {t('detail.aiRoom.unlockTitle')}
        </h3>
        <p className="text-body-sm text-gray-warm text-center mb-6">
          {t('detail.aiRoom.unlockDescription')}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              ref={inputRef}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('detail.aiRoom.emailPlaceholder')}
              className="input"
              required
              autoComplete="email"
            />
            {error && (
              <p className="text-caption text-error mt-1">{error}</p>
            )}
          </div>

          {/* Honeypot field - hidden from users */}
          <div className="absolute -left-[9999px]" aria-hidden="true">
            <input
              type="text"
              name="website"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-gold w-full"
          >
            {isSubmitting ? tCommon('loading') : t('detail.aiRoom.submit')}
          </button>
        </form>

        <p className="text-caption text-gray-warm text-center mt-4">
          {t('detail.aiRoom.privacyNote')}
        </p>
      </div>
    </div>
  )
}
