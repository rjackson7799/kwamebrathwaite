# Founders Circle fundraiser rework — verification

Run after applying `docs/migrations/2026-05-31-founders-fundraiser-rework.sql`. Dev on port 3001.

## Automated (already wired)
- `npm run test` — pure authz/lifecycle/validation: status transitions (incl. invited→active gated
  to the activate route), AP/numbered edition range rejection, `declined` enum.
- `npm run build` — type-check + all three locales render (proves i18n key parity).

## SQL probes — column lockdown (the RLS release blocker)
Run in the Supabase SQL editor. These confirm members cannot read staff-only columns even via a
direct query with their own JWT (column-level privilege, independent of RLS rows).

```sql
-- As the member (authenticated) role, staff columns must be DENIED:
SET ROLE authenticated;
SELECT internal_notes FROM founders LIMIT 1;            -- expect: permission denied for column internal_notes
SELECT relationship_owner_email FROM founders LIMIT 1;  -- expect: permission denied
SELECT pledge_amount FROM founders LIMIT 1;             -- expect: permission denied
SELECT internal_notes FROM founder_print_fulfillments LIMIT 1; -- expect: permission denied
-- Safe columns must still work:
SELECT user_id, status, donation_amount FROM founders LIMIT 1;  -- expect: ok
RESET ROLE;
```

```sql
-- Edition CHECK + scoped uniqueness (run as postgres):
-- numbered 16 rejected; AP 3 rejected; AP 1 and numbered 1 can coexist.
INSERT INTO founder_print_fulfillments (user_id, edition_number, is_ap)
VALUES ('<some-uuid>', 16, false);   -- expect: violates fpf_edition_number_range
```

## Manual end-to-end matrix (dev)
1. **Invite** a test founder in admin (Invite a Founder → name/email/note). Founder row is `invited`,
   `last_invited_at` set, invitation email sent.
2. **Gate:** click the email link → lands on `/founders/invitation` (NOT the portal). Visiting
   `/founders/portal` while `invited` redirects to the invitation page (middleware + portal layout).
3. **Terms + donate:** check "I agree" → `terms_accepted_at` recorded → Givebutter button enables.
4. **Re-login:** sign out → `/founders/login` with the same email → magic link returns to the
   invitation page. For an fr/ja founder, the link is locale-prefixed.
5. **Activate:** admin → "Confirm donation & activate" (amount + payment ref) → status `active`,
   `activated_at` / `donation_confirmed_at` / `activated_by` stamped → portal opens. Confirm the
   status dropdown alone rejects invited→active, and that paused→active is allowed.
6. **Decline:** from the invitation page, "No, thank you" → status `declined`, closed state shows,
   link no longer opens the portal. Admin sets `declined`→`invited` + Resend → `last_invited_at`
   resets; re-login works.
7. **AP/COA:** fulfillment row with AP toggle + edition 1 → portal & COA read "Artist's Proof
   (AP 1/2)"; a numbered row reads "Edition n of 15". COA shows a stable persisted date and is NOT
   reachable while the edition is pending (print page shows the pending note; `/coa` redirects back).
8. **Cron:** `/api/cron/founders-stale-invites` surfaces invited rows by `last_invited_at` age;
   a freshly re-invited member is not flagged.
9. **OTP eligibility:** a `declined`/`archived` email gets the same generic response but no link sent.

## Release gates (block launch, not implementation)
- **Legal/tax sign-off** on the resale % (`[TBD]%` placeholder on the invitation page), the
  hold-until-2036 wording, and the donation/tax acknowledgment (donation + a print = quid-pro-quo).
  `lib/founders/terms.ts` `FOUNDER_TERMS_VERSION` is bumped when wording is finalized.
- **Real fr/ja translations** review for the new `founders.invitation` keys (currently best-effort).
- **Givebutter** hidden-campaign + donor-reference confirmation for reconciliation.
- **Exact print medium/dimension string** confirmation (currently "Archival pigment print · 20×20 in.").
