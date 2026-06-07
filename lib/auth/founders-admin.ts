// Admin/service-role helpers for the Founder's Circle invitation flow.
// These run server-side only, using the Supabase service-role key.
// Callers MUST gate access via requireAdmin() first.

import { createAdminClient } from '@/lib/supabase/server'
import { sendUserEmail } from '@/lib/email/send'
import { FounderInvitationEmail, FounderMagicLinkEmail } from '@/lib/email/templates'
import { siteUrl } from '@/lib/auth/site-url'

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
    'You are invited to the Founder’s Circle',
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
    'Your sign-in link · Founder’s Circle',
    FounderMagicLinkEmail({
      actionLink: args.actionLink,
      fullName: args.fullName ?? null,
    })
  )
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
