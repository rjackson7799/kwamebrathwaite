'use client'

import { forwardRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'

const schema = z.object({
  full_name: z.string().min(1).max(255),
  recognition_name: z.string().max(255).optional(),
  recognition_visibility: z.enum(['private', 'public_opt_in']),
  phone: z.string().max(50).optional(),
  organization: z.string().max(255).optional(),
  mailing_address: z.object({
    line1: z.string().max(255).optional(),
    line2: z.string().max(255).optional(),
    city: z.string().max(120).optional(),
    region: z.string().max(120).optional(),
    postal: z.string().max(40).optional(),
    country: z.string().max(120).optional(),
  }).optional(),
  preferred_locale: z.enum(['en', 'fr', 'ja']),
})

export type ProfileFormValues = z.infer<typeof schema>

interface Props {
  initial: ProfileFormValues
}

/**
 * Member self-edit form for /founders/portal/profile.
 *
 * Schema matches founderProfileUpdateSchema on the server side (which itself
 * mirrors the founders_guard_admin_only_columns() trigger). Tier / pledge /
 * status etc. are not in this form because they're admin-only — even if a
 * Founder hand-crafts a PATCH bypassing this form, the trigger raises.
 */
export function PortalProfileForm({ initial }: Props) {
  const t = useTranslations('founders.profile')
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(schema),
    defaultValues: initial,
  })

  const onSubmit = async (data: ProfileFormValues) => {
    setStatus('idle')
    setErrorMessage(null)

    // Strip empty-string optionals to null so the DB doesn't store ""
    const payload: Record<string, unknown> = {
      full_name: data.full_name,
      recognition_name: data.recognition_name?.trim() || null,
      recognition_visibility: data.recognition_visibility,
      phone: data.phone?.trim() || null,
      organization: data.organization?.trim() || null,
      preferred_locale: data.preferred_locale,
    }
    if (data.mailing_address) {
      const a = data.mailing_address
      const cleaned = {
        line1: a.line1?.trim() || null,
        line2: a.line2?.trim() || null,
        city: a.city?.trim() || null,
        region: a.region?.trim() || null,
        postal: a.postal?.trim() || null,
        country: a.country?.trim() || null,
      }
      // If every field is empty, null the whole jsonb out rather than store an empty object.
      const allEmpty = Object.values(cleaned).every((v) => v === null)
      payload.mailing_address = allEmpty ? null : cleaned
    }

    try {
      const res = await fetch('/api/founders/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!json.success) {
        setStatus('error')
        setErrorMessage(json.error?.message || t('error'))
        return
      }
      setStatus('saved')
      // Reset the form's "dirty" baseline to the saved values
      reset(data)
    } catch (err) {
      console.error('profile save error:', err)
      setStatus('error')
      setErrorMessage(t('error'))
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-12">
      {/* Recognition ─────────────────────────────────────── */}
      <Section title={t('section_recognition')}>
        <Field label={t('fullName')} error={errors.full_name?.message}>
          <Input {...register('full_name')} />
        </Field>
        <Field label={t('recognitionName')} help={t('recognitionNameHelp')}>
          <Input {...register('recognition_name')} />
        </Field>
        <Field label={t('recognitionVisibility')}>
          <select
            className={selectClass}
            {...register('recognition_visibility')}
          >
            <option value="private">{t('visibilityPrivate')}</option>
            <option value="public_opt_in">{t('visibilityPublicOptIn')}</option>
          </select>
        </Field>
      </Section>

      {/* Contact ──────────────────────────────────────────── */}
      <Section title={t('section_contact')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Field label={t('phone')}><Input type="tel" {...register('phone')} /></Field>
          <Field label={t('organization')}><Input {...register('organization')} /></Field>
        </div>
      </Section>

      {/* Mailing address ─────────────────────────────────── */}
      <Section title={t('section_address')}>
        <Field label={t('addressLine1')}><Input {...register('mailing_address.line1')} /></Field>
        <Field label={t('addressLine2')}><Input {...register('mailing_address.line2')} /></Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Field label={t('city')}><Input {...register('mailing_address.city')} /></Field>
          <Field label={t('region')}><Input {...register('mailing_address.region')} /></Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Field label={t('postal')}><Input {...register('mailing_address.postal')} /></Field>
          <Field label={t('country')}><Input {...register('mailing_address.country')} /></Field>
        </div>
      </Section>

      {/* Preferences ─────────────────────────────────────── */}
      <Section title={t('section_prefs')}>
        <Field label={t('preferredLocale')}>
          <select className={selectClass} {...register('preferred_locale')}>
            <option value="en">{t('localeEnglish')}</option>
            <option value="fr">{t('localeFrench')}</option>
            <option value="ja">{t('localeJapanese')}</option>
          </select>
        </Field>
      </Section>

      {/* Save bar ────────────────────────────────────────── */}
      <div className="border-t border-[#2a2a2a] pt-6 flex items-center gap-4">
        <button
          type="submit"
          disabled={isSubmitting || !isDirty}
          className="px-6 py-2.5 bg-[#C9A961] hover:bg-[#d4b572] text-[#0e0e0e] text-xs uppercase tracking-[0.18em] font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? t('saving') : t('save')}
        </button>
        {status === 'saved' && (
          <span className="text-sm text-[#C9A961]">{t('saved')}</span>
        )}
        {status === 'error' && (
          <span className="text-sm text-red-400">{errorMessage}</span>
        )}
      </div>
    </form>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Local layout primitives. Kept in this file because they're not reused
// elsewhere yet and lifting them adds friction with no payoff.
// ──────────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.18em] text-[#C9A961] mb-6 font-heading">
        {title}
      </p>
      <div className="space-y-5">{children}</div>
    </div>
  )
}

function Field({
  label,
  help,
  error,
  children,
}: {
  label: string
  help?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-[0.12em] text-[#8a8a8a] mb-1.5">
        {label}
      </label>
      {children}
      {help && <p className="text-xs text-[#6a6a6a] mt-1">{help}</p>}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  )
}

const inputClass =
  'w-full bg-transparent border-0 border-b border-[#3a3a3a] py-2 text-[#E6E2D6] placeholder-[#5a5a5a] focus:outline-none focus:border-[#C9A961] transition-colors'

// forwardRef so react-hook-form's register() can attach its ref. Without
// this, register's ref gets swallowed and the form never tracks input values.
const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input(props, ref) {
    return <input ref={ref} className={inputClass} {...props} />
  }
)

const selectClass =
  'bg-[#0e0e0e] border border-[#3a3a3a] rounded-sm py-2 px-3 text-[#E6E2D6] focus:outline-none focus:border-[#C9A961]'
