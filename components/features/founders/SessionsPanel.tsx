'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

interface SessionRow {
  id: string
  created_at: string
  updated_at: string
  user_agent: string | null
  ip: string | null
  is_current: boolean
}

export function SessionsPanel() {
  const t = useTranslations('founders.security')
  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState<SessionRow[]>([])

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/founders/security/sessions')
      const json = await res.json()
      if (json.success) setSessions(json.data)
    } catch (err) {
      console.error('sessions fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  function describeUA(ua: string | null): string {
    if (!ua) return 'Unknown device'
    // Light heuristics — full parser is overkill here.
    const lower = ua.toLowerCase()
    let browser = 'Browser'
    if (lower.includes('edg/')) browser = 'Edge'
    else if (lower.includes('chrome/') && !lower.includes('chromium')) browser = 'Chrome'
    else if (lower.includes('safari/') && !lower.includes('chrome/')) browser = 'Safari'
    else if (lower.includes('firefox/')) browser = 'Firefox'
    let os = ''
    if (lower.includes('windows')) os = 'Windows'
    else if (lower.includes('mac os')) os = 'macOS'
    else if (lower.includes('iphone')) os = 'iPhone'
    else if (lower.includes('ipad')) os = 'iPad'
    else if (lower.includes('android')) os = 'Android'
    else if (lower.includes('linux')) os = 'Linux'
    return os ? `${browser} on ${os}` : browser
  }

  function formatWhen(iso: string): string {
    const d = new Date(iso)
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return <div className="text-sm text-[#8a8a8a]">…</div>
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-[#C0BBA8] leading-relaxed">
        {t('sessions_intro')}
      </p>

      {sessions.length === 0 ? (
        <p className="text-sm text-[#8a8a8a]">{t('sessions_none')}</p>
      ) : (
        <ul className="divide-y divide-[#2a2a2a]">
          {sessions.map((s) => (
            <li key={s.id} className="py-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm text-[#E6E2D6]">{describeUA(s.user_agent)}</p>
                <p className="text-xs text-[#8a8a8a] mt-1">
                  {s.ip ? `${s.ip} · ` : ''}Last active {formatWhen(s.updated_at)}
                </p>
              </div>
              {s.is_current && (
                <span className="text-[10px] uppercase tracking-[0.16em] text-[#C9A961] whitespace-nowrap">
                  {t('sessions_current')}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      <form action="/api/founders/security/sign-out-all" method="post" className="pt-4 border-t border-[#2a2a2a]">
        <button
          type="submit"
          onClick={(e) => {
            if (!confirm(t('signOutEverywhere_confirm'))) e.preventDefault()
          }}
          className="px-5 py-2 border border-red-700 text-red-400 hover:bg-red-950/20 text-xs uppercase tracking-[0.18em] font-medium transition-colors"
        >
          {t('signOutEverywhere')}
        </button>
      </form>
    </div>
  )
}
