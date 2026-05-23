-- ============================================================================
-- Phase 1C: founders table + column-guard trigger + RLS + inquiries FK
-- ============================================================================
-- Adds:
--   - founders table keyed on auth.users.id with the full Phase 1 column set
--     (recognition prefs, tier, pledge, status, donor stewardship, locale,
--      comms prefs, internal notes, lifecycle timestamps).
--   - founders_guard_admin_only_columns() trigger preventing members from
--     mutating tier/pledge/status/internal_notes/relationship_owner_email
--     via the SSR client — only is_admin() callers (or service-role) may
--     change those.
--   - founders RLS policies: members see/edit own row, admins see/edit all.
--   - inquiries.converted_founder_id FK column (deferred from 1B). Records
--     which founder row a converted inquiry became.
--
-- Depends on:
--   - public.is_admin(uuid) from 2026-05-22-admins-and-rls-refactor.sql
--   - founder_inquiry_status enum + inquiries.source from
--     2026-05-22-founders-inquiry-path.sql
--
-- Run via: Supabase SQL editor.
-- After running: regenerate TypeScript types
--   npx supabase gen types typescript --linked > lib/supabase/types.ts
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Enums for founders table
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'founder_tier') THEN
    CREATE TYPE founder_tier AS ENUM (
      'founder',
      'collector_circle',
      'leadership',
      'archive',
      'legacy'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'founder_status') THEN
    CREATE TYPE founder_status AS ENUM (
      'invited',
      'active',
      'paused',
      'archived'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'recognition_visibility') THEN
    CREATE TYPE recognition_visibility AS ENUM (
      'private',
      'public_opt_in'
    );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. founders table
-- ---------------------------------------------------------------------------
-- FK to auth.users(id) — the invitation API in app/api/admin/inquiries/[id]
-- /convert/route.ts must create the auth.users row FIRST, then insert here.
-- See plan §4.2 sequencing note and §6 invitation flow.

CREATE TABLE IF NOT EXISTS founders (
  user_id                  uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                    text NOT NULL UNIQUE,
  full_name                text NOT NULL,
  recognition_name         text,
  recognition_visibility   recognition_visibility NOT NULL DEFAULT 'private',
  tier                     founder_tier,                -- admin-only in Phase 1 UI
  pledge_amount            numeric(12,2),
  pledge_term_years        int,
  pledge_fulfilled_amount  numeric(12,2) NOT NULL DEFAULT 0,
  status                   founder_status NOT NULL DEFAULT 'invited',

  -- Donor stewardship — modest set for Phase 1; CRM-class fields wait for Phase 3.
  phone                    text,
  mailing_address          jsonb,           -- { line1, line2, city, region, postal, country }
  organization             text,
  relationship_owner_email text,            -- which staff member owns this relationship

  preferred_locale         text NOT NULL DEFAULT 'en',
  comms_prefs              jsonb NOT NULL DEFAULT '{}'::jsonb,
  internal_notes           text,            -- admin-only, never exposed to member
  invited_at               timestamptz NOT NULL DEFAULT now(),
  activated_at             timestamptz,
  last_login_at            timestamptz,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS founders_status_idx ON founders(status);
CREATE INDEX IF NOT EXISTS founders_tier_idx   ON founders(tier);

COMMENT ON TABLE founders IS
  'Founder''s Circle member records. user_id FKs to auth.users — the auth '
  'user row must exist before a founders row is inserted. Member-mutable '
  'columns are enforced by founders_guard_admin_only_columns() trigger.';

-- ---------------------------------------------------------------------------
-- 3. updated_at trigger
-- ---------------------------------------------------------------------------
-- Reuses the existing update_updated_at_column() function defined in
-- DATABASE_SCHEMA.sql. Safe-create the trigger.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_founders_updated_at'
  ) THEN
    CREATE TRIGGER update_founders_updated_at
      BEFORE UPDATE ON founders
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Column-level guard via trigger (NOT via RLS WITH CHECK subqueries)
-- ---------------------------------------------------------------------------
-- Rejects member-initiated mutations to admin-only columns. is_admin() is
-- SECURITY DEFINER and bypasses RLS internally, so the check inside this
-- trigger does not recurse against founders.

CREATE OR REPLACE FUNCTION public.founders_guard_admin_only_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF public.is_admin(auth.uid()) THEN
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

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'founders_guard_admin_only_columns_trigger'
  ) THEN
    CREATE TRIGGER founders_guard_admin_only_columns_trigger
      BEFORE UPDATE ON founders
      FOR EACH ROW EXECUTE FUNCTION public.founders_guard_admin_only_columns();
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 5. founders RLS
-- ---------------------------------------------------------------------------

ALTER TABLE founders ENABLE ROW LEVEL SECURITY;

-- Member sees own row. Admin sees all.
DROP POLICY IF EXISTS founders_select ON founders;
CREATE POLICY founders_select ON founders FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- Member updates own row (column guard above enforces field whitelist).
-- Admin updates any row.
DROP POLICY IF EXISTS founders_update ON founders;
CREATE POLICY founders_update ON founders FOR UPDATE
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- Insert/delete = admin only.
DROP POLICY IF EXISTS founders_insert ON founders;
CREATE POLICY founders_insert ON founders FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS founders_delete ON founders;
CREATE POLICY founders_delete ON founders FOR DELETE
  USING (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- 6. inquiries.converted_founder_id  (deferred from 1B; founders now exists)
-- ---------------------------------------------------------------------------

ALTER TABLE inquiries
  ADD COLUMN IF NOT EXISTS converted_founder_id uuid
  REFERENCES founders(user_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS inquiries_converted_founder_id_idx
  ON inquiries(converted_founder_id);

COMMENT ON COLUMN inquiries.converted_founder_id IS
  'When an admin converts a founder inquiry to an invitation, this records '
  'the resulting founders.user_id. NULL for unconverted inquiries.';

COMMIT;
