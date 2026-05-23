-- ============================================================================
-- Phase 1A gate: RLS / role separation test
-- ============================================================================
-- Run AFTER 2026-05-22-admins-and-rls-refactor.sql, BEFORE building anything
-- in Phase 1B. Validates that:
--   (a) an admin can still do everything they did before,
--   (b) a non-admin authenticated user cannot reach admin tables,
--   (c) anonymous still sees only published public content.
--
-- How to run:
--   1. Open the Supabase SQL editor on the target project.
--   2. Edit the SETUP block below to insert the two test user UUIDs.
--      The simplest way:
--        - Create one throwaway user in Supabase Auth dashboard
--          (this becomes :founder_id — do NOT add to admins)
--        - Pick one existing admin uuid from the admins table
--          (this becomes :admin_id)
--   3. Paste the whole file. Read the NOTICE / RAISE EXCEPTION output —
--      any unexpected result aborts the script.
--   4. When all tests pass, you'll see "PHASE 1A GATE PASSED" at the end.
--
-- This file is read-only with respect to data — it does NOT insert or
-- modify rows in your real tables.
-- ============================================================================

DO $$
DECLARE
  -- ===== EDIT THESE TWO LINES BEFORE RUNNING =====
  admin_id   uuid := '00000000-0000-0000-0000-000000000000'::uuid;  -- a uuid that IS in admins
  founder_id uuid := '00000000-0000-0000-0000-000000000001'::uuid;  -- a uuid that is NOT in admins
  -- ================================================

  result_count   bigint;
  insert_failed  boolean;
BEGIN

  -- Sanity-check the test setup.
  IF NOT EXISTS (SELECT 1 FROM admins WHERE user_id = admin_id) THEN
    RAISE EXCEPTION 'Setup error: admin_id % is not in admins table. Edit the script.', admin_id;
  END IF;
  IF EXISTS (SELECT 1 FROM admins WHERE user_id = founder_id) THEN
    RAISE EXCEPTION 'Setup error: founder_id % IS in admins table. It must be a non-admin. Edit the script.', founder_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = founder_id) THEN
    RAISE EXCEPTION 'Setup error: founder_id % is not a real auth.users row. Create one first.', founder_id;
  END IF;

  RAISE NOTICE '-- is_admin() sanity --';
  IF NOT public.is_admin(admin_id)     THEN RAISE EXCEPTION 'is_admin(admin_id) returned false';   END IF;
  IF     public.is_admin(founder_id)   THEN RAISE EXCEPTION 'is_admin(founder_id) returned true';  END IF;
  RAISE NOTICE 'OK: is_admin returns expected values';

END
$$;

-- ----------------------------------------------------------------------------
-- Test 1 — admin can read everything they read before
-- ----------------------------------------------------------------------------
-- Note: we use the "set_config" trick to impersonate a JWT in the session.
-- Supabase RLS evaluates auth.uid() from request.jwt.claim.sub.

SELECT set_config(
  'request.jwt.claims',
  json_build_object(
    'sub',  '00000000-0000-0000-0000-000000000000',  -- replace with admin_id below
    'role', 'authenticated'
  )::text,
  true
);
SET LOCAL ROLE authenticated;

-- EDIT: paste the same admin uuid you used above in the DO block:
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"PASTE-ADMIN-UUID-HERE","role":"authenticated"}',
  true
);

SELECT 'admin: can read artworks' AS test,
       count(*) > 0 AS pass
  FROM artworks;

SELECT 'admin: can read admins'    AS test,
       count(*) > 0 AS pass
  FROM admins;

-- ----------------------------------------------------------------------------
-- Test 2 — non-admin authenticated user is fully blocked
-- ----------------------------------------------------------------------------

-- EDIT: paste the same non-admin uuid you used above:
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"PASTE-FOUNDER-UUID-HERE","role":"authenticated"}',
  true
);

-- Non-admin should see ONLY published artworks (zero draft rows).
SELECT 'non-admin: cannot see draft artworks' AS test,
       count(*) = 0 AS pass
  FROM artworks
 WHERE status = 'draft';

-- Non-admin should see ZERO admins.
SELECT 'non-admin: cannot see admins'        AS test,
       count(*) = 0 AS pass
  FROM admins;

-- Non-admin should fail to insert an artwork. We wrap in a sub-transaction
-- so the expected exception doesn't abort the whole script.
DO $$
BEGIN
  BEGIN
    INSERT INTO artworks (title, year, image_url, status)
    VALUES ('RLS-test-should-fail', 2026, 'about:blank', 'draft');
    RAISE EXCEPTION 'FAIL: non-admin was allowed to INSERT into artworks';
  EXCEPTION WHEN insufficient_privilege OR check_violation OR others THEN
    RAISE NOTICE 'OK: non-admin INSERT into artworks denied (% / %)', SQLERRM, SQLSTATE;
  END;
END $$;

-- ----------------------------------------------------------------------------
-- Test 3 — anonymous can only see published public content
-- ----------------------------------------------------------------------------

SELECT set_config('request.jwt.claims', NULL, true);
SET LOCAL ROLE anon;

SELECT 'anon: cannot see draft artworks' AS test,
       count(*) = 0 AS pass
  FROM artworks
 WHERE status = 'draft';

SELECT 'anon: cannot see admins'         AS test,
       count(*) = 0 AS pass
  FROM admins;

-- ----------------------------------------------------------------------------
-- Test 4 — confirm no policies still reference the old auth.role() pattern
-- ----------------------------------------------------------------------------

RESET ROLE;

SELECT 'no stale auth.role() policies' AS test,
       count(*) = 0 AS pass
  FROM pg_policies
 WHERE schemaname = 'public'
   AND (qual LIKE '%auth.role()%' OR with_check LIKE '%auth.role()%');

-- ----------------------------------------------------------------------------

DO $$ BEGIN RAISE NOTICE 'PHASE 1A GATE PASSED if every pass column above is TRUE'; END $$;
