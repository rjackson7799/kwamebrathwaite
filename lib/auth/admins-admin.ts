// Admin/service-role helpers for the admin password-recovery flow.
// These run server-side only, using the Supabase service-role key.
//
// Mirrors lib/auth/founders-admin.ts: mint a Supabase auth link via the
// service-role admin API, then send it through OUR Resend sender (not
// Supabase's default email) so admins can reset their password without
// touching the Supabase dashboard.

import { createAdminClient } from '@/lib/supabase/server'
import { sendUserEmail, type SendEmailResult } from '@/lib/email/send'
import { AdminPasswordResetEmail } from '@/lib/email/templates'
import { siteUrl } from '@/lib/auth/site-url'

/**
 * Service-role: does an email exist in the `admins` table?
 *
 * Used by /api/admin/auth/forgot-password to decide whether to actually send
 * a reset link. The route returns the same generic response either way
 * (admin-enumeration-leak prevention); this just controls whether an email
 * is sent. Fails closed on lookup error so we never email an unverifiable
 * address.
 */
export async function adminEmailExists(email: string): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any
  const { data, error } = await supabase
    .from('admins')
    .select('user_id')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle()

  if (error) {
    console.error('adminEmailExists lookup failed:', error)
    return false
  }
  return data !== null
}

/**
 * Password-reset link minted for an admin.
 *
 * Uses the Supabase admin generateLink API with type='recovery' to get a
 * `hashed_token`, then constructs OUR OWN reset URL with that token as a
 * query param. The link in the email goes directly to our reset page (NOT to
 * Supabase's /verify endpoint), and our verify route handles the verifyOtp
 * call server-side.
 *
 * Why not use the returned `action_link` directly? It points at Supabase's
 * /verify endpoint, which redirects with the tokens / errors in the URL
 * **fragment** (after `#`). Browsers don't send fragments to the server, so a
 * server-side handler reading searchParams sees nothing. Server-side PKCE with
 * hashed_token in the query string avoids that. (Same rationale as the
 * Founders Circle callback — see lib/auth/founders-admin.ts.)
 *
 * The admin section is locale-free, so there is no locale prefix on the URL.
 */
export async function generateAdminPasswordResetLink(
  email: string
): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email: email.toLowerCase().trim(),
    options: {
      // Supabase requires a redirectTo even though we don't use the implicit-
      // flow action_link. Must be in the Auth redirect allowlist.
      redirectTo: `${siteUrl()}/admin/reset-password`,
    },
  })

  if (error || !data?.properties?.hashed_token) {
    throw new Error(
      `generateAdminPasswordResetLink failed: ${error?.message ?? 'no hashed_token returned'}`
    )
  }

  // Construct OUR reset URL with the hashed token. Server-side PKCE.
  const resetUrl = new URL(`${siteUrl()}/admin/reset-password`)
  resetUrl.searchParams.set('token_hash', data.properties.hashed_token)
  resetUrl.searchParams.set('type', 'recovery')
  return resetUrl.toString()
}

/**
 * Send the branded password-reset email via Resend (NOT Supabase's default
 * sender).
 */
export async function sendAdminPasswordResetEmail(args: {
  toEmail: string
  actionLink: string
}): Promise<SendEmailResult> {
  return sendUserEmail(
    args.toEmail,
    'Reset your admin password · Kwame Brathwaite Archive',
    AdminPasswordResetEmail({ actionLink: args.actionLink })
  )
}
