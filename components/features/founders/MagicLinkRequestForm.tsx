'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'

const schema = z.object({
  email: z.string().email().max(255),
  website: z.string().optional(), // honeypot
})

type FormData = z.infer<typeof schema>

interface MagicLinkRequestFormProps {
  /** Focus the email field on mount (used when arriving from a failed link). */
  autoFocusEmail?: boolean
}

export function MagicLinkRequestForm({ autoFocusEmail = false }: MagicLinkRequestFormProps) {
  const t = useTranslations('founders.login')

  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    if (data.website) {
      // Honeypot — silent fake-success
      setStatus('sent')
      return
    }

    setSubmitting(true)
    setStatus('idle')

    try {
      const response = await fetch('/api/founders/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
        }),
      })

      if (!response.ok) throw new Error('Failed')
      setStatus('sent')
      reset()
    } catch (err) {
      console.error('MagicLinkRequestForm submit error:', err)
      setStatus('error')
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'sent') {
    return (
      <div className="space-y-6">
        <div className="rounded-sm border border-[#3a3a3a] bg-[#141414] p-8">
          <h2 className="font-heading font-light text-2xl text-[#F5EFE0] mb-4">
            {t('successHeading')}
          </h2>
          <p className="text-[#C0BBA8] leading-relaxed text-sm">
            {t('successBody')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setStatus('idle')}
          className="text-[#C9A961] text-sm uppercase tracking-[0.14em] hover:text-[#d4b572] transition-colors"
        >
          {t('tryAgain')}
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label
          htmlFor="founder-login-email"
          className="block text-xs uppercase tracking-[0.14em] text-[#C9A961] mb-2"
        >
          {t('email')}
        </label>
        <input
          id="founder-login-email"
          type="email"
          autoComplete="email"
          autoFocus={autoFocusEmail}
          required
          className={`w-full bg-transparent border-0 border-b border-[#3a3a3a] py-2 text-[#E6E2D6] placeholder-[#5a5a5a] focus:outline-none focus:border-[#C9A961] transition-colors text-lg ${
            errors.email ? 'border-red-700' : ''
          }`}
          {...register('email')}
        />
      </div>

      {/* Honeypot */}
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '-10000px',
          top: 'auto',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
        }}
        {...register('website')}
      />

      {status === 'error' && (
        <p className="text-sm text-red-400">{t('error')}</p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full sm:w-auto px-8 py-3 bg-[#C9A961] hover:bg-[#d4b572] text-[#0e0e0e] text-sm uppercase tracking-[0.18em] font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {submitting ? t('submitting') : t('submit')}
      </button>
    </form>
  )
}
