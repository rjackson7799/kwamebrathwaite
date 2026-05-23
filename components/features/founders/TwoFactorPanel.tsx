'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

interface Factor {
  id: string
  friendly_name: string | null
  status: 'unverified' | 'verified'
  created_at: string
}

interface FactorsResponse {
  totp: Factor[]
  verified: boolean
}

interface EnrollResponse {
  factorId: string
  qrCode: string  // SVG data URI
  secret: string
  uri: string
}

type EnrollState =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'collecting'; data: EnrollResponse; code: string; verifying: boolean; error: string | null }

export function TwoFactorPanel() {
  const t = useTranslations('founders.security')

  const [loading, setLoading] = useState(true)
  const [factors, setFactors] = useState<FactorsResponse | null>(null)
  const [enroll, setEnroll] = useState<EnrollState>({ phase: 'idle' })
  const [busy, setBusy] = useState(false)

  const fetchFactors = useCallback(async () => {
    try {
      const res = await fetch('/api/founders/security/mfa/factors')
      const json = await res.json()
      if (json.success) setFactors(json.data)
    } catch (err) {
      console.error('factors fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFactors()
  }, [fetchFactors])

  const startEnroll = async () => {
    setEnroll({ phase: 'loading' })
    try {
      const res = await fetch('/api/founders/security/mfa/enroll', { method: 'POST' })
      const json = await res.json()
      if (!json.success) throw new Error(json.error?.message ?? 'failed')
      setEnroll({
        phase: 'collecting',
        data: json.data,
        code: '',
        verifying: false,
        error: null,
      })
    } catch (err) {
      console.error('mfa enroll start error:', err)
      setEnroll({ phase: 'idle' })
      alert(t('error'))
    }
  }

  const cancelEnroll = async () => {
    // Best-effort cleanup of the unverified factor.
    if (enroll.phase === 'collecting') {
      await fetch('/api/founders/security/mfa/unenroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factorId: enroll.data.factorId }),
      }).catch(() => undefined)
    }
    setEnroll({ phase: 'idle' })
  }

  const submitCode = async () => {
    if (enroll.phase !== 'collecting' || enroll.code.length !== 6) return
    setEnroll({ ...enroll, verifying: true, error: null })
    try {
      const res = await fetch('/api/founders/security/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factorId: enroll.data.factorId, code: enroll.code }),
      })
      const json = await res.json()
      if (!json.success) {
        setEnroll({ ...enroll, verifying: false, error: json.error?.message ?? t('error') })
        return
      }
      setEnroll({ phase: 'idle' })
      await fetchFactors()
    } catch (err) {
      console.error('mfa verify error:', err)
      setEnroll({ ...enroll, verifying: false, error: t('error') })
    }
  }

  const disable = async () => {
    const verified = factors?.totp.find((f) => f.status === 'verified')
    if (!verified) return
    if (!confirm(t('twofa_unenroll_confirm'))) return
    setBusy(true)
    try {
      const res = await fetch('/api/founders/security/mfa/unenroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factorId: verified.id }),
      })
      const json = await res.json()
      if (!json.success) {
        alert(json.error?.message ?? t('error'))
      }
      await fetchFactors()
    } catch (err) {
      console.error('mfa unenroll error:', err)
      alert(t('error'))
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <div className="text-sm text-[#8a8a8a]">…</div>
  }

  const isEnrolled = factors?.verified ?? false

  return (
    <div className="space-y-6">
      <p className="text-sm text-[#C0BBA8] leading-relaxed">
        {t('twofa_intro')}
      </p>

      <div className="flex items-center gap-3">
        <span
          className={`inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] px-2 py-1 ${
            isEnrolled
              ? 'text-[#0e0e0e] bg-[#C9A961]'
              : 'text-[#8a8a8a] border border-[#3a3a3a]'
          }`}
        >
          <span aria-hidden>{isEnrolled ? '●' : '○'}</span>
          {isEnrolled ? t('twofa_status_enrolled') : t('twofa_status_unenrolled')}
        </span>
      </div>

      {/* Enabled — offer disable */}
      {isEnrolled && enroll.phase === 'idle' && (
        <button
          onClick={disable}
          disabled={busy}
          className="text-sm text-red-400 hover:text-red-300 underline disabled:opacity-50"
        >
          {t('twofa_unenroll')}
        </button>
      )}

      {/* Not enabled, idle — offer enroll */}
      {!isEnrolled && enroll.phase === 'idle' && (
        <button
          onClick={startEnroll}
          className="px-5 py-2 bg-[#C9A961] hover:bg-[#d4b572] text-[#0e0e0e] text-xs uppercase tracking-[0.18em] font-medium transition-colors"
        >
          {t('twofa_enroll')}
        </button>
      )}

      {/* Loading state */}
      {enroll.phase === 'loading' && (
        <p className="text-sm text-[#8a8a8a]">{t('twofa_enroll_loading')}</p>
      )}

      {/* Enrollment wizard */}
      {enroll.phase === 'collecting' && (
        <div className="border border-[#3a3a3a] p-6 space-y-6">
          <div>
            <p className="text-sm text-[#C0BBA8] mb-4">
              <span className="text-[#C9A961] mr-2">1.</span>
              {t('twofa_enroll_step1')}
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={enroll.data.qrCode}
              alt="2FA QR code"
              className="bg-white p-3 inline-block"
              width={180}
              height={180}
            />
            <div className="mt-3 text-xs text-[#6a6a6a]">
              <p className="mb-1">{t('twofa_enroll_secret_label')}</p>
              <code className="text-[#C9A961] text-sm font-mono break-all">
                {enroll.data.secret}
              </code>
            </div>
          </div>

          <div>
            <p className="text-sm text-[#C0BBA8] mb-3">
              <span className="text-[#C9A961] mr-2">2.</span>
              {t('twofa_enroll_step2')}
            </p>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              pattern="\d{6}"
              placeholder="000000"
              value={enroll.code}
              onChange={(e) =>
                setEnroll({ ...enroll, code: e.target.value.replace(/\D/g, '').slice(0, 6) })
              }
              className="w-40 text-center font-mono text-2xl tracking-[0.4em] bg-transparent border border-[#3a3a3a] py-3 px-4 text-[#E6E2D6] focus:outline-none focus:border-[#C9A961]"
            />
            {enroll.error && (
              <p className="text-sm text-red-400 mt-2">{enroll.error}</p>
            )}
          </div>

          <div className="flex items-center gap-4 pt-2">
            <button
              onClick={submitCode}
              disabled={enroll.code.length !== 6 || enroll.verifying}
              className="px-5 py-2 bg-[#C9A961] hover:bg-[#d4b572] text-[#0e0e0e] text-xs uppercase tracking-[0.18em] font-medium disabled:opacity-40 transition-colors"
            >
              {enroll.verifying ? t('twofa_verifying') : t('twofa_verify')}
            </button>
            <button
              onClick={cancelEnroll}
              disabled={enroll.verifying}
              className="text-xs uppercase tracking-[0.14em] text-[#8a8a8a] hover:text-[#E6E2D6] disabled:opacity-50"
            >
              {t('twofa_cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
