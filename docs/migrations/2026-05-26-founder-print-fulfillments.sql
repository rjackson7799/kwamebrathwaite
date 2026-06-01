-- ============================================================================
-- Phase 2C: Founder Print fulfillment tracking
-- ============================================================================
-- The Founder's Circle program ships a physical framed print to each Founder.
-- This migration adds the per-Founder operational table that tracks the
-- print's journey: edition number assignment, status timeline
-- (pending -> in_production -> ready -> shipped -> delivered), shipping
-- tracking URL, and admin-only internal notes.
--
-- Scope correction from the earlier 2C draft: no private Storage bucket, no
-- founder_print row for the image, no signed-URL helper, no <ProtectedImage>.
-- The portal-side image is a small reference thumbnail at
-- public/founders/print.jpg — the physical print mailed to the Founder is
-- the actual deliverable.
--
-- Depends on:
--   - founders table                   from 2026-05-23-founders-table-and-auth.sql
--   - public.is_admin(uuid)            from 2026-05-22-admins-and-rls-refactor.sql
--   - update_updated_at_column()       from DATABASE_SCHEMA.sql
--
-- Run via: Supabase SQL editor.
-- After running: no types regen strictly required (codebase uses `as any`
-- casts per Phase 1 convention).
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Fulfillment status enum
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'print_fulfillment_status') THEN
    CREATE TYPE print_fulfillment_status AS ENUM (
      'pending',
      'in_production',
      'ready',
      'shipped',
      'delivered'
    );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. founder_print_fulfillments — one row per Founder, admin-managed.
-- ---------------------------------------------------------------------------
-- The framed print itself ships via an external fulfillment vendor. This
-- table is the archive's record of where each Founder's print is in the
-- process. internal_notes is admin-only — member-facing API routes MUST
-- project a fixed column list that excludes it (belt-and-braces alongside RLS).

CREATE TABLE IF NOT EXISTS public.founder_print_fulfillments (
  user_id        uuid PRIMARY KEY REFERENCES public.founders(user_id) ON DELETE CASCADE,
  edition_number int,                                   -- admin-assigned at row creation; nullable until assigned
  status         print_fulfillment_status NOT NULL DEFAULT 'pending',
  shipped_at     timestamptz,
  delivered_at   timestamptz,
  tracking_url   text,
  internal_notes text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- Edition numbers are unique when set. Multiple NULLs are allowed
-- (founders awaiting production assignment).
CREATE UNIQUE INDEX IF NOT EXISTS fpf_edition_number_unique
  ON founder_print_fulfillments(edition_number) WHERE edition_number IS NOT NULL;

COMMENT ON TABLE founder_print_fulfillments IS
  'Per-Founder operational tracking for the physical framed Print. The Print '
  'itself ships through a fulfillment vendor; this table records edition '
  'number, status timeline, tracking URL, and admin-only internal notes.';

COMMENT ON COLUMN founder_print_fulfillments.internal_notes IS
  'Admin-only. Member-facing API routes MUST select a fixed projection that '
  'excludes this column.';

-- ---------------------------------------------------------------------------
-- 3. updated_at trigger
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_fpf_updated_at'
  ) THEN
    CREATE TRIGGER update_fpf_updated_at
      BEFORE UPDATE ON founder_print_fulfillments
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. RLS
-- ---------------------------------------------------------------------------

ALTER TABLE founder_print_fulfillments ENABLE ROW LEVEL SECURITY;

-- Member reads OWN row only; admin reads all.
DROP POLICY IF EXISTS fpf_select ON founder_print_fulfillments;
CREATE POLICY fpf_select ON founder_print_fulfillments FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- Admin-only writes. Service-role bypasses RLS for any internal cron/webhook
-- paths if added later.
DROP POLICY IF EXISTS fpf_admin_write ON founder_print_fulfillments;
CREATE POLICY fpf_admin_write ON founder_print_fulfillments FOR ALL
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

COMMIT;
