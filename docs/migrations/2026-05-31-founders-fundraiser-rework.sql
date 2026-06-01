-- ============================================================================
-- Founder's Circle — fundraiser rework: declined status, donation/terms
-- fields, Artist's Proofs, edition constraints, and column-level lockdown
-- ============================================================================
-- Client finalized the special-fundraiser terms (flat $10k donation, 15
-- numbered + 2 Artist's Proofs, hold-until-2036, secondary-market resale
-- contribution) and the invite/activation workflow (invite -> review terms ->
-- donate -> admin confirms & activates). This migration carries the schema
-- changes that workflow + a security review require:
--
--   1. 'declined' founder_status (self-/admin-decline of an invitation).
--   2. founders: donation + terms-acceptance + activation-audit + re-invite
--      columns.
--   3. founder_print_fulfillments: is_ap, coa_issued_at, scoped uniqueness,
--      and a CHECK pinning edition numbers to 1..15 (numbered) / 1..2 (AP).
--   4. Column-level lockdown: members keep direct base-table reads ONLY on a
--      safe column subset; staff-only columns (internal_notes,
--      relationship_owner_email, pledge_*, payment_reference, activated_by,
--      last_invited_at) are revoked from authenticated/anon. Admin reads of
--      those columns go through the service-role client (see the route changes
--      shipped alongside this migration). Member-side reads MUST use explicit
--      projections — `select('*')` on founders/founder_print_fulfillments by a
--      member role will now error, which is the intended protection.
--   5. founder_print_fulfillments member SELECT now also requires
--      is_current_founder() (active), matching briefings/previews.
--
-- Depends on:
--   - founders table + founder_status     from 2026-05-23-founders-table-and-auth.sql
--   - public.is_admin(uuid)               from 2026-05-22-admins-and-rls-refactor.sql
--   - public.is_current_founder()         from 2026-05-24-briefings.sql
--   - founder_print_fulfillments          from 2026-05-26-founder-print-fulfillments.sql
--   - update_updated_at_column()          from DATABASE_SCHEMA.sql
--
-- Run via: Supabase SQL editor.
--
-- ⚠️ TWO-PASS NOTE: `ALTER TYPE ... ADD VALUE` cannot run inside a transaction
-- block and the new value cannot be USED in the same transaction that adds it.
-- Step 1 below is therefore deliberately OUTSIDE the BEGIN/COMMIT. If pasting
-- the whole file fails, run Step 1 by itself first, then run Step 2.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- STEP 1 — add the 'declined' enum value (NO transaction; run first)
-- ----------------------------------------------------------------------------
ALTER TYPE founder_status ADD VALUE IF NOT EXISTS 'declined';


-- ----------------------------------------------------------------------------
-- STEP 2 — everything else (transactional)
-- ----------------------------------------------------------------------------
BEGIN;

-- 2.1 — founders: donation, terms-acceptance, activation audit, re-invite
ALTER TABLE founders
  ADD COLUMN IF NOT EXISTS donation_amount       numeric(12,2),
  ADD COLUMN IF NOT EXISTS donation_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_reference     text,
  ADD COLUMN IF NOT EXISTS terms_version         text,
  ADD COLUMN IF NOT EXISTS terms_accepted_at     timestamptz,
  ADD COLUMN IF NOT EXISTS activated_by          text,
  ADD COLUMN IF NOT EXISTS last_invited_at       timestamptz;

-- Backfill the re-invite clock for existing rows so the stale-invite cron
-- (now keyed on last_invited_at) behaves for pre-existing invitations.
UPDATE founders SET last_invited_at = invited_at WHERE last_invited_at IS NULL;

COMMENT ON COLUMN founders.donation_amount IS
  'Recorded donation amount for the Founder''s Circle (flat $10,000 for the '
  'special fundraiser). Set by admin at activation.';
COMMENT ON COLUMN founders.payment_reference IS
  'Admin-only. External donation reference (e.g. Givebutter txn) used to '
  'reconcile the donation at activation. Never exposed to members.';
COMMENT ON COLUMN founders.terms_accepted_at IS
  'When the member accepted the Founder terms (hold-until-2036 + secondary-'
  'market contribution) on the invitation page. Paired with terms_version.';
COMMENT ON COLUMN founders.activated_by IS
  'Admin-only. Email of the admin who confirmed the donation and activated '
  'the member.';
COMMENT ON COLUMN founders.last_invited_at IS
  'Set on every (re)invitation send. The stale-invite cron measures invite age '
  'from this, so re-invited members restart the clock.';

-- 2.2 — founder_print_fulfillments: Artist's Proof + persisted COA date
ALTER TABLE founder_print_fulfillments
  ADD COLUMN IF NOT EXISTS is_ap         boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS coa_issued_at timestamptz;

COMMENT ON COLUMN founder_print_fulfillments.is_ap IS
  'True for an Artist''s Proof (AP 1/2). Numbered editions are 1..15; APs are '
  '1..2. Drives member-facing labels ("Artist''s Proof (AP n/2)" vs '
  '"Edition n of 15").';
COMMENT ON COLUMN founder_print_fulfillments.coa_issued_at IS
  'Persisted Certificate of Authenticity issuance date, stamped when an '
  'edition number is first assigned. The COA renders this fixed date (never '
  'a render-time now()).';

-- Edition uniqueness scoped per group so AP "1/2" never collides with
-- numbered "1/15".
DROP INDEX IF EXISTS fpf_edition_number_unique;
CREATE UNIQUE INDEX IF NOT EXISTS fpf_edition_number_numbered_unique
  ON founder_print_fulfillments(edition_number)
  WHERE edition_number IS NOT NULL AND is_ap = false;
CREATE UNIQUE INDEX IF NOT EXISTS fpf_edition_number_ap_unique
  ON founder_print_fulfillments(edition_number)
  WHERE edition_number IS NOT NULL AND is_ap = true;

-- Pre-flight audit: abort cleanly if any existing row would violate the
-- edition-range CHECK, so the admin fixes data before the constraint lands
-- (rather than a half-applied migration).
DO $$
DECLARE bad int;
BEGIN
  SELECT count(*) INTO bad FROM founder_print_fulfillments
  WHERE edition_number IS NOT NULL
    AND NOT (
      (is_ap = false AND edition_number BETWEEN 1 AND 15)
      OR (is_ap = true AND edition_number BETWEEN 1 AND 2)
    );
  IF bad > 0 THEN
    RAISE EXCEPTION 'Aborting: % fulfillment row(s) violate the edition range '
      '(numbered 1..15, AP 1..2). Fix edition_number/is_ap before applying.', bad;
  END IF;
END $$;

ALTER TABLE founder_print_fulfillments
  DROP CONSTRAINT IF EXISTS fpf_edition_number_range;
ALTER TABLE founder_print_fulfillments
  ADD CONSTRAINT fpf_edition_number_range CHECK (
    edition_number IS NULL
    OR (is_ap = false AND edition_number BETWEEN 1 AND 15)
    OR (is_ap = true  AND edition_number BETWEEN 1 AND 2)
  );

-- 2.3 — member SELECT on fulfillments now requires an ACTIVE founder
-- (matches briefings/previews via is_current_founder()). An invited member
-- who clicks their magic link is authenticated but NOT active, so they
-- cannot read fulfillment rows.
DROP POLICY IF EXISTS fpf_select ON founder_print_fulfillments;
CREATE POLICY fpf_select ON founder_print_fulfillments FOR SELECT
  USING (
    (user_id = auth.uid() AND public.is_current_founder())
    OR public.is_admin(auth.uid())
  );

-- 2.4 — Column-level lockdown
-- RLS is row-based: founders_select / fpf_select let the row owner read the
-- WHOLE row, including staff-only columns. Column privileges are the only way
-- to hide columns from the member (authenticated) role. We revoke the
-- table-level SELECT and re-grant SELECT on the safe subset only. Admin reads
-- of the hidden columns run through the service-role client (BYPASSRLS, full
-- privileges) in app/api/admin/founders/*.
--
-- founders — hidden from members: internal_notes, relationship_owner_email,
-- pledge_amount, pledge_term_years, pledge_fulfilled_amount, payment_reference,
-- activated_by, last_invited_at.
REVOKE SELECT ON founders FROM authenticated, anon;
GRANT SELECT (
  user_id, email, full_name, recognition_name, recognition_visibility, tier,
  status, phone, mailing_address, organization, preferred_locale, comms_prefs,
  invited_at, activated_at, last_login_at, created_at, updated_at,
  donation_amount, donation_confirmed_at, terms_version, terms_accepted_at
) ON founders TO authenticated;

-- founder_print_fulfillments — hidden from members: internal_notes.
REVOKE SELECT ON founder_print_fulfillments FROM authenticated, anon;
GRANT SELECT (
  user_id, edition_number, status, shipped_at, delivered_at, tracking_url,
  is_ap, coa_issued_at, created_at, updated_at
) ON founder_print_fulfillments TO authenticated;

COMMIT;
