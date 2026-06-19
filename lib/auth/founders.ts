import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// Member-readable founder columns. MUST stay in sync with the column-level
// GRANT in 2026-05-31-founders-fundraiser-rework.sql — staff-only columns
// (internal_notes, relationship_owner_email, pledge_*, payment_reference,
// activated_by, last_invited_at) are revoked from the `authenticated` role, so
// any member-side read MUST use this explicit projection (never select('*'),
// which would error).
export const MEMBER_FOUNDER_COLUMNS =
  'user_id, email, full_name, recognition_name, recognition_visibility, tier, ' +
  'status, phone, mailing_address, organization, preferred_locale, comms_prefs, ' +
  'invited_at, activated_at, last_login_at, created_at, updated_at, ' +
  'donation_amount, donation_confirmed_at, terms_version, terms_accepted_at'

export interface FounderRow {
  user_id: string
  email: string
  full_name: string
  recognition_name: string | null
  recognition_visibility: 'private' | 'public_opt_in'
  tier: string | null
  status: 'invited' | 'active' | 'paused' | 'archived' | 'declined'
  preferred_locale: string
  comms_prefs: Record<string, unknown>
  invited_at: string
  activated_at: string | null
  last_login_at: string | null
  terms_version: string | null
  terms_accepted_at: string | null
  donation_confirmed_at: string | null
}

/**
 * Server-side check: is the currently signed-in user a Founders Circle member?
 *
 * Distinct from admins — a single auth.users row can be in neither table
 * (random signup), in admins, or in founders (Phase 1C model). The membership
 * check is exact: presence of a row in `founders` keyed on auth.uid().
 */
export async function isCurrentUserFounder(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  // RLS allows the row owner to read their own row. No need for service role.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('founders')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    console.error('isCurrentUserFounder: founders read failed:', error)
    return false
  }
  return data !== null
}

/**
 * Server-side: fetch the current founder's full row (the column subset above).
 * Returns null if not signed in or not in founders. Use in /founders/portal/*
 * server components.
 */
export async function getCurrentFounder(): Promise<FounderRow | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('founders')
    .select(
      'user_id, email, full_name, recognition_name, recognition_visibility, ' +
      'tier, status, preferred_locale, comms_prefs, invited_at, activated_at, ' +
      'last_login_at, terms_version, terms_accepted_at, donation_confirmed_at'
    )
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    console.error('getCurrentFounder: founders read failed:', error)
    return null
  }
  return (data as FounderRow | null) ?? null
}

/**
 * Locale-aware founders path. `en` has no prefix; fr/ja are prefixed.
 * `path` is the no-prefix form, e.g. '/founders/login'.
 */
export function foundersPath(locale: string, path: string): string {
  return locale === 'en' ? path : `/${locale}${path}`
}

/**
 * Server-side gate for /founders/portal/* — requires an ACTIVE founder.
 * Defense in depth alongside middleware: a logged-in but `invited` member is
 * redirected to the invitation page (review + donate), and any other
 * non-active status to the invitation page's "no longer active" state.
 * Returns the active FounderRow for use by the layout/page.
 */
export async function requireActiveFounder(locale: string): Promise<FounderRow> {
  const founder = await getCurrentFounder()
  if (!founder) redirect(foundersPath(locale, '/founders/login'))
  if (founder.status !== 'active') {
    redirect(foundersPath(locale, '/founders/invitation'))
  }
  return founder
}

/**
 * Service-role: does an email exist in the founders table?
 *
 * Used by /api/founders/auth/request-otp to decide whether to actually send
 * a magic link. Membership-leak prevention: the route returns the same
 * generic response either way; this just controls whether the email is sent.
 */
export async function founderEmailExists(email: string): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any
  const { data, error } = await supabase
    .from('founders')
    .select('user_id')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle()

  if (error) {
    console.error('founderEmailExists lookup failed:', error)
    // Fail closed on lookup error so we don't email people we can't verify.
    return false
  }
  return data !== null
}
