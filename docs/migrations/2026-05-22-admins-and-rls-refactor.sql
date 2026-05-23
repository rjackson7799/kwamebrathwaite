-- ============================================================================
-- Phase 1A: admins table + is_admin() + RLS refactor
-- ============================================================================
-- Purpose:
--   Today every existing admin policy uses `auth.role() = 'authenticated'`,
--   which means ANY authenticated Supabase user has admin CRUD over every
--   protected table. Once the Founder's Circle portal adds non-admin users
--   to auth.users, that becomes a security hole.
--
--   This migration introduces an `admins` table and an `is_admin(uid)`
--   SECURITY DEFINER helper, and rewrites every admin-flavored RLS policy
--   in the database to call `public.is_admin(auth.uid())` instead.
--
-- Safety:
--   - Wrapped in a single BEGIN/COMMIT so a partial failure rolls back.
--   - Seeds `admins` from the current `auth.users` table BEFORE applying
--     the policy rewrites, so existing admins do not get locked out.
--   - If any row in auth.users is a test/non-admin account, edit the
--     backfill INSERT below before running.
--
-- Run via: Supabase SQL editor on the target project.
-- After running: regenerate TypeScript types with
--   npx supabase gen types typescript --linked > lib/supabase/types.ts
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. admins table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS admins (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE admins IS
  'Membership in this table grants admin RLS access via public.is_admin(). '
  'Insert/update/delete is service-role only — no client-session policies.';

-- Backfill: every current auth.users row is treated as a legitimate admin.
-- REVIEW BEFORE RUNNING: if any of these emails are test accounts that
-- should NOT have admin access, delete them from auth.users first or
-- run a targeted DELETE FROM admins WHERE email IN (...) after this
-- transaction commits.
INSERT INTO admins (user_id, email)
SELECT id, email FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. is_admin(uid) — SECURITY DEFINER helper
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER + pinned search_path lets the function read `admins`
-- without RLS interfering, and prevents search-path hijacking. STABLE so
-- the planner can cache per-row results within a single statement.

CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM admins WHERE user_id = uid);
$$;

REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, anon, service_role;

COMMENT ON FUNCTION public.is_admin(uuid) IS
  'Returns true if the supplied auth.users id is in the admins table. '
  'Called by RLS policies on all admin-protected tables.';

-- ---------------------------------------------------------------------------
-- 3. admins table RLS
-- ---------------------------------------------------------------------------

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Admins can see the admin roster. Does NOT recurse: is_admin() is
-- SECURITY DEFINER and bypasses RLS internally.
DROP POLICY IF EXISTS admins_select ON admins;
CREATE POLICY admins_select ON admins FOR SELECT
  USING (public.is_admin(auth.uid()));

-- No INSERT/UPDATE/DELETE policies = denied for client sessions.
-- Admin role changes happen via service-role key in API routes only.

-- ---------------------------------------------------------------------------
-- 4. RLS REFACTOR — every existing admin policy
-- ---------------------------------------------------------------------------
-- Each block below is an explicit DROP + CREATE pair for one policy.
-- Public-read and public-insert policies on the same tables are NOT touched.
--
-- Inventory of policies being rewritten (from docs/DATABASE_SCHEMA.sql,
-- docs/HERO_SLIDES_FEATURE.md, and docs/migrations/*.sql):
--
--   1.  artworks                  — Admin full access to artworks
--   2.  exhibitions               — Admin full access to exhibitions
--   3.  exhibition_artworks       — Admin full access to exhibition_artworks
--   4.  press                     — Admin full access to press
--   5.  inquiries                 — Admin full access to inquiries
--   6.  site_content              — Admin full access to site_content
--   7.  newsletter_subscribers    — Admin full access to newsletter
--   8.  translation_cache         — Admin full access to translation_cache
--   9.  activity_log              — Admin full access to activity_log
--   10. page_settings             — Admins can update page settings (different shape)
--   11. hero_slides               — Admin full access to hero slides
--   12. exhibition_reminders      — Admin can view / update / delete (three policies)
--   13. wall_view_leads           — Admins can read all wall view leads (different shape)
--   14. exhibition_press          — Admin full access to exhibition press
--   15. not_found_log             — Admin can read / delete (two policies)
--   16. not_found_dismissed       — Admin can manage dismissed paths
--   17. leads, lead_sources, lead_runs, lead_query_templates, lead_settings — five policies

-- Each block below is wrapped in `IF to_regclass(...) IS NOT NULL` so the
-- migration is tolerant of side tables (exhibition_reminders, leads,
-- not_found_log, wall_view_leads, etc.) that may exist in some environments
-- and not others. The script logs a NOTICE for any skipped block so you can
-- confirm what was and wasn't refactored.

-- ----- artworks -----
DO $$ BEGIN
  IF to_regclass('public.artworks') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Admin full access to artworks" ON artworks;
    CREATE POLICY "Admin full access to artworks" ON artworks
      FOR ALL USING (public.is_admin(auth.uid()))
              WITH CHECK (public.is_admin(auth.uid()));
  ELSE RAISE NOTICE 'skip: artworks not present'; END IF;
END $$;

-- ----- exhibitions -----
DO $$ BEGIN
  IF to_regclass('public.exhibitions') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Admin full access to exhibitions" ON exhibitions;
    CREATE POLICY "Admin full access to exhibitions" ON exhibitions
      FOR ALL USING (public.is_admin(auth.uid()))
              WITH CHECK (public.is_admin(auth.uid()));
  ELSE RAISE NOTICE 'skip: exhibitions not present'; END IF;
END $$;

-- ----- exhibition_artworks -----
DO $$ BEGIN
  IF to_regclass('public.exhibition_artworks') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Admin full access to exhibition_artworks" ON exhibition_artworks;
    CREATE POLICY "Admin full access to exhibition_artworks" ON exhibition_artworks
      FOR ALL USING (public.is_admin(auth.uid()))
              WITH CHECK (public.is_admin(auth.uid()));
  ELSE RAISE NOTICE 'skip: exhibition_artworks not present'; END IF;
END $$;

-- ----- press -----
DO $$ BEGIN
  IF to_regclass('public.press') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Admin full access to press" ON press;
    CREATE POLICY "Admin full access to press" ON press
      FOR ALL USING (public.is_admin(auth.uid()))
              WITH CHECK (public.is_admin(auth.uid()));
  ELSE RAISE NOTICE 'skip: press not present'; END IF;
END $$;

-- ----- inquiries -----
DO $$ BEGIN
  IF to_regclass('public.inquiries') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Admin full access to inquiries" ON inquiries;
    CREATE POLICY "Admin full access to inquiries" ON inquiries
      FOR ALL USING (public.is_admin(auth.uid()))
              WITH CHECK (public.is_admin(auth.uid()));
  ELSE RAISE NOTICE 'skip: inquiries not present'; END IF;
END $$;

-- ----- site_content -----
DO $$ BEGIN
  IF to_regclass('public.site_content') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Admin full access to site_content" ON site_content;
    CREATE POLICY "Admin full access to site_content" ON site_content
      FOR ALL USING (public.is_admin(auth.uid()))
              WITH CHECK (public.is_admin(auth.uid()));
  ELSE RAISE NOTICE 'skip: site_content not present'; END IF;
END $$;

-- ----- newsletter_subscribers -----
DO $$ BEGIN
  IF to_regclass('public.newsletter_subscribers') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Admin full access to newsletter" ON newsletter_subscribers;
    CREATE POLICY "Admin full access to newsletter" ON newsletter_subscribers
      FOR ALL USING (public.is_admin(auth.uid()))
              WITH CHECK (public.is_admin(auth.uid()));
  ELSE RAISE NOTICE 'skip: newsletter_subscribers not present'; END IF;
END $$;

-- ----- translation_cache -----
DO $$ BEGIN
  IF to_regclass('public.translation_cache') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Admin full access to translation_cache" ON translation_cache;
    CREATE POLICY "Admin full access to translation_cache" ON translation_cache
      FOR ALL USING (public.is_admin(auth.uid()))
              WITH CHECK (public.is_admin(auth.uid()));
  ELSE RAISE NOTICE 'skip: translation_cache not present'; END IF;
END $$;

-- ----- activity_log -----
DO $$ BEGIN
  IF to_regclass('public.activity_log') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Admin full access to activity_log" ON activity_log;
    CREATE POLICY "Admin full access to activity_log" ON activity_log
      FOR ALL USING (public.is_admin(auth.uid()))
              WITH CHECK (public.is_admin(auth.uid()));
  ELSE RAISE NOTICE 'skip: activity_log not present'; END IF;
END $$;

-- ----- page_settings (was: TO authenticated USING (true)) -----
DO $$ BEGIN
  IF to_regclass('public.page_settings') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Admins can update page settings" ON page_settings;
    CREATE POLICY "Admins can update page settings" ON page_settings
      FOR UPDATE USING (public.is_admin(auth.uid()))
                 WITH CHECK (public.is_admin(auth.uid()));
    -- Note: the "Public can read page settings" policy is left untouched.
  ELSE RAISE NOTICE 'skip: page_settings not present'; END IF;
END $$;

-- ----- hero_slides -----
DO $$ BEGIN
  IF to_regclass('public.hero_slides') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Admin full access to hero slides" ON hero_slides;
    CREATE POLICY "Admin full access to hero slides" ON hero_slides
      FOR ALL USING (public.is_admin(auth.uid()))
              WITH CHECK (public.is_admin(auth.uid()));
  ELSE RAISE NOTICE 'skip: hero_slides not present'; END IF;
END $$;

-- ----- exhibition_reminders (three policies) -----
DO $$ BEGIN
  IF to_regclass('public.exhibition_reminders') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Admin can view all reminders" ON exhibition_reminders;
    CREATE POLICY "Admin can view all reminders" ON exhibition_reminders
      FOR SELECT USING (public.is_admin(auth.uid()));

    DROP POLICY IF EXISTS "Admin can update reminders" ON exhibition_reminders;
    CREATE POLICY "Admin can update reminders" ON exhibition_reminders
      FOR UPDATE USING (public.is_admin(auth.uid()))
                 WITH CHECK (public.is_admin(auth.uid()));

    DROP POLICY IF EXISTS "Admin can delete reminders" ON exhibition_reminders;
    CREATE POLICY "Admin can delete reminders" ON exhibition_reminders
      FOR DELETE USING (public.is_admin(auth.uid()));
  ELSE RAISE NOTICE 'skip: exhibition_reminders not present'; END IF;
END $$;

-- ----- wall_view_leads (was: TO authenticated USING (true)) -----
DO $$ BEGIN
  IF to_regclass('public.wall_view_leads') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Admins can read all wall view leads" ON wall_view_leads;
    CREATE POLICY "Admins can read all wall view leads" ON wall_view_leads
      FOR SELECT USING (public.is_admin(auth.uid()));
    -- Note: the "Anyone can insert/update wall view leads" public policies stay.
  ELSE RAISE NOTICE 'skip: wall_view_leads not present'; END IF;
END $$;

-- ----- exhibition_press -----
DO $$ BEGIN
  IF to_regclass('public.exhibition_press') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Admin full access to exhibition press" ON exhibition_press;
    CREATE POLICY "Admin full access to exhibition press" ON exhibition_press
      FOR ALL USING (public.is_admin(auth.uid()))
              WITH CHECK (public.is_admin(auth.uid()));
  ELSE RAISE NOTICE 'skip: exhibition_press not present'; END IF;
END $$;

-- ----- not_found_log (two policies) -----
DO $$ BEGIN
  IF to_regclass('public.not_found_log') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Admin can read 404s" ON not_found_log;
    CREATE POLICY "Admin can read 404s" ON not_found_log
      FOR SELECT USING (public.is_admin(auth.uid()));

    DROP POLICY IF EXISTS "Admin can delete 404s" ON not_found_log;
    CREATE POLICY "Admin can delete 404s" ON not_found_log
      FOR DELETE USING (public.is_admin(auth.uid()));
  ELSE RAISE NOTICE 'skip: not_found_log not present'; END IF;
END $$;

-- ----- not_found_dismissed -----
DO $$ BEGIN
  IF to_regclass('public.not_found_dismissed') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Admin can manage dismissed paths" ON not_found_dismissed;
    CREATE POLICY "Admin can manage dismissed paths" ON not_found_dismissed
      FOR ALL USING (public.is_admin(auth.uid()))
              WITH CHECK (public.is_admin(auth.uid()));
  ELSE RAISE NOTICE 'skip: not_found_dismissed not present'; END IF;
END $$;

-- ----- leads (five tables, each its own block) -----
DO $$ BEGIN
  IF to_regclass('public.leads') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Admin full access on leads" ON leads;
    CREATE POLICY "Admin full access on leads" ON leads
      FOR ALL USING (public.is_admin(auth.uid()))
              WITH CHECK (public.is_admin(auth.uid()));
  ELSE RAISE NOTICE 'skip: leads not present'; END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.lead_sources') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Admin full access on lead_sources" ON lead_sources;
    CREATE POLICY "Admin full access on lead_sources" ON lead_sources
      FOR ALL USING (public.is_admin(auth.uid()))
              WITH CHECK (public.is_admin(auth.uid()));
  ELSE RAISE NOTICE 'skip: lead_sources not present'; END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.lead_runs') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Admin full access on lead_runs" ON lead_runs;
    CREATE POLICY "Admin full access on lead_runs" ON lead_runs
      FOR ALL USING (public.is_admin(auth.uid()))
              WITH CHECK (public.is_admin(auth.uid()));
  ELSE RAISE NOTICE 'skip: lead_runs not present'; END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.lead_query_templates') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Admin full access on lead_query_templates" ON lead_query_templates;
    CREATE POLICY "Admin full access on lead_query_templates" ON lead_query_templates
      FOR ALL USING (public.is_admin(auth.uid()))
              WITH CHECK (public.is_admin(auth.uid()));
  ELSE RAISE NOTICE 'skip: lead_query_templates not present'; END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.lead_settings') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Admin full access on lead_settings" ON lead_settings;
    CREATE POLICY "Admin full access on lead_settings" ON lead_settings
      FOR ALL USING (public.is_admin(auth.uid()))
              WITH CHECK (public.is_admin(auth.uid()));
  ELSE RAISE NOTICE 'skip: lead_settings not present'; END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 5. Harden existing SECURITY DEFINER functions
-- ---------------------------------------------------------------------------
-- broken_links_aggregate() and prune_not_found_log() were previously granted
-- EXECUTE to all authenticated users. Once non-admins exist in auth.users,
-- that lets a Founder call them. Revoke from authenticated; re-grant to
-- service_role only. Skip silently if the functions don't exist in this env.

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'broken_links_aggregate') THEN
    REVOKE EXECUTE ON FUNCTION broken_links_aggregate(INT) FROM authenticated;
    GRANT  EXECUTE ON FUNCTION broken_links_aggregate(INT) TO service_role;
  ELSE RAISE NOTICE 'skip: broken_links_aggregate not present'; END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'prune_not_found_log') THEN
    REVOKE EXECUTE ON FUNCTION prune_not_found_log(INT) FROM authenticated;
    GRANT  EXECUTE ON FUNCTION prune_not_found_log(INT) TO service_role;
  ELSE RAISE NOTICE 'skip: prune_not_found_log not present'; END IF;
END $$;

-- API routes that need these functions must use the service-role client.
-- (lib/supabase/server.ts already exposes createAdminClient() for that.)

COMMIT;

-- ============================================================================
-- Post-migration manual verification (run as separate queries):
-- ============================================================================
--
--   -- Confirm admins table populated:
--   SELECT count(*) FROM admins;     -- expected: matches count(*) from auth.users
--
--   -- Confirm is_admin() works for an admin:
--   SELECT public.is_admin('<an-admin-uuid>');  -- expected: t
--
--   -- Confirm policies were swapped (should return zero rows after this migration):
--   SELECT schemaname, tablename, policyname
--     FROM pg_policies
--    WHERE schemaname = 'public'
--      AND (qual LIKE '%auth.role()%' OR with_check LIKE '%auth.role()%');
--
-- Then run docs/migrations/tests/1a-rls-separation.test.sql
-- (companion file) to verify role separation end-to-end.
-- ============================================================================
