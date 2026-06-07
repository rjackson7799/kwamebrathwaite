/**
 * Get the absolute site URL used in auth-link redirect_to / callback URLs.
 * Must match the Supabase Auth project redirect allowlist.
 *
 * Shared by the Founder's Circle magic-link flow (lib/auth/founders-admin.ts)
 * and the admin password-reset flow (lib/auth/admins-admin.ts) so the two
 * never drift.
 */
export function siteUrl(): string {
  // Canonical, explicitly-configured site URL wins (set this in every env,
  // e.g. NEXT_PUBLIC_SITE_URL=https://kwamebrathwaite.com).
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
  if (explicit) return explicit

  // Safety net on Vercel: if the canonical var was forgotten, use the
  // deployment's domain rather than silently minting a localhost link in a
  // deployed environment.
  const vercel =
    process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL
  if (vercel) return `https://${vercel.replace(/\/$/, '')}`

  // Local development fallback. Dev runs on 3001 and that port is in the
  // Supabase redirect allowlist, so a link minted locally is verifiable.
  return 'http://localhost:3001'
}
