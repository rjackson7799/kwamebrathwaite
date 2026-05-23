-- ============================================================================
-- Phase 1A fixup: two admin policies on tables that exist in production but
-- not in DATABASE_SCHEMA.sql or docs/migrations/*.sql.
-- ============================================================================
-- Discovered after running 2026-05-22-admins-and-rls-refactor.sql and then
-- the pg_policies audit query:
--
--   SELECT schemaname, tablename, policyname
--     FROM pg_policies
--    WHERE schemaname = 'public'
--      AND (qual LIKE '%auth.role()%' OR with_check LIKE '%auth.role()%');
--
-- which returned:
--   public.artwork_tags        | Admin full access to artwork_tags
--   public.ai_generation_log   | Admin full access to ai_generation_log
--
-- These tables were apparently created via the Supabase dashboard rather
-- than through a tracked migration. Rewriting their policies to call
-- public.is_admin() like the rest.
--
-- Re-run the pg_policies audit query after this migration — expected: 0 rows.
-- ============================================================================

BEGIN;

DO $$ BEGIN
  IF to_regclass('public.artwork_tags') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Admin full access to artwork_tags" ON artwork_tags;
    CREATE POLICY "Admin full access to artwork_tags" ON artwork_tags
      FOR ALL USING (public.is_admin(auth.uid()))
              WITH CHECK (public.is_admin(auth.uid()));
  ELSE RAISE NOTICE 'skip: artwork_tags not present'; END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.ai_generation_log') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Admin full access to ai_generation_log" ON ai_generation_log;
    CREATE POLICY "Admin full access to ai_generation_log" ON ai_generation_log
      FOR ALL USING (public.is_admin(auth.uid()))
              WITH CHECK (public.is_admin(auth.uid()));
  ELSE RAISE NOTICE 'skip: ai_generation_log not present'; END IF;
END $$;

COMMIT;
