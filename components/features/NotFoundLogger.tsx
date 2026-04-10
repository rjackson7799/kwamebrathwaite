'use client'

import { useEffect } from 'react'

type Props = {
  locale: string
}

// Fire-and-forget client beacon. Logs the current path + referrer to
// /api/not-found-log so the admin can monitor inbound broken links.
// Deduplicated per mount via useEffect — one log per 404 page view.
export function NotFoundLogger({ locale }: Props) {
  useEffect(() => {
    try {
      const path = window.location.pathname + window.location.search
      const referrer = document.referrer || null

      fetch('/api/not-found-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, referrer, locale }),
        keepalive: true,
      }).catch(() => {
        // Silent — logging is best-effort. A failure here must not affect
        // the visitor's experience on the 404 page.
      })
    } catch {
      // Same — swallow anything unexpected.
    }
  }, [locale])

  return null
}
