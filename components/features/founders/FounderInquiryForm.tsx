'use client'

import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useLocale, useTranslations } from 'next-intl'

const founderInquiryFormSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().max(255),
  phone: z.string().max(50).optional(),
  message: z.string().min(1).max(5000),
  website: z.string().optional(), // honeypot
})

type FormData = z.infer<typeof founderInquiryFormSchema>

export function FounderInquiryForm() {
  const locale = useLocale()
  const t = useTranslations('founders.form')

  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const renderedAtRef = useRef<number>(Date.now())

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(founderInquiryFormSchema),
  })

  const onSubmit = async (data: FormData) => {
    if (data.website) {
      // Honeypot tripped: silent fake-success
      setStatus('success')
      return
    }

    setSubmitting(true)
    setStatus('idle')

    try {
      const response = await fetch('/api/founders/inquire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          locale,
          renderedAt: renderedAtRef.current,
        }),
      })

      if (!response.ok) throw new Error('Failed to submit')

      setStatus('success')
      reset()
    } catch (err) {
      console.error('Founder inquiry submit error:', err)
      setStatus('error')
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'success') {
    return (
      <div className="rounded-sm border border-[#3a3a3a] bg-[#141414] p-8 text-center">
        <p className="text-[#E6E2D6] leading-relaxed">{t('success')}</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <label
          htmlFor="founder-name"
          className="block text-xs uppercase tracking-[0.14em] text-[#C9A961] mb-2"
        >
          {t('name')} *
        </label>
        <input
          id="founder-name"
          type="text"
          autoComplete="name"
          className={`w-full bg-transparent border-0 border-b border-[#3a3a3a] py-2 text-[#E6E2D6] placeholder-[#5a5a5a] focus:outline-none focus:border-[#C9A961] transition-colors ${
            errors.name ? 'border-red-700' : ''
          }`}
          {...register('name')}
        />
      </div>

      <div>
        <label
          htmlFor="founder-email"
          className="block text-xs uppercase tracking-[0.14em] text-[#C9A961] mb-2"
        >
          {t('email')} *
        </label>
        <input
          id="founder-email"
          type="email"
          autoComplete="email"
          className={`w-full bg-transparent border-0 border-b border-[#3a3a3a] py-2 text-[#E6E2D6] placeholder-[#5a5a5a] focus:outline-none focus:border-[#C9A961] transition-colors ${
            errors.email ? 'border-red-700' : ''
          }`}
          {...register('email')}
        />
      </div>

      <div>
        <label
          htmlFor="founder-phone"
          className="block text-xs uppercase tracking-[0.14em] text-[#C9A961] mb-2"
        >
          {t('phone')}
        </label>
        <input
          id="founder-phone"
          type="tel"
          autoComplete="tel"
          className="w-full bg-transparent border-0 border-b border-[#3a3a3a] py-2 text-[#E6E2D6] placeholder-[#5a5a5a] focus:outline-none focus:border-[#C9A961] transition-colors"
          {...register('phone')}
        />
      </div>

      <div>
        <label
          htmlFor="founder-message"
          className="block text-xs uppercase tracking-[0.14em] text-[#C9A961] mb-2"
        >
          {t('message')} *
        </label>
        <textarea
          id="founder-message"
          rows={5}
          placeholder={t('messagePlaceholder')}
          className={`w-full bg-transparent border border-[#3a3a3a] rounded-sm p-3 text-[#E6E2D6] placeholder-[#5a5a5a] focus:outline-none focus:border-[#C9A961] transition-colors resize-none ${
            errors.message ? 'border-red-700' : ''
          }`}
          {...register('message')}
        />
      </div>

      {/* Honeypot — hidden from humans, invisible from bots only by being unstyled */}
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: 'absolute', left: '-10000px', top: 'auto', width: '1px', height: '1px', overflow: 'hidden' }}
        {...register('website')}
      />

      {status === 'error' && (
        <p className="text-sm text-red-400">{t('error')}</p>
      )}

      <div className="pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="w-full sm:w-auto px-8 py-3 bg-[#C9A961] hover:bg-[#d4b572] text-[#0e0e0e] text-sm uppercase tracking-[0.18em] font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? t('submitting') : t('submit')}
        </button>
      </div>
    </form>
  )
}
