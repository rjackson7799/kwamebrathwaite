'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useLocale, useTranslations } from 'next-intl'

const contactFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  email: z.string().email('Invalid email address').max(255),
  phone: z.string().max(50).optional(),
  inquiry_type: z.enum(['general', 'purchase', 'exhibition', 'press']),
  subject: z.string().max(255).optional(),
  message: z.string().min(1, 'Message is required').max(5000),
  website: z.string().optional(), // Honeypot
})

type ContactFormData = z.infer<typeof contactFormSchema>

export function ContactForm() {
  const locale = useLocale()
  const t = useTranslations('contact')
  const tForm = useTranslations('contact.form')
  const tTypes = useTranslations('contact.inquiryTypes')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      inquiry_type: 'general',
    },
  })

  const onSubmit = async (data: ContactFormData) => {
    // Honeypot check
    if (data.website) {
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
          locale,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit')
      }

      setSubmitStatus('success')
      reset()
    } catch (error) {
      console.error('Error submitting contact form:', error)
      setSubmitStatus('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitStatus === 'success') {
    return (
      <div className="py-12 text-center">
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
        <p className="text-body text-gray-700 dark:text-[#C0C0C0] mb-2">
          {t('success')}
        </p>
        <button
          type="button"
          onClick={() => setSubmitStatus('idle')}
          className="mt-4 btn-secondary"
        >
          {t('sendAnother')}
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Name */}
      <div>
        <label className="label" htmlFor="name">
          {tForm('name')} *
        </label>
        <input
          type="text"
          id="name"
          className={`input ${errors.name ? 'border-error' : ''}`}
          {...register('name')}
        />
        {errors.name && (
          <p className="mt-1 text-xs text-error">{errors.name.message}</p>
        )}
      </div>

      {/* Email */}
      <div>
        <label className="label" htmlFor="email">
          {tForm('email')} *
        </label>
        <input
          type="email"
          id="email"
          className={`input ${errors.email ? 'border-error' : ''}`}
          {...register('email')}
        />
        {errors.email && (
          <p className="mt-1 text-xs text-error">{errors.email.message}</p>
        )}
      </div>

      {/* Phone */}
      <div>
        <label className="label" htmlFor="phone">
          {tForm('phone')}
        </label>
        <input
          type="tel"
          id="phone"
          className="input"
          {...register('phone')}
        />
      </div>

      {/* Inquiry Type */}
      <div>
        <label className="label" htmlFor="inquiryType">
          {tForm('inquiryType')}
        </label>
        <select
          id="inquiryType"
          className="input"
          {...register('inquiry_type')}
        >
          <option value="general">{tTypes('general')}</option>
          <option value="purchase">{tTypes('purchase')}</option>
          <option value="exhibition">{tTypes('exhibition')}</option>
          <option value="press">{tTypes('press')}</option>
        </select>
      </div>

      {/* Subject */}
      <div>
        <label className="label" htmlFor="subject">
          {tForm('subject')}
        </label>
        <input
          type="text"
          id="subject"
          className="input"
          {...register('subject')}
        />
      </div>

      {/* Message */}
      <div>
        <label className="label" htmlFor="message">
          {tForm('message')} *
        </label>
        <textarea
          id="message"
          rows={6}
          className={`input resize-none ${errors.message ? 'border-error' : ''}`}
          {...register('message')}
        />
        {errors.message && (
          <p className="mt-1 text-xs text-error">{errors.message.message}</p>
        )}
      </div>

      {/* Honeypot */}
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

      {/* Submit */}
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
        {tForm('submit')}
      </button>
    </form>
  )
}
