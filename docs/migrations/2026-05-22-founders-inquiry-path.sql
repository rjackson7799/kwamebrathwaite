-- ============================================================================
-- Phase 1B: Founder inquiry path (no auth yet)
-- ============================================================================
-- Adds:
--   - founder_inquiry_status enum
--   - inquiries.source column ('general_contact' | 'founder_inquiry')
--   - inquiries.founder_status column (richer lifecycle for founder inquiries)
--   - rate_limit_events table (for Phase 1C persistent OTP rate limiting;
--     created in 1B so the schema is in place when 1C lands)
--
-- Does NOT add:
--   - founders table  (Phase 1C)
--   - inquiries.converted_founder_id  (Phase 1C — added when founders table exists)
--
-- Run via: Supabase SQL editor.
-- After running: regenerate TypeScript types
--   npx supabase gen types typescript --linked > lib/supabase/types.ts
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. founder_inquiry_status enum
-- ---------------------------------------------------------------------------
-- A richer lifecycle than the existing inquiries.status enum
-- (new/read/responded/archived). We keep the existing column intact for
-- general_contact inquiries and add a SEPARATE column for founder inquiries
-- so we don't have to touch the existing validation/UI for general contact.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'founder_inquiry_status') THEN
    CREATE TYPE founder_inquiry_status AS ENUM (
      'new',
      'read',
      'in_conversation',
      'converted',
      'declined',
      'archived'
    );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. inquiries.source + inquiries.founder_status
-- ---------------------------------------------------------------------------

ALTER TABLE inquiries
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'general_contact',
  ADD COLUMN IF NOT EXISTS founder_status founder_inquiry_status;

-- Source value constraint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inquiries_source_chk'
  ) THEN
    ALTER TABLE inquiries
      ADD CONSTRAINT inquiries_source_chk
      CHECK (source IN ('general_contact', 'founder_inquiry'));
  END IF;
END $$;

-- founder_status is required iff source = 'founder_inquiry'
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inquiries_founder_status_chk'
  ) THEN
    ALTER TABLE inquiries
      ADD CONSTRAINT inquiries_founder_status_chk
      CHECK (
        (source = 'founder_inquiry' AND founder_status IS NOT NULL)
        OR
        (source = 'general_contact' AND founder_status IS NULL)
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS inquiries_source_idx         ON inquiries(source);
CREATE INDEX IF NOT EXISTS inquiries_founder_status_idx ON inquiries(founder_status);

COMMENT ON COLUMN inquiries.source IS
  'Discriminates ''general_contact'' (legacy /contact form) from '
  '''founder_inquiry'' (Founder''s Circle /founders form). Founder '
  'inquiries get richer SLA treatment and a separate lifecycle column.';

COMMENT ON COLUMN inquiries.founder_status IS
  'Founder-inquiry lifecycle. NULL for general_contact rows (enforced by '
  'inquiries_founder_status_chk). Distinct from inquiries.status so the '
  'existing /contact form''s validation enum is undisturbed.';

-- ---------------------------------------------------------------------------
-- 3. rate_limit_events  — persistent rate limiter for security-critical flows
-- ---------------------------------------------------------------------------
-- Backs lib/api/rate-limit.ts:rateLimitPersistent(). Counts successful events
-- per (bucket, identifier) over a rolling window. Created in 1B because the
-- founder OTP flow in 1C needs it; 1B inquiry submissions continue using the
-- existing in-memory rateLimit() because honeypot + spam scoring is the real
-- defense there.

CREATE TABLE IF NOT EXISTS rate_limit_events (
  id          bigserial PRIMARY KEY,
  bucket      text NOT NULL,
  identifier  text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rate_limit_events_lookup_idx
  ON rate_limit_events (bucket, identifier, created_at DESC);

ALTER TABLE rate_limit_events ENABLE ROW LEVEL SECURITY;
-- No client policies — service-role only access from API routes.

COMMENT ON TABLE rate_limit_events IS
  'Backs lib/api/rate-limit.ts:rateLimitPersistent(). One row per '
  'rate-limited event. Cleaned up nightly via Vercel Cron (rows older '
  'than 7 days are deleted). Service-role only — no client RLS policies.';

COMMIT;
