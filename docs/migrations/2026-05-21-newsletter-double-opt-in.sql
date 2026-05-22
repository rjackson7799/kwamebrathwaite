-- Migration: Add double opt-in confirmation to newsletter_subscribers
-- Purpose: Stop bot-driven signup spam by requiring subscribers to confirm via email
--          before they appear in the active list or trigger admin notifications.
-- Date: May 21, 2026

-- 1. Add columns (nullable first so we can backfill existing rows safely)
ALTER TABLE newsletter_subscribers
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS confirmation_token UUID,
  ADD COLUMN IF NOT EXISTS confirmation_sent_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS confirmation_send_count INTEGER NOT NULL DEFAULT 0;

-- 2. Backfill: existing rows predate the confirmation flow and are treated as confirmed.
UPDATE newsletter_subscribers
  SET confirmed_at = subscribed_at
  WHERE confirmed_at IS NULL;

UPDATE newsletter_subscribers
  SET confirmation_token = uuid_generate_v4()
  WHERE confirmation_token IS NULL;

-- 3. Enforce uniqueness + default on confirmation_token going forward.
ALTER TABLE newsletter_subscribers
  ALTER COLUMN confirmation_token SET NOT NULL,
  ALTER COLUMN confirmation_token SET DEFAULT uuid_generate_v4();

CREATE UNIQUE INDEX IF NOT EXISTS idx_newsletter_confirmation_token
  ON newsletter_subscribers(confirmation_token);

-- 4. Index on confirmed_at for admin filters (active = confirmed AND not unsubscribed).
CREATE INDEX IF NOT EXISTS idx_newsletter_confirmed_at
  ON newsletter_subscribers(confirmed_at);

COMMENT ON COLUMN newsletter_subscribers.confirmed_at IS
  'Double opt-in confirmation timestamp — NULL means the subscriber has not yet clicked the confirm link';
COMMENT ON COLUMN newsletter_subscribers.confirmation_token IS
  'Opaque per-subscriber token used to authenticate the double opt-in confirmation request';
COMMENT ON COLUMN newsletter_subscribers.confirmation_sent_at IS
  'Timestamp of the most recent confirmation email sent — used for per-email resend cooldown';
COMMENT ON COLUMN newsletter_subscribers.confirmation_send_count IS
  'Number of confirmation emails sent to this address — used to cap resends and prevent email-bomb abuse';

-- ---------------------------------------------------------------------------
-- Stale pending rows are cleaned up automatically by the daily Vercel Cron at
-- /api/cron/newsletter-cleanup (see vercel.json). The cron deletes any row
-- where confirmed_at IS NULL AND subscribed_at < NOW() - INTERVAL '7 days'.
-- ---------------------------------------------------------------------------
