-- ============================================================================
-- Phase 2B: Exhibition Previews — preview_starts_at + preview_notes + RLS
-- ============================================================================
-- Adds:
--   - exhibitions.preview_starts_at  (timestamptz, nullable)
--   - exhibitions.preview_notes      (text, nullable, TipTap HTML)
--   - partial index on preview_starts_at WHERE NOT NULL
--   - Additive RLS policy "founders_read_exhibition_previews" — active
--     founders can read draft rows whose preview_starts_at is in the past.
--
-- The existing public read policy ("Public read published exhibitions") and
-- admin policy ("Admin full access to exhibitions") are UNCHANGED. This
-- policy is purely additive: when status flips to 'published', the public
-- policy carries the read and the founder predicate stops matching, so the
-- row simply leaves /founders/portal/previews automatically.
--
-- Depends on:
--   - public.is_current_founder()  from 2026-05-24-briefings.sql (Phase 2A)
--   - exhibitions table             from DATABASE_SCHEMA.sql
--   - "Public read published exhibitions" + "Admin full access to exhibitions"
--     policies (Phase 1A refactor)
--
-- Public surfaces explicitly NOT modified by this migration:
--   - app/[locale]/exhibitions/[slug]/page.tsx (createPublicClient + ISR)
--   - app/[locale]/exhibitions/page.tsx
--   - /api/exhibitions/route.ts
-- Founders read previews only via the new portal route
-- /founders/portal/previews/[id] which uses the SSR client and force-dynamic
-- rendering — that's the only path RLS-eligible for this policy.
--
-- Run via: Supabase SQL editor.
-- After running: no types regen strictly required (codebase uses `as any`
-- casts per Phase 1 convention). If the Supabase CLI is linked, run:
--   npx supabase gen types typescript --linked > lib/supabase/types.ts
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. New columns on exhibitions
-- ---------------------------------------------------------------------------

ALTER TABLE exhibitions
  ADD COLUMN IF NOT EXISTS preview_starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS preview_notes     text;

CREATE INDEX IF NOT EXISTS exhibitions_preview_starts_at_idx
  ON exhibitions(preview_starts_at) WHERE preview_starts_at IS NOT NULL;

COMMENT ON COLUMN exhibitions.preview_starts_at IS
  'Timestamp after which active Founders see this row in '
  '/founders/portal/previews even while status=draft. NULL = no preview window.';

COMMENT ON COLUMN exhibitions.preview_notes IS
  'Founder-only curator notes (TipTap HTML). Lazily translated via '
  'translation_cache (source_table=exhibitions, source_field=preview_notes). '
  'Never surfaced on public routes.';

-- ---------------------------------------------------------------------------
-- 2. Additive RLS policy — active founders read draft rows in the window
-- ---------------------------------------------------------------------------
-- A founder reads a row via this policy when ALL of:
--   - is_current_founder() = true  (status='active' member, granted from 2A)
--   - preview_starts_at is set and in the past
--   - the row is still draft (once published, the public policy carries it)
--
-- Postgres OR's together RLS policies: this policy supplements the existing
-- public-read and admin policies without conflicting with them.

DROP POLICY IF EXISTS founders_read_exhibition_previews ON exhibitions;
CREATE POLICY founders_read_exhibition_previews ON exhibitions FOR SELECT
  USING (
    public.is_current_founder()
    AND preview_starts_at IS NOT NULL
    AND preview_starts_at <= now()
    AND status = 'draft'
  );

COMMIT;
