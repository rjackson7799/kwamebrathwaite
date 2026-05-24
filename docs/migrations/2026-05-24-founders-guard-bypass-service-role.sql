-- ============================================================================
-- Phase 1C follow-up: founders_guard_admin_only_columns bypass for service-role
-- ============================================================================
-- The Phase 1C column-guard trigger checked `is_admin(auth.uid())` to decide
-- whether to allow writes to admin-only columns (tier, pledge_amount, status,
-- internal_notes, relationship_owner_email, email).
--
-- That works for SSR-client writes by an admin user (where auth.uid() returns
-- the admin's id). But it BREAKS for service-role writes: service-role
-- connections have no JWT, so auth.uid() returns NULL, is_admin(NULL) is false,
-- and the trigger raises an exception on any change to a guarded column.
--
-- The auth callback at app/[locale]/founders/auth/callback/route.ts uses the
-- service-role client to promote 'invited' founders to 'active' on first
-- sign-in. That UPDATE was silently failing — the founders row stayed at
-- 'invited' forever. Phase 1's middleware accepted any non-archived status,
-- so the failure was invisible. Phase 2A's middleware tightened to require
-- status='active', exposing the bug as a /founders/login?reason=not_invited
-- bounce loop.
--
-- Fix: bypass the trigger when auth.uid() is NULL. Service-role connections
-- are the trusted server channel (created via createAdminClient() with the
-- SUPABASE_SERVICE_ROLE_KEY, only callable from server-side code that has
-- already passed requireAdmin() or its equivalent invite/callback gate).
--
-- This is the same trust model Supabase itself uses: the service-role key
-- bypasses RLS entirely by design.
--
-- Run via: Supabase SQL editor.
-- After running: no types regen required (function body change only).
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.founders_guard_admin_only_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Service-role connections have no JWT, so auth.uid() is NULL. Trust them.
  -- Admin user sessions are also allowed.
  IF auth.uid() IS NULL OR public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF NEW.tier                     IS DISTINCT FROM OLD.tier                     THEN RAISE EXCEPTION 'admin-only: tier'; END IF;
  IF NEW.pledge_amount            IS DISTINCT FROM OLD.pledge_amount            THEN RAISE EXCEPTION 'admin-only: pledge_amount'; END IF;
  IF NEW.pledge_term_years        IS DISTINCT FROM OLD.pledge_term_years        THEN RAISE EXCEPTION 'admin-only: pledge_term_years'; END IF;
  IF NEW.pledge_fulfilled_amount  IS DISTINCT FROM OLD.pledge_fulfilled_amount  THEN RAISE EXCEPTION 'admin-only: pledge_fulfilled_amount'; END IF;
  IF NEW.status                   IS DISTINCT FROM OLD.status                   THEN RAISE EXCEPTION 'admin-only: status'; END IF;
  IF NEW.internal_notes           IS DISTINCT FROM OLD.internal_notes           THEN RAISE EXCEPTION 'admin-only: internal_notes'; END IF;
  IF NEW.relationship_owner_email IS DISTINCT FROM OLD.relationship_owner_email THEN RAISE EXCEPTION 'admin-only: relationship_owner_email'; END IF;
  IF NEW.email                    IS DISTINCT FROM OLD.email                    THEN RAISE EXCEPTION 'admin-only: email'; END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.founders_guard_admin_only_columns() FROM PUBLIC;

COMMIT;
