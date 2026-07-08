// Admin/service-role helpers for the Founders Circle invitation flow.
// These run server-side only, using the Supabase service-role key.
// Callers MUST gate access via requireAdmin() first.

import { randomBytes } from 'crypto'
import { createAdminClient } from '@/lib/supabase/server'
import { sendUserEmail } from '@/lib/email/send'
import { FounderInvitationEmail, FounderMagicLinkEmail } from '@/lib/email/templates'
import { siteUrl } from '@/lib/auth/site-url'
import {
  hashInviteToken,
  isInviteLinkValid,
  isLinkEligibleStatus,
  INVITE_LINK_TTL_MS,
} from '@/lib/founders/invite-links'
import type { FounderStatus } from '@/lib/founders/lifecycle'

/**
 * Ensure an auth.users row exists for the given email. Returns the uuid.
 * If a user with this email already exists (race or re-invite scenario),
 * returns the existing id rather than failing.
 *
 * email_confirm is set to false — confirmation happens implicitly when the
 * Founder clicks their magic link and the callback verifies it.
 */
export async function ensureAuthUserForEmail(
  email: string
): Promise<{ userId: string; created: boolean }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any
  const normalised = email.toLowerCase().trim()

  // Try create first. If it fails with "User already registered", look up.
  const { data: createData, error: createError } = await supabase.auth.admin.createUser({
    email: normalised,
    email_confirm: false,
    user_metadata: { source: 'founder_invite' },
  })

  if (!createError && createData?.user?.id) {
    return { userId: createData.user.id, created: true }
  }

  // Fall back to listing and finding the existing user.
  // (admin.listUsers requires pagination; for a small dataset this is fine
  //  and avoids the "exact get by email" gap in the supabase-js admin API.)
  const { data: listData, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })

  if (listError) {
    throw new Error(`ensureAuthUserForEmail: list lookup failed: ${listError.message}`)
  }

  const existing = listData?.users?.find(
    (u: { id: string; email?: string }) =>
      (u.email ?? '').toLowerCase() === normalised
  )

  if (!existing) {
    throw new Error(
      `ensureAuthUserForEmail: createUser failed (${createError?.message ?? 'unknown'}) and no existing user with email ${normalised}`
    )
  }

  return { userId: existing.id, created: false }
}

/**
 * Sign-in link minted for an invited or returning Founder.
 *
 * Uses the Supabase admin generateLink API to get a `hashed_token`, then
 * constructs OUR OWN callback URL with that token as a query param. The
 * link in the email goes directly to our callback (NOT to Supabase's
 * /verify endpoint), and our callback handles the verifyOtp call server-side.
 *
 * Why not use the returned `action_link` directly? It points at Supabase's
 * /verify endpoint, which on success/failure does a 302 redirect with the
 * tokens / errors placed in the URL **fragment** (after `#`). Browsers
 * don't send URL fragments to the server in the initial request — so a
 * server-side callback handler that reads searchParams sees nothing.
 *
 * Server-side PKCE flow with hashed_token in the query string avoids that
 * entirely.
 *
 * `locale` localises the callback the email links to so fr/ja invitees land on
 * the matching locale (en = no prefix). The callback then redirects in-locale
 * to the invitation page or portal.
 */
export async function generateFounderMagicLink(
  email: string,
  locale: string = 'en'
): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: email.toLowerCase().trim(),
    options: {
      // Supabase requires a redirectTo even though we don't use the
      // implicit-flow action_link. Point it at our (un-prefixed) callback for
      // consistency with the allowlist.
      redirectTo: `${siteUrl()}/founders/auth/callback`,
    },
  })

  if (error || !data?.properties?.hashed_token) {
    throw new Error(
      `generateFounderMagicLink failed: ${error?.message ?? 'no hashed_token returned'}`
    )
  }

  // Construct OUR callback URL with the hashed token. Server-side PKCE.
  const prefix = locale === 'fr' || locale === 'ja' ? `/${locale}` : ''
  const callbackUrl = new URL(`${siteUrl()}${prefix}/founders/auth/callback`)
  callbackUrl.searchParams.set('token_hash', data.properties.hashed_token)
  // verifyOtp's `type` for a magic-link hashed_token is 'email'
  callbackUrl.searchParams.set('type', 'email')
  return callbackUrl.toString()
}

/**
 * Send the branded invitation email via Resend (NOT Supabase's default sender).
 */
export async function sendFounderInvitationEmail(args: {
  toEmail: string
  fullName: string
  actionLink: string
  personalNote?: string | null
  invitedByName?: string | null
}): Promise<{ success: boolean }> {
  return sendUserEmail(
    args.toEmail,
    'You are invited to the Founders Circle',
    FounderInvitationEmail({
      actionLink: args.actionLink,
      fullName: args.fullName,
      personalNote: args.personalNote ?? null,
      invitedByName: args.invitedByName ?? null,
    })
  )
}

/**
 * Send the magic-link sign-in email (for returning Founders requesting a
 * fresh link from /founders/login).
 */
export async function sendFounderMagicLinkEmail(args: {
  toEmail: string
  fullName: string | null
  actionLink: string
}): Promise<{ success: boolean }> {
  return sendUserEmail(
    args.toEmail,
    'Your sign-in link · Founders Circle',
    FounderMagicLinkEmail({
      actionLink: args.actionLink,
      fullName: args.fullName ?? null,
    })
  )
}

// Locale prefix for founder-facing links (en = no prefix). Matches the
// convention used by generateFounderMagicLink above.
function foundersLocalePrefix(locale: string): string {
  return locale === 'fr' || locale === 'ja' ? `/${locale}` : ''
}

export interface InviteTokenFounder {
  user_id: string
  email: string
  full_name: string
  recognition_name: string | null
  preferred_locale: string
  status: FounderStatus
}

/**
 * Mint a durable, copyable invite/sign-in link for a founder.
 *
 * Unlike generateFounderMagicLink (a one-time, 24h Supabase token), this is OUR
 * token: a random 256-bit value whose SHA-256 hash is stored in
 * founder_invite_links with a 30-day expiry. The raw value lives only in the
 * returned URL. Multiple links may coexist; each call mints a new row so a
 * previously copied link keeps working until it expires or is revoked.
 *
 * The insert is verified — we throw rather than hand back a link whose hash was
 * never persisted (which would be a dead link).
 */
export async function createFounderInviteLink(args: {
  userId: string
  email: string
  locale?: string
  createdBy?: string | null
}): Promise<{ link: string; expiresAt: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any

  const raw = randomBytes(32).toString('hex')
  const now = new Date()
  const expiresAt = new Date(now.getTime() + INVITE_LINK_TTL_MS).toISOString()

  // Best-effort housekeeping: sign-in requests mint rows regularly now that
  // every founder email carries a durable link, so clear this user's already
  // expired rows rather than letting them accumulate. Failure is non-fatal.
  await supabase
    .from('founder_invite_links')
    .delete()
    .eq('user_id', args.userId)
    .lt('expires_at', now.toISOString())

  const { error } = await supabase.from('founder_invite_links').insert({
    user_id: args.userId,
    token_hash: hashInviteToken(raw),
    expires_at: expiresAt,
    created_by: args.createdBy ?? null,
  })

  if (error) {
    throw new Error(`createFounderInviteLink: insert failed: ${error.message}`)
  }

  const prefix = foundersLocalePrefix(args.locale ?? 'en')
  const link = `${siteUrl()}${prefix}/founders/invite/${raw}`
  return { link, expiresAt }
}

/**
 * Resolve a raw invite token to its founder + the link's expiry. Returns null
 * when no row matches the hash. Expiry/status validation is the caller's job
 * (see isInviteLinkValid / isLinkEligibleStatus in lib/founders/invite-links).
 */
export async function findFounderByInviteToken(
  raw: string
): Promise<{ founder: InviteTokenFounder; expiresAt: string } | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any

  const { data: link, error: linkError } = await supabase
    .from('founder_invite_links')
    .select('user_id, expires_at')
    .eq('token_hash', hashInviteToken(raw))
    .maybeSingle()

  if (linkError || !link) return null

  const { data: founder, error: founderError } = await supabase
    .from('founders')
    .select('user_id, email, full_name, recognition_name, preferred_locale, status')
    .eq('user_id', link.user_id)
    .maybeSingle()

  if (founderError || !founder) return null

  return { founder: founder as InviteTokenFounder, expiresAt: link.expires_at }
}

export type InviteTokenResolution =
  | { ok: true; founder: InviteTokenFounder }
  | { ok: false; reason: 'expired' }

/**
 * Full server-side check for a raw invite token used by the public bridge
 * (page + confirm route). All failure modes — unknown token, expired, archived,
 * or a status that dead-ends (paused/declined) — collapse to a single
 * { ok: false, reason: 'expired' } so we never leak whether an account exists or
 * its status. Callers should not authenticate when ok is false.
 */
export async function resolveFounderInviteToken(
  raw: string
): Promise<InviteTokenResolution> {
  const found = await findFounderByInviteToken(raw)
  if (!found) return { ok: false, reason: 'expired' }
  if (!isInviteLinkValid(found.expiresAt, new Date())) {
    return { ok: false, reason: 'expired' }
  }
  if (
    found.founder.status === 'archived' ||
    !isLinkEligibleStatus(found.founder.status)
  ) {
    return { ok: false, reason: 'expired' }
  }
  return { ok: true, founder: found.founder }
}

/**
 * Delete all outstanding invite links for a founder. Used by the manual
 * "Revoke links" admin action, on archive (revoke route), and on email change.
 * Returns how many rows were removed.
 */
export async function revokeFounderInviteLinks(userId: string): Promise<number> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any
  const { data, error } = await supabase
    .from('founder_invite_links')
    .delete()
    .eq('user_id', userId)
    .select('id')

  if (error) {
    throw new Error(`revokeFounderInviteLinks: delete failed: ${error.message}`)
  }
  return data?.length ?? 0
}

/**
 * Revoke all sessions for a founder (called from /api/admin/founders/[id]/revoke).
 * The founders row should also have status moved to 'archived' separately.
 */
export async function revokeFounderSessions(userId: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any
  const { error } = await supabase.auth.admin.signOut(userId, 'global')
  if (error) {
    // Don't throw — the status='archived' write is the primary effect and
    // RLS + middleware will block subsequent access regardless.
    console.error('revokeFounderSessions: signOut failed:', error)
  }
}
