'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useLocale, useTranslations } from 'next-intl'
import Image from 'next/image'

const inquiryFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  email: z.string().email('Invalid email address').max(255),
  phone: z.string().max(50).optional(),
  inquiry_type: z.enum(['purchase', 'exhibition', 'press', 'general']),
  message: z.string().min(1, 'Message is required').max(5000),
  website: z.string().optional(), // Honeypot
})

type InquiryFormData = z.infer<typeof inquiryFormSchema>

interface ArtworkInquiryModalProps {
  isOpen: boolean
  onClose: () => void
  artwork: {
    id: string
    title: string
    year: number | null
    medium: string | null
    image_url: string
    image_thumbnail_url: string | null
  }
}

export function ArtworkInquiryModal({
  isOpen,
  onClose,
  artwork,
}: ArtworkInquiryModalProps) {
  const locale = useLocale()
  const t = useTranslations('works.detail.inquiry')
  const tContact = useTranslations('contact')
  const tForm = useTranslations('contact.form')
  const tTypes = useTranslations('contact.inquiryTypes')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const modalRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InquiryFormData>({
    resolver: zodResolver(inquiryFormSchema),
    defaultValues: {
      inquiry_type: 'purchase',
    },
  })

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Keyboard handling (Escape to close)
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      closeButtonRef.current?.focus()
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  // Focus trap
  useEffect(() => {
    if (!isOpen || !modalRef.current) return

    const focusableElements = modalRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    function handleTabKey(event: KeyboardEvent) {
      if (event.key === 'Tab') {
        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault()
          lastElement?.focus()
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault()
          firstElement?.focus()
        }
      }
    }

    document.addEventListener('keydown', handleTabKey)
    return () => document.removeEventListener('keydown', handleTabKey)
  }, [isOpen])

  const onSubmit = async (data: InquiryFormData) => {
    // Check honeypot
    if (data.website) {
      // Silently reject spam
      setSubmitStatus('success')
      return
    }

    setIsSubmitting(true)
    setSubmitStatus('idle')

    try {
      const response = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          artwork_id: artwork.id,
          subject: `Inquiry: ${artwork.title}`,
          locale,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit inquiry')
      }

      setSubmitStatus('success')
      reset()
    } catch (error) {
      console.error('Error submitting inquiry:', error)
      setSubmitStatus('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Don't render on server or when closed
  if (typeof window === 'undefined' || !isOpen) return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="inquiry-modal-title"
      className="
        fixed inset-0
        z-modal
        flex items-center justify-center
        p-4
        bg-black/60
        backdrop-blur-sm
      "
    >
      {/* Backdrop click to close */}
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Content */}
      <div
        ref={modalRef}
        className="
          relative
          w-full max-w-lg
          max-h-[90vh] overflow-y-auto
          bg-white dark:bg-[#1A1A1A]
          rounded-sm
          shadow-xl
        "
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-[#1A1A1A] border-b border-gray-200 dark:border-[#333333] px-6 py-4 flex items-center justify-between">
          <h2
            id="inquiry-modal-title"
            className="text-[11px] font-medium uppercase tracking-[0.08em] text-black dark:text-[#F0F0F0]"
          >
            {t('title')}
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 text-gray-500 dark:text-[#A0A0A0] hover:text-black dark:hover:text-[#F0F0F0] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Artwork Preview */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-[#333333] flex items-center gap-4">
          <div className="relative w-16 h-20 flex-shrink-0 bg-gray-100 dark:bg-[#2A2A2A]">
            <Image
              src={artwork.image_thumbnail_url || artwork.image_url}
              alt={artwork.title}
              fill
              className="object-cover"
              sizes="64px"
            />
          </div>
          <div>
            <h3 className="text-sm font-normal text-gray-900 dark:text-[#F0F0F0]">{artwork.title}</h3>
            <p className="text-xs text-gray-500 dark:text-[#A0A0A0] mt-1">
              {artwork.year && `${artwork.year}`}
              {artwork.year && artwork.medium && ', '}
              {artwork.medium}
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-6 space-y-4">
          {submitStatus === 'success' ? (
            <div className="py-8 text-center">
              <svg
                className="w-12 h-12 mx-auto text-success mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-body text-gray-700 dark:text-[#C0C0C0]">{t('success')}</p>
              <button
                type="button"
                onClick={onClose}
                className="mt-6 btn-secondary"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              {/* Name */}
              <div>
                <label htmlFor="name" className="label">
                  {tForm('name')} *
                </label>
                <input
                  id="name"
                  type="text"
                  className={`input ${errors.name ? 'border-error' : ''}`}
                  {...register('name')}
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-error">{errors.name.message}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="label">
                  {tForm('email')} *
                </label>
                <input
                  id="email"
                  type="email"
                  className={`input ${errors.email ? 'border-error' : ''}`}
                  {...register('email')}
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-error">{errors.email.message}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="label">
                  {tForm('phone')}
                </label>
                <input
                  id="phone"
                  type="tel"
                  className="input"
                  {...register('phone')}
                />
              </div>

              {/* Inquiry Type */}
              <div>
                <label htmlFor="inquiry_type" className="label">
                  {tForm('inquiryType')} *
                </label>
                <select
                  id="inquiry_type"
                  className="input"
                  {...register('inquiry_type')}
                >
                  <option value="purchase">{tTypes('purchase')}</option>
                  <option value="exhibition">{tTypes('exhibition')}</option>
                  <option value="press">{tTypes('press')}</option>
                  <option value="general">{tTypes('general')}</option>
                </select>
              </div>

              {/* Message */}
              <div>
                <label htmlFor="message" className="label">
                  {tForm('message')} *
                </label>
                <textarea
                  id="message"
                  rows={4}
                  className={`input resize-none ${errors.message ? 'border-error' : ''}`}
                  {...register('message')}
                />
                {errors.message && (
                  <p className="mt-1 text-xs text-error">{errors.message.message}</p>
                )}
              </div>

              {/* Honeypot field */}
              <input
                type="text"
                tabIndex={-1}
                autoComplete="off"
                style={{ display: 'none' }}
                {...register('website')}
              />

              {/* Error message */}
              {submitStatus === 'error' && (
                <p className="text-sm text-error">{t('error')}</p>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {isSubmitting && (
                  <svg
                    className="animate-spin h-4 w-4"
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
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                )}
                {t('submit')}
              </button>
            </>
          )}
        </form>
      </div>
    </div>,
    document.body
  )
}
