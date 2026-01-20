'use client'

import { useState, useEffect, useRef } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import type { MapExhibition, ReminderFormData } from './types'

interface ReminderModalProps {
  exhibition: MapExhibition
  onClose: () => void
  source?: 'map' | 'detail_page' | 'list'
}

export function ReminderModal({
  exhibition,
  onClose,
  source = 'map',
}: ReminderModalProps) {
  const t = useTranslations('exhibitions.reminder')
  const locale = useLocale()
  const modalRef = useRef<HTMLDivElement>(null)

  const [formData, setFormData] = useState<ReminderFormData>({
    name: '',
    email: '',
    reminder_type: 'opening',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Honeypot field
  const [honeypot, setHoneypot] = useState('')

  // Focus trap and escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    // Focus the modal
    modalRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/exhibitions/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exhibition_id: exhibition.id,
          name: formData.name,
          email: formData.email,
          reminder_type: formData.reminder_type,
          locale,
          source,
          website: honeypot, // Honeypot field
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to submit reminder')
      }

      setSuccess(true)

      // Close modal after brief success message
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (err) {
      console.error('Reminder error:', err)
      setError(err instanceof Error ? err.message : t('error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="reminder-modal-title"
    >
      <div
        ref={modalRef}
        className="bg-white w-full max-w-md p-6 rounded-lg shadow-xl"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        {success ? (
          // Success State
          <div className="text-center py-8">
            <div className="text-4xl mb-4">✅</div>
            <p className="text-lg font-medium text-gray-900">{t('success')}</p>
          </div>
        ) : (
          // Form State
          <>
            <h3
              id="reminder-modal-title"
              className="text-lg font-medium mb-4 text-gray-900"
            >
              {t('title')}
            </h3>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Honeypot field - hidden from users, visible to bots */}
              <div className="hidden" aria-hidden="true">
                <label htmlFor="website">Website</label>
                <input
                  type="text"
                  id="website"
                  name="website"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>

              {/* Name */}
              <div>
                <label
                  htmlFor="reminder-name"
                  className="block mb-2 text-xs font-medium uppercase tracking-wider text-gray-700"
                >
                  {t('name')} *
                </label>
                <input
                  type="text"
                  id="reminder-name"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="Your name"
                  disabled={isSubmitting}
                />
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="reminder-email"
                  className="block mb-2 text-xs font-medium uppercase tracking-wider text-gray-700"
                >
                  {t('email')} *
                </label>
                <input
                  type="email"
                  id="reminder-email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="you@example.com"
                  disabled={isSubmitting}
                />
              </div>

              {/* Reminder Type */}
              <div>
                <label
                  htmlFor="reminder-type"
                  className="block mb-2 text-xs font-medium uppercase tracking-wider text-gray-700"
                >
                  {t('type')}
                </label>
                <select
                  id="reminder-type"
                  value={formData.reminder_type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      reminder_type: e.target.value as ReminderFormData['reminder_type'],
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  disabled={isSubmitting}
                >
                  <option value="opening">{t('typeOpening')}</option>
                  <option value="closing">{t('typeClosing')}</option>
                  <option value="both">{t('typeBoth')}</option>
                </select>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors text-sm"
                  disabled={isSubmitting}
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-4 bg-black text-white hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <LoadingSpinner />
                      Submitting...
                    </span>
                  ) : (
                    t('submit')
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

function LoadingSpinner() {
  return (
    <svg
      className="animate-spin h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}
