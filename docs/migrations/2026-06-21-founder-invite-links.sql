-- ============================================================================
-- Founders Circle — durable, copyable invite/sign-in links
-- ============================================================================
-- Some invited founders never receive the invitation email (deliverability).
-- This adds a durable, admin-copyable link an admin can paste into their own
-- email. The link is OUR token (30-day life); when the founder clicks + confirms
-- it bridges to the existing Supabase magic-link callback at click time, so the
-- 24h Supabase window only starts on click and "Resend invite" never breaks it.
--
-- Design notes (see plan: for-the-founder-circle-tender-dahl.md):
--   - Multiple links may coexist per founder (each "Copy" mints a new row);
--     older copies keep working until they expire or are revoked.
--   - We store only a SHA-256 hash of the raw token (the raw value lives only in
--     the URL), so a DB leak does not yield usable login links.
--   - SERVICE-ROLE ONLY: no privileges are granted to authenticated/anon and RLS
--     is enabled with no member policy, so members can never read this table.
--     Admin/route access uses the service-role client (BYPASSRLS) in
--     lib/auth/founders-admin.ts.
--
-- Depends on:
--   - founders table + auth.users        from 2026-05-23-founders-table-and-auth.sql
--   - public.is_admin(uuid)              from 2026-05-22-admins-and-rls-refactor.sql
--
-- Run via: Supabase SQL editor.
-- After running: regenerate TypeScript types
--   npx supabase gen types typescript --linked > lib/supabase/types.ts
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS founder_invite_links (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash  text NOT NULL,
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  created_by  text
);

-- Hash is the lookup key; UNIQUE both enforces no collisions and backs the
-- by-token lookup in findFounderByInviteToken().
CREATE UNIQUE INDEX IF NOT EXISTS founder_invite_links_token_hash_idx
  ON founder_invite_links (token_hash);

-- Revoke-all + per-founder listing.
CREATE INDEX IF NOT EXISTS founder_invite_links_user_id_idx
  ON founder_invite_links (user_id);

-- ---------------------------------------------------------------------------
-- 2. Lockdown — service-role only
-- ---------------------------------------------------------------------------
-- Defense in depth: REVOKE table privileges from member/anon roles AND enable
-- RLS with no member policy. Either alone would block members; both together
-- make it explicit. Service-role bypasses RLS for admin routes.
REVOKE ALL ON founder_invite_links FROM authenticated, anon;

ALTER TABLE founder_invite_links ENABLE ROW LEVEL SECURITY;

-- Admins may read via SSR/anon client too (not strictly needed since admin
-- routes use the service-role client, but keeps parity with other founder
-- tables and supports future admin-side SSR reads).
DROP POLICY IF EXISTS founder_invite_links_admin_select ON founder_invite_links;
CREATE POLICY founder_invite_links_admin_select ON founder_invite_links FOR SELECT
  USING (public.is_admin(auth.uid()));

COMMIT;
