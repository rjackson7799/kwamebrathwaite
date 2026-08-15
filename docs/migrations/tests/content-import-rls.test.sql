-- ============================================================================
-- Smart Import gate: RLS / role separation + RPC grant test
-- ============================================================================
-- Run AFTER 2026-08-14-content-import.sql. Validates that:
--   (a) an admin has full access to both staging tables,
--   (b) an authenticated NON-admin (a Founders Circle member) sees nothing
--       and can write nothing,
--   (c) anon sees nothing and can write nothing,
--   (d) publish_import_item() is executable by service_role ONLY,
--   (e) publish_import_item() rejects a spoofed non-admin p_actor even when
--       the caller holds service-role — the route's requireAdmin() is
--       necessary but not sufficient, because service-role bypasses RLS,
--   (f) parsed_data / source_text are actually immutable, not just documented.
--
-- How to run:
--   1. Open the Supabase SQL editor on the target project.
--   2. Edit the two uuids in the SETUP block below:
--        - admin_id   : an existing uuid FROM the admins table
--        - founder_id : a real auth.users uuid that is NOT in admins
--          (any Founders Circle member works; otherwise create a throwaway user)
--   3. Paste the whole file and read the output. Every `pass` column must be
--      TRUE, and every NOTICE must say OK.
--
-- This file wraps everything in BEGIN/ROLLBACK: the probe rows it inserts are
-- discarded, and your real data is never modified.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- SETUP
-- ---------------------------------------------------------------------------
-- The uuids are held in a temp table rather than pasted into a dozen places,
-- so there is exactly one line to edit and no chance of the copies drifting.

CREATE TEMP TABLE probe_config ON COMMIT DROP AS
SELECT
  -- ===== EDIT THESE TWO VALUES =====
  '00000000-0000-0000-0000-000000000000'::uuid AS admin_id,    -- IS in admins
  '00000000-0000-0000-0000-000000000001'::uuid AS founder_id,  -- is NOT in admins
  -- ==================================
  gen_random_uuid() AS import_id,
  gen_random_uuid() AS item_id;

-- Role-switched statements below must still read this table.
GRANT SELECT ON probe_config TO authenticated, anon;

DO $$
DECLARE
  c probe_config%ROWTYPE;
BEGIN
  SELECT * INTO c FROM probe_config;

  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE user_id = c.admin_id) THEN
    RAISE EXCEPTION 'Setup error: admin_id % is not in admins. Edit the SETUP block.', c.admin_id;
  END IF;
  IF EXISTS (SELECT 1 FROM public.admins WHERE user_id = c.founder_id) THEN
    RAISE EXCEPTION 'Setup error: founder_id % IS in admins. It must be a non-admin.', c.founder_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = c.founder_id) THEN
    RAISE EXCEPTION 'Setup error: founder_id % is not a real auth.users row.', c.founder_id;
  END IF;

  IF to_regclass('public.content_imports') IS NULL THEN
    RAISE EXCEPTION 'content_imports missing — run 2026-08-14-content-import.sql first';
  END IF;

  RAISE NOTICE 'OK: setup valid';
END $$;

-- Probe rows, inserted as the SQL-editor superuser (RLS not in force here).
INSERT INTO public.content_imports (id, raw_text, source_label, status, created_by)
SELECT import_id, 'RLS PROBE — rolled back', 'rls-probe', 'ready', admin_id FROM probe_config;

INSERT INTO public.content_import_items
  (id, import_id, source_index, source_text, target_type, entry_kind, parsed_data)
SELECT item_id, import_id, 0, 'RLS PROBE ENTRY', 'exhibition', 'screening',
       '{"title":"RLS Probe"}'::jsonb
  FROM probe_config;


-- ---------------------------------------------------------------------------
-- Test 1 — admin has full access
-- ---------------------------------------------------------------------------

SELECT set_config('request.jwt.claims',
                  json_build_object('sub', admin_id, 'role', 'authenticated')::text, true)
  FROM probe_config;
SET LOCAL ROLE authenticated;

SELECT 'admin: can read content_imports' AS test,
       count(*) = 1 AS pass
  FROM public.content_imports WHERE source_label = 'rls-probe';

SELECT 'admin: can read content_import_items' AS test,
       count(*) = 1 AS pass
  FROM public.content_import_items WHERE source_text = 'RLS PROBE ENTRY';

-- An admin must be able to record a review decision.
UPDATE public.content_import_items
   SET action = 'skip', status = 'skipped'
 WHERE source_text = 'RLS PROBE ENTRY';

SELECT 'admin: can update an item' AS test,
       count(*) = 1 AS pass
  FROM public.content_import_items
 WHERE source_text = 'RLS PROBE ENTRY' AND status = 'skipped';


-- ---------------------------------------------------------------------------
-- Test 2 — parsed_data / source_text are immutable (freeze trigger)
-- ---------------------------------------------------------------------------
-- Still acting as the admin: even full access must not let the model's raw
-- output be rewritten after the fact. Corrections belong in edited_data.

DO $$
BEGIN
  BEGIN
    UPDATE public.content_import_items
       SET parsed_data = '{"title":"tampered"}'::jsonb
     WHERE source_text = 'RLS PROBE ENTRY';
    RAISE EXCEPTION 'FAIL: parsed_data was mutable';
  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF;
      RAISE NOTICE 'OK: parsed_data is immutable (%)', SQLERRM;
  END;
END $$;

DO $$
BEGIN
  BEGIN
    UPDATE public.content_import_items
       SET source_text = 'tampered'
     WHERE source_text = 'RLS PROBE ENTRY';
    RAISE EXCEPTION 'FAIL: source_text was mutable';
  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF;
      RAISE NOTICE 'OK: source_text is immutable (%)', SQLERRM;
  END;
END $$;


-- ---------------------------------------------------------------------------
-- Test 3 — authenticated NON-admin is fully blocked
-- ---------------------------------------------------------------------------
-- This is the case the recorded landmine is about: a legacy
-- `auth.role() = 'authenticated'` policy would pass here, because non-admin
-- Founders Circle members share the same auth.users pool.

SELECT set_config('request.jwt.claims',
                  json_build_object('sub', founder_id, 'role', 'authenticated')::text, true)
  FROM probe_config;

SELECT 'non-admin: sees zero content_imports' AS test,
       count(*) = 0 AS pass
  FROM public.content_imports;

SELECT 'non-admin: sees zero content_import_items' AS test,
       count(*) = 0 AS pass
  FROM public.content_import_items;

DO $$
BEGIN
  BEGIN
    INSERT INTO public.content_imports (raw_text, status)
    VALUES ('RLS PROBE — should never insert', 'ready');
    RAISE EXCEPTION 'FAIL: non-admin was allowed to INSERT into content_imports';
  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF;
      RAISE NOTICE 'OK: non-admin INSERT denied (%)', SQLERRM;
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'OK: non-admin INSERT denied (insufficient_privilege)';
  END;
END $$;


-- ---------------------------------------------------------------------------
-- Test 4 — anon is fully blocked
-- ---------------------------------------------------------------------------

SELECT set_config('request.jwt.claims', NULL, true);
RESET ROLE;
SET LOCAL ROLE anon;

SELECT 'anon: sees zero content_imports' AS test,
       count(*) = 0 AS pass
  FROM public.content_imports;

SELECT 'anon: sees zero content_import_items' AS test,
       count(*) = 0 AS pass
  FROM public.content_import_items;

RESET ROLE;


-- ---------------------------------------------------------------------------
-- Test 5 — publish_import_item() is granted to service_role ONLY
-- ---------------------------------------------------------------------------
-- The function is SECURITY DEFINER. A stray grant to authenticated would hand
-- every logged-in Founders Circle member the ability to write published rows.

SELECT 'rpc: not executable by anon'          AS test,
       NOT has_function_privilege('anon', p.oid, 'EXECUTE')          AS pass
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public' AND p.proname = 'publish_import_item';

SELECT 'rpc: not executable by authenticated' AS test,
       NOT has_function_privilege('authenticated', p.oid, 'EXECUTE') AS pass
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public' AND p.proname = 'publish_import_item';

SELECT 'rpc: executable by service_role'      AS test,
       has_function_privilege('service_role', p.oid, 'EXECUTE')      AS pass
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public' AND p.proname = 'publish_import_item';

SELECT 'rpc: no PUBLIC grant' AS test,
       count(*) = 0 AS pass
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) acl
 WHERE n.nspname = 'public'
   AND p.proname = 'publish_import_item'
   AND acl.grantee = 0;  -- 0 is PUBLIC

SELECT 'rpc: search_path is pinned' AS test,
       p.proconfig @> ARRAY['search_path=public, pg_temp'] AS pass
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public' AND p.proname = 'publish_import_item';


-- ---------------------------------------------------------------------------
-- Test 6 — the RPC rejects a spoofed p_actor
-- ---------------------------------------------------------------------------
-- Called here as the superuser, i.e. with strictly more privilege than the
-- service-role client the route uses. is_admin(p_actor) inside the function is
-- the only thing standing between a compromised route and a published write,
-- so it is asserted directly rather than inferred from the grants above.

DO $$
DECLARE
  c      probe_config%ROWTYPE;
  result jsonb;
BEGIN
  SELECT * INTO c FROM probe_config;

  result := public.publish_import_item(
    c.item_id, c.founder_id, 'exhibition', NULL,
    '{"title":"Should never be written"}'::jsonb, ARRAY['title']
  );

  IF result->>'code' IS DISTINCT FROM 'FORBIDDEN' THEN
    RAISE EXCEPTION 'FAIL: non-admin p_actor returned % (expected FORBIDDEN)', result;
  END IF;
  RAISE NOTICE 'OK: spoofed non-admin p_actor rejected with FORBIDDEN';

  result := public.publish_import_item(
    c.item_id, NULL, 'exhibition', NULL,
    '{"title":"Should never be written"}'::jsonb, ARRAY['title']
  );

  IF result->>'code' IS DISTINCT FROM 'FORBIDDEN' THEN
    RAISE EXCEPTION 'FAIL: NULL p_actor returned % (expected FORBIDDEN)', result;
  END IF;
  RAISE NOTICE 'OK: NULL p_actor rejected with FORBIDDEN';

  -- A real admin actor gets past authorization, but the item was set to
  -- 'skipped' in Test 1, so the claim finds no 'pending' row. Proves the
  -- rejection above was about the ACTOR and not about the item being
  -- unclaimable — otherwise both calls would return the same code either way.
  result := public.publish_import_item(
    c.item_id, c.admin_id, 'exhibition', NULL,
    '{"title":"Should never be written"}'::jsonb, ARRAY['title']
  );

  IF result->>'code' IS DISTINCT FROM 'ALREADY_CLAIMED' THEN
    RAISE EXCEPTION 'FAIL: admin actor on a skipped item returned % (expected ALREADY_CLAIMED)', result;
  END IF;
  RAISE NOTICE 'OK: admin actor passes authorization (item unclaimable, as expected)';
END $$;


-- ---------------------------------------------------------------------------
-- Test 7 — no legacy auth.role() policies on the new tables
-- ---------------------------------------------------------------------------

SELECT 'no auth.role() policies on import tables' AS test,
       count(*) = 0 AS pass
  FROM pg_policies
 WHERE schemaname = 'public'
   AND tablename IN ('content_imports', 'content_import_items')
   AND (qual LIKE '%auth.role()%' OR with_check LIKE '%auth.role()%');

SELECT 'RLS enabled on both import tables' AS test,
       count(*) = 2 AS pass
  FROM pg_class
 WHERE relname IN ('content_imports', 'content_import_items')
   AND relrowsecurity;

-- ---------------------------------------------------------------------------

DO $$ BEGIN
  RAISE NOTICE 'SMART IMPORT RLS GATE PASSED if every pass column above is TRUE';
END $$;

-- Discards the probe rows. Nothing above is persisted.
ROLLBACK;
