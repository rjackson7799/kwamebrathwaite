-- Migration: Add unsubscribe token + timestamp to newsletter_subscribers
-- Purpose: Enable GDPR/CAN-SPAM compliant unsubscribe flow via tokenized link
-- Date: April 9, 2026

-- 1. Add columns (nullable first so we can backfill existing rows safely)
ALTER TABLE newsletter_subscribers
  ADD COLUMN IF NOT EXISTS unsubscribe_token UUID,
  ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMP WITH TIME ZONE;

-- 2. Backfill tokens for any pre-existing rows
UPDATE newsletter_subscribers
  SET unsubscribe_token = uuid_generate_v4()
  WHERE unsubscribe_token IS NULL;

-- 3. Enforce NOT NULL + default + uniqueness going forward
ALTER TABLE newsletter_subscribers
  ALTER COLUMN unsubscribe_token SET NOT NULL,
  ALTER COLUMN unsubscribe_token SET DEFAULT uuid_generate_v4();

CREATE UNIQUE INDEX IF NOT EXISTS idx_newsletter_unsubscribe_token
  ON newsletter_subscribers(unsubscribe_token);

-- 4. Index on unsubscribed_at for admin filtering (active vs inactive subscribers)
CREATE INDEX IF NOT EXISTS idx_newsletter_unsubscribed_at
  ON newsletter_subscribers(unsubscribed_at);

COMMENT ON COLUMN newsletter_subscribers.unsubscribe_token IS
  'Opaque per-subscriber token used to authenticate one-click unsubscribe requests';
COMMENT ON COLUMN newsletter_subscribers.unsubscribed_at IS
  'Soft-delete timestamp — NULL means the subscriber is active';
