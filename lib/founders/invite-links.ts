// Pure helpers for durable Founders Circle invite/sign-in links.
// No DB or Supabase access here — those live in lib/auth/founders-admin.ts so
// this module stays unit-testable in the node harness (tests/founder-invite-links).
import { createHash } from 'crypto'
import type { FounderStatus } from '@/lib/founders/lifecycle'

// Durable links live for 30 days. The inner Supabase magic-link's own 24h window
// only starts when the founder confirms, so this is the real validity window.
export const INVITE_LINK_TTL_MS = 30 * 24 * 60 * 60 * 1000

/**
 * Hash the raw token for storage. We store ONLY this digest; the raw token lives
 * in the URL. A DB leak therefore yields no usable login links.
 */
export function hashInviteToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

/**
 * True while a link is still usable. Expiry exactly equal to `now` counts as
 * expired (strictly-after comparison). An unparseable expiry is invalid.
 */
export function isInviteLinkValid(expiresAt: string, now: Date): boolean {
  const expiry = new Date(expiresAt).getTime()
  if (Number.isNaN(expiry)) return false
  return expiry > now.getTime()
}

/**
 * Which founder statuses a copyable link makes sense for. Only 'invited'
 * (review + donate) and 'active' (portal) lead somewhere; paused/declined hit
 * the closed-access screen and archived is revoked, so they're excluded.
 */
export function isLinkEligibleStatus(status: FounderStatus | string): boolean {
  return status === 'invited' || status === 'active'
}
