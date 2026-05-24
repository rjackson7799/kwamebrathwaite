-- ============================================================================
-- Phase 2A: Briefings + per-recipient notifications + is_current_founder()
-- ============================================================================
-- Adds:
--   - is_current_founder() — no-arg SECURITY DEFINER role check, reads
--     auth.uid() internally and requires status='active'. Granted to
--     `authenticated` only (NOT anon) to close the membership-oracle
--     concern that the Phase 1 parametrised is_admin(uuid) raised in review.
--   - founder_briefings — admin-published rich-text dispatches; founders
--     read 'published' only; admins write.
--   - founder_briefing_reads — internal-only audit row per (briefing, user).
--     Member writes own row idempotently (composite PK). Admin reads all.
--   - founder_briefing_notifications — per-recipient send record so partial
--     failure is representable and retry is deliberate. Admin reads only;
--     writes go through service-role from the admin notify route.
--
-- Depends on:
--   - public.is_admin(uuid)              from 2026-05-22-admins-and-rls-refactor.sql
--   - founders table + founder_status    from 2026-05-23-founders-table-and-auth.sql
--   - update_updated_at_column()         from DATABASE_SCHEMA.sql
--
-- Run via: Supabase SQL editor.
-- After running: regenerate TypeScript types
--   npx supabase gen types typescript --linked > lib/supabase/types.ts
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. is_current_founder() — no-arg, reads auth.uid() internally
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER with pinned search_path. Granted to `authenticated` only,
-- never to anon — anon never has an authenticated session and exposing the
-- role-check to anonymous callers would leak membership information.
--
-- 'paused' founders are explicitly EXCLUDED from content access. Only
-- 'active' members may read briefings/previews/print/archive surfaces.
-- 'invited' rows are also excluded: the Phase 1 magic-link callback promotes
-- invited -> active on first sign-in, so any founder reaching a portal route
-- with status='invited' is in an anomalous state.

CREATE OR REPLACE FUNCTION public.is_current_founder()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM founders
    WHERE user_id = auth.uid()
      AND status = 'active'
  );
$$;

REVOKE ALL ON FUNCTION public.is_current_founder() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_current_founder() TO authenticated;

COMMENT ON FUNCTION public.is_current_founder() IS
  'True when auth.uid() identifies a founders row with status=active. '
  'No-arg form (reads auth.uid() internally) prevents the membership-oracle '
  'pattern of a parametrised role check granted to anon.';

-- ---------------------------------------------------------------------------
-- 2. briefing_status enum
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'briefing_status') THEN
    CREATE TYPE briefing_status AS ENUM (
      'draft',
      'published',
      'archived'
    );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. founder_briefings table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS founder_briefings (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           text NOT NULL,
  excerpt         text,
  body_html       text NOT NULL,                       -- TipTap HTML output; rendered through sanitizeHtml() on the read side
  status          briefing_status NOT NULL DEFAULT 'draft',
  published_at    timestamptz,
  published_by    uuid REFERENCES admins(user_id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS founder_briefings_status_idx
  ON founder_briefings(status, published_at DESC);

COMMENT ON TABLE founder_briefings IS
  'Admin-published rich-text dispatches visible to active founders. '
  'body_html is sanitised at render time via lib/utils/sanitize-html.ts.';

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_founder_briefings_updated_at'
  ) THEN
    CREATE TRIGGER update_founder_briefings_updated_at
      BEFORE UPDATE ON founder_briefings
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

ALTER TABLE founder_briefings ENABLE ROW LEVEL SECURITY;

-- Active founders see published rows; admins see all.
DROP POLICY IF EXISTS founder_briefings_select ON founder_briefings;
CREATE POLICY founder_briefings_select ON founder_briefings FOR SELECT
  USING (
    (status = 'published' AND public.is_current_founder())
    OR public.is_admin(auth.uid())
  );

-- Writes are admin-only.
DROP POLICY IF EXISTS founder_briefings_admin_insert ON founder_briefings;
CREATE POLICY founder_briefings_admin_insert ON founder_briefings FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS founder_briefings_admin_update ON founder_briefings;
CREATE POLICY founder_briefings_admin_update ON founder_briefings FOR UPDATE
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS founder_briefings_admin_delete ON founder_briefings;
CREATE POLICY founder_briefings_admin_delete ON founder_briefings FOR DELETE
  USING (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- 4. founder_briefing_reads — internal-only read audit
-- ---------------------------------------------------------------------------
-- Composite PK is the idempotency key. The detail-page server component
-- inserts one row on first render via the SSR client (RLS allows
-- self-inserts when status='active').

CREATE TABLE IF NOT EXISTS founder_briefing_reads (
  briefing_id  uuid NOT NULL REFERENCES founder_briefings(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES founders(user_id) ON DELETE CASCADE,
  read_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (briefing_id, user_id)
);

CREATE INDEX IF NOT EXISTS founder_briefing_reads_briefing_idx
  ON founder_briefing_reads(briefing_id);

COMMENT ON TABLE founder_briefing_reads IS
  'Internal audit. Recorded server-side during portal page render. '
  'Never surfaced to the reading member — admins only.';

ALTER TABLE founder_briefing_reads ENABLE ROW LEVEL SECURITY;

-- Member sees own rows; admin sees all.
DROP POLICY IF EXISTS founder_briefing_reads_select ON founder_briefing_reads;
CREATE POLICY founder_briefing_reads_select ON founder_briefing_reads FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- Member inserts own row, only when active. Admin not needed for inserts
-- (the read is the founder's, not the admin's).
DROP POLICY IF EXISTS founder_briefing_reads_self_insert ON founder_briefing_reads;
CREATE POLICY founder_briefing_reads_self_insert ON founder_briefing_reads FOR INSERT
  WITH CHECK (user_id = auth.uid() AND public.is_current_founder());

-- No UPDATE or DELETE policies — reads are immutable.

-- ---------------------------------------------------------------------------
-- 5. briefing_notification_status enum + founder_briefing_notifications
-- ---------------------------------------------------------------------------
-- Per-recipient row. Replaces a single notified_at flag so partial failure
-- is representable and resend logic only touches rows with status='failed'.
-- Opt-outs persist as 'skipped' so the audit shows every active founder
-- accounted for at notify time.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'briefing_notification_status') THEN
    CREATE TYPE briefing_notification_status AS ENUM (
      'queued',
      'sent',
      'failed',
      'skipped'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS founder_briefing_notifications (
  briefing_id  uuid NOT NULL REFERENCES founder_briefings(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES founders(user_id) ON DELETE CASCADE,
  status       briefing_notification_status NOT NULL DEFAULT 'queued',
  sent_at      timestamptz,
  error        text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (briefing_id, user_id)
);

CREATE INDEX IF NOT EXISTS fbn_briefing_status_idx
  ON founder_briefing_notifications(briefing_id, status);

COMMENT ON TABLE founder_briefing_notifications IS
  'Per-recipient send record. Admin notify route enqueues one row per active '
  'opt-in founder (and ''skipped'' rows for opt-outs), then iterates queued '
  'rows sending via Resend. Retry only touches status=''failed'' rows.';

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_fbn_updated_at'
  ) THEN
    CREATE TRIGGER update_fbn_updated_at
      BEFORE UPDATE ON founder_briefing_notifications
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

ALTER TABLE founder_briefing_notifications ENABLE ROW LEVEL SECURITY;

-- Admin-only client SELECT. Writes happen via service-role from the admin
-- notify route, which bypasses RLS — so no INSERT/UPDATE/DELETE policies
-- for client roles.
DROP POLICY IF EXISTS fbn_admin_select ON founder_briefing_notifications;
CREATE POLICY fbn_admin_select ON founder_briefing_notifications FOR SELECT
  USING (public.is_admin(auth.uid()));

COMMIT;
