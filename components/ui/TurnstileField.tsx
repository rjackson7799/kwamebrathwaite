'use client'

// Cloudflare Turnstile, client half. Server half: lib/api/turnstile.ts.
// Pattern: HonuVault patterns/captcha-both-halves.md.
//
// - Renders nothing when NEXT_PUBLIC_TURNSTILE_SITE_KEY is unset (local dev,
//   and the site keeps working exactly as before until the keys are added).
// - appearance 'interaction-only': invisible for almost everyone; a checkbox
//   appears only when Cloudflare wants an interaction.
// - Tokens are single-use and expire, so the parent bumps `resetSignal` after
//   every server response and we mint a fresh one.

import { useEffect, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'

interface TurnstileApi {
  render(el: HTMLElement, opts: Record<string, unknown>): string
  reset(widgetId?: string): void
  remove(widgetId?: string): void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
const MAX_CONSECUTIVE_ERRORS = 3

export const turnstileEnabled = SITE_KEY.length > 0

let scriptPromise: Promise<TurnstileApi> | null = null

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    script.onload = () =>
      window.turnstile ? resolve(window.turnstile) : reject(new Error('Turnstile API missing'))
    script.onerror = () => {
      // Clear the cache so a later mount can try again.
      scriptPromise = null
      script.remove()
      reject(new Error('Turnstile script failed to load'))
    }
    document.head.appendChild(script)
  })
  return scriptPromise
}

interface TurnstileFieldProps {
  onToken: (token: string | null) => void
  resetSignal: number
  theme?: 'light' | 'dark' | 'auto'
  className?: string
}

export function TurnstileField({
  onToken,
  resetSignal,
  theme = 'auto',
  className,
}: TurnstileFieldProps) {
  const locale = useLocale()
  const t = useTranslations('turnstile')
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const errorCountRef = useRef(0)
  const onTokenRef = useRef(onToken)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    onTokenRef.current = onToken
  }, [onToken])

  useEffect(() => {
    if (!SITE_KEY) return
    let cancelled = false

    loadTurnstile()
      .then((api) => {
        if (cancelled || !containerRef.current) return
        const reset = () => {
          if (widgetIdRef.current) api.reset(widgetIdRef.current)
        }
        widgetIdRef.current = api.render(containerRef.current, {
          sitekey: SITE_KEY,
          theme,
          language: locale,
          appearance: 'interaction-only',
          'response-field': false,
          'refresh-expired': 'manual',
          callback: (token: string) => {
            errorCountRef.current = 0
            setFailed(false)
            onTokenRef.current(token)
          },
          'expired-callback': () => {
            onTokenRef.current(null)
            reset()
          },
          'error-callback': () => {
            onTokenRef.current(null)
            errorCountRef.current += 1
            if (errorCountRef.current >= MAX_CONSECUTIVE_ERRORS) {
              setFailed(true)
            } else {
              reset()
            }
            return true // handled; stops Cloudflare's own retry loop running alongside ours
          },
        })
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })

    return () => {
      cancelled = true
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
      }
      widgetIdRef.current = null
      onTokenRef.current(null)
    }
  }, [locale, theme])

  // The token was spent on the last request whether or not it was accepted.
  useEffect(() => {
    if (resetSignal === 0) return
    onTokenRef.current(null)
    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current)
    }
  }, [resetSignal])

  if (!SITE_KEY) return null

  return (
    <div className={className}>
      <div ref={containerRef} />
      {failed && (
        <p role="alert" className="mt-2 text-xs text-error">
          {t('loadFailed')}
        </p>
      )}
    </div>
  )
}

/**
 * Form-side state for TurnstileField. `ready` is true once a token exists, or
 * always when Turnstile isn't configured. Call `reset()` after every response.
 */
export function useTurnstile() {
  const [token, setToken] = useState<string | null>(null)
  const [resetSignal, setResetSignal] = useState(0)
  return {
    token,
    ready: !turnstileEnabled || token !== null,
    reset: () => setResetSignal((n) => n + 1),
    fieldProps: { onToken: setToken, resetSignal },
  }
}
