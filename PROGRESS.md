# Project Progress Tracker
## Kwame Brathwaite Archive Website

**Last Updated:** August 15, 2026

---

## Smart Import: AI paste-and-parse for exhibitions + press (August 15, 2026)

### Problem

The client keeps the exhibition/event schedule as a plain-text document ([docs/events.md](docs/events.md) is a real copy). Getting it onto the site meant retyping ~20 entries into `/admin/exhibitions/new` field by field, and re-deriving the diff by hand every revision. Line order varies, venue/city/state split unpredictably, and stray lines are accolades — not regex-able.

### What Changed

- [x] **`/admin/import`** — paste raw text, GPT-4o parses it into structured items, review and correct them, publish into `exhibitions` / `press`. Two DB-backed tables (`content_imports`, `content_import_items`) so a batch is resumable and auditable.
- [x] **`entry_kind` on exhibitions** (`exhibition|screening|talk|event`), a NEW column — deliberately not `exhibition_type`, which is temporal (`past/current/upcoming`) and is consumed as an object key (`statusStyles[...]`) and i18n key (`t('status.…')`). A new value there would render an undefined className, a blank badge, and a missing-key error. Kind badge is a separate lookup with its own `entryKind.*` keys in en/fr/ja.
- [x] **Duplicate matching by hard gates, not weighted scores.** Auto-update requires a canonical URL match, or exact normalized title **plus** same place **and** compatible dates. The archive tours the same show — *Sunday Best* (Toronto + Philadelphia), *Disco, I'm Coming Out* (Amsterdam/Munich/Antwerp) — so title similarity alone can never merge records. Those exact rows are seeded test fixtures.
- [x] **`publish_import_item()` RPC** — the conditional `UPDATE … WHERE status='pending'` *is* the claim, which makes publish idempotent under double-click. Claim + write + transition + audit share one transaction, so a dead connection rolls back to `pending` and no lease machinery is needed. Failures persist via a nested `EXCEPTION` block (a raised exception would otherwise roll back the `failed` write too).

### Safety model (deliberate, user-approved)

**Creates always land as `draft`. No change — create or update — reaches the public site without a human approving it field-by-field.** Updates to *published* records apply immediately, gated by: a LIVE badge, an apply-mask that starts **empty** for live targets, and a required `reviewed_at` enforced **server-side** in both the route and the RPC. `slug` and `status` are never written on update. Stale targets (record changed after matching) fail and require **Refresh match**, not blind retry.

### Kind-aware public surfaces + the null-date audit

- [x] **`ExhibitionDetail`** carries `entry_kind`, renders the kind badge as its own lookup beside the temporal one, and takes a kind-aware heading (`detail.about.{kind}` — "About This Screening", not "About This Exhibition").
- [x] **schema.org type follows `entry_kind`**, not `exhibition_type`: `ScreeningEvent` for screenings, `Event` for talks/events, `ExhibitionEvent` otherwise. Single-day entries emit `endDate = startDate` instead of null, which would read as open-ended.
- [x] **Fixed: every past exhibition was published as `EventCancelled`.** That value tells search engines the event was *called off*. A past event that actually happened is `EventScheduled`.
- [x] **Fixed: Add to Calendar was permanently disabled for single-day entries** — it required both `start_date` and `end_date`, and screenings have no end date. Now only `start_date` is required.
- [x] **Fixed two ICS date bugs** surfaced by that: `DTEND` is *exclusive* for all-day events (RFC 5545 §3.8.2.2), so exports were a day short and a single-day event would have been zero-length; and dates were formatted with **local** getters off a UTC-parsed string, shifting the calendar date back a day for every US visitor. Both pinned by `tests/calendar-ics.test.ts`.
- [x] Calendar description was hard-coded English `Exhibition at …`; now kind-aware and localized in en/fr/ja, along with the download toast.

### Verified

Typecheck clean, prod build passes, **183 unit tests** across parser/matching/mapping/service/calendar/locale-parity. Parser tests run against checked-in saved model responses so CI is deterministic.

**Migration applied** (August 15, 2026) and verified live end-to-end against the real project — real GPT-4o calls, real writes, all test data deleted afterwards (0 batches, 0 items, 0 imported rows remaining).

- **4-entry client sample: full pass.** #1 `screening` Parramatta/**Australia** (AU resolved to a country, no state) single-day 2026-09-06; #2 `screening` Washington/**DC**/United States with the ABFF award folded into `description` **and** a warning raised; #3 titled **"You and I"** — the real title from line 2, with the "Solo Exhibition in collaboration with…" descriptor correctly demoted to `description` — Philip Martin Gallery/Los Angeles/CA, Oct 1–31; #4 `screening` by precedence despite naming both a screening and a talk. All four published as `status='draft'` with derived slugs and `exhibition_type='upcoming'`. Cost $0.011, 8.5s.
- **Re-paste proposes updates, not duplicates.** `docs/events.md` → 18 items, one chunk, ~$0.044, ~45s. Second paste of the same document: **18/18 update** on one run, **17/18** on a repeat.
- **Fixed the 17/18.** The parser ran at `temperature: 0.1`. Matching uses hard gates, so a run that split a location line differently (venue `Museum of Contemporary Art` / city `San Diego` vs. together) fails to match and proposes a duplicate create. Extraction has nothing to be creative about — now `temperature: 0` with a fixed `seed`.
- **The live-update gate is real, and it blocks headless publishing.** 13 of 18 items matched *published* archive records and got an **empty** `apply_mask` by design ([service.ts:229](lib/import/service.ts#L229)), so they refused to publish with "No fields are selected to apply." That is decision 5 working — those fields can only be ticked by a human in the review UI, which is therefore the one path a headless harness cannot cover.

### Not done yet

- **UI pass on dev :3001** — the review screen is the one thing the headless harness cannot exercise: ticking per-field apply checkboxes on a LIVE match, the `reviewed_at` gate, save-on-blur, and the responsive/keyboard pass.
- **`lib/supabase/types.ts` regeneration is its own task, not a step here.** The plan assumed the file was pure generated output; it is not — ~90 lines of hand-written aliases at the bottom are what the app actually imports, and regenerating over the whole file deletes them. Regenerating properly (generated output + re-appended aliases) surfaces **26 pre-existing type errors across 9 files** — mostly `string | null` columns the old hand-tuned types declared as non-null, in artworks/hero/content. Reverted; the two local `entry_kind` widenings stay for now, both marked with a comment. Worth doing as a focused null-safety pass.
- **Separate bug found while diffing types: `exhibition_reminders` does not exist in the live schema**, but three routes query it ([exhibitions/reminders](app/api/exhibitions/reminders/route.ts), [admin/exhibition-reminders](app/api/admin/exhibition-reminders/route.ts), and its export route). All three reach it through `as any`, so they compile and fail at runtime. Unrelated to Smart Import — either create the table or remove the routes.
- Tests **written but unrun**: `tests/integration/content-import-rpc.test.ts` (17 tests, self-skips without `SUPABASE_TEST_*`) and the hand-run SQL probe [docs/migrations/tests/content-import-rls.test.sql](docs/migrations/tests/content-import-rls.test.sql). Both need a dedicated test project with this migration applied — deliberately not pointed at production.
- `maxDuration = 300` is now the documented Vercel default on **all** plans, and the repo already ships two 300s routes ([leads/run](app/api/admin/leads/run/route.ts), [cron/leads-weekly](app/api/cron/leads-weekly/route.ts)). Still worth one timed max-size paste in production to confirm it holds in practice.

---

## Founders Circle: Evergreen Sign-in Links (July 7, 2026)

### Problem

Donor complaints: members went back to *previous* emails, clicked the old magic link, and hit "expired or already used" — blocking the exact people we want reaching the invitation page to donate. Root cause: every founder email carried a raw Supabase magic-link token (one-time, 24h).

### What Changed

- [x] **All founder-facing emails now carry the durable 30-day multi-use bridge link** (`/founders/invite/[token]`, built 2026-06-21 for admin copy-paste invites) instead of a raw one-time token. Swapped `generateFounderMagicLink` → `createFounderInviteLink` in [request-otp](app/api/founders/auth/request-otp/route.ts) (tagged `self:request-otp`), [admin create+invite](app/api/admin/founders/route.ts), [admin resend](app/api/admin/founders/[id]/invite/route.ts), and [inquiry convert](app/api/admin/inquiries/[id]/convert/route.ts). Any email in a donor's inbox now works for 30 days and can be clicked multiple times. No DB migration — reuses `founder_invite_links` as-is.
- [x] Interstitial shows "Welcome back, {name}" for `active` members vs invitation copy for `invited`; confirm POST rate-limited (`founder_invite_confirm`, 10/min/IP → `?reason=rate_limited`). GET page deliberately not rate-limited.
- [x] Warmer expired-link recovery: friendlier `reasons.expired` copy + email field autofocus on the login page when arriving from a failed link. New i18n keys (`rateLimited`, `headingReturning`, `bodyReturning`) in en/fr/ja.
- [x] Email templates updated ("works for 30 days, use it more than once").
- [x] request-otp now only sends to `invited`/`active` (paused/declined/archived get the same generic success — no state leak); admin resend tightened to `invited` only (409 otherwise). `createFounderInviteLink` clears the user's expired rows before insert (housekeeping).

### Security tradeoff (deliberate, user-approved)

30-day multi-use bearer link in email is weaker than 24h one-time. Mitigations preserved: POST-only confirm interstitial (defeats scanners), SHA-256-only storage, no-store/no-referrer, per-member revocation + global sign-out, `last_login_at` audit. Session security unchanged — the bridge mints a fresh one-time Supabase token at click time. TTL dial: `INVITE_LINK_TTL_MS` in [lib/founders/invite-links.ts](lib/founders/invite-links.ts).

### Verified

Typecheck clean, 25 unit tests pass, prod build passes. Live smoke (dev :3001): expired/rate_limited copy renders in en/fr/ja, bad-token invite redirects to login, unknown-email request-otp returns generic success, confirm rate limit trips at 11th POST/min. Note: 24h links already in inboxes stay dead (softened landing); every email sent from now on is evergreen.

---

## Licensing Form 500 Fix + Daily Form-Health Monitor (July 6, 2026)

### Problem

The public licensing form (`/licensing/request`) failed on every submission — `/api/licensing/types` and `/api/licensing/request` both returned 500, with cascading React hydration errors (#425/#418/#423) in the console.

### Root Cause

The licensing tables were **never created in Supabase**. `PGRST205 "Could not find the table 'public.license_types'"`. The schema lived only in [docs/SHOP_AND_LICENSING_SCHEMA.sql](docs/SHOP_AND_LICENSING_SCHEMA.sql) (a spec file, not an applied migration) — the exact "migration hygiene" gap flagged in the April 11 RLS entry below. The React errors were downstream of the failed fetch, not separate bugs.

### What Was Fixed

- [x] **Migration** [docs/migrations/2026-07-06_licensing_tables.sql](docs/migrations/2026-07-06_licensing_tables.sql) — creates `license_types`, `license_requests`, `license_request_artworks` (+ indexes, `updated_at` triggers, RLS, seed of the 5 default license types). Idempotent, wrapped in a transaction. **Applied to prod `jtsetwowalcnrmuygglb` 2026-07-06** and verified end-to-end (types 200, request 201). Commit `68cd4f1`.
- [x] **Security (caught in review):** admin RLS uses `public.is_admin(auth.uid())`, NOT the pre-refactor `auth.role() = 'authenticated'`. Copying the old shop/licensing pattern would have let Founders Circle members (same `auth.users` pool) read all license-request PII via the anon REST API — the hole the [2026-05-22 refactor](docs/migrations/2026-05-22-admins-and-rls-refactor.sql) closed. **⚠️ `SHOP_AND_LICENSING_SCHEMA.sql`'s shop half still carries this flaw on `orders` (customer PII) — port to `is_admin()` before ever running it.**

### Daily Form-Health Monitor (closes the April 9 "error monitoring / uptime pings" deferral)

- [x] **Cron** [app/api/cron/form-health/route.ts](app/api/cron/form-health/route.ts) at `0 8 * * *` UTC ([vercel.json](vercel.json)). Synthetic monitor for the three public lead forms so a silent DB break (like this one) is caught within ~24h instead of by a lost lead.
- Probes the **data layer** via the service-role client rather than firing real submissions (which would email the team + trip rate-limit/spam filters): reads `license_types`, and does an insert+delete round-trip against `inquiries` (contact + works/artwork paths) and `license_requests` (+ junction FK). Test rows are labelled, kept out of the admin "new" queue, and deleted before the response — nothing left behind.
- **On failure:** emails `MONITOR_ALERT_EMAIL` (default `ryan.jackson.2009@gmail.com` — dev only, deliberately not the all-admins `sendAdminEmail`) via Resend and returns 500 so the failure also surfaces in Vercel's cron logs. Silent on success. Auth via `CRON_SECRET` like the other crons. Commit `9364480`.
- Verified locally: wrong secret → 401, healthy → 200 all-pass, forced failure → 500 + alert delivered, cleanup leaves zero rows, typecheck clean.

### To Tune / Operate

- Frequency → edit the `form-health` schedule in [vercel.json](vercel.json); alert recipient → set `MONITOR_ALERT_EMAIL` in Vercel (no code change).
- `CRON_SECRET` already set in Vercel (other crons use it). Manual trigger: Vercel dashboard → Cron Jobs → Run.

### Status

Both commits pushed to `main` and deployed via Vercel. Licensing form works in production (DB-only fix, no redeploy needed). Monitor registers on next deploy; first run next 08:00 UTC.

---

## Founders Circle — Durable Copyable Invite/Sign-In Links (June 21, 2026)

### Problem

Some invited founders never received the invitation email (deliverability — spam filtering, typo'd address). The only entry path was an emailed Supabase magic link, so a non-delivered email left the admin with no way to get the person in.

### Architecture

A durable, admin-copyable link an admin pastes into their own email. It is OUR token (30-day life) that bridges to the existing Supabase magic-link callback **at click time** — so the 24h Supabase window only starts on click and "Resend invite" never breaks it. A confirmation interstitial (auth happens only on an explicit POST) defeats email scanners. Available for **invited** (review + donate) and **active** (portal) founders only; paused/declined/archived dead-end at the closed screen and are excluded.

Flow: admin `POST /api/admin/founders/[id]/invite-link` → 30-day token (SHA-256 hash stored, raw in URL) → admin pastes URL → founder opens `/founders/invite/[token]` (GET confirm page, **no auth**) → clicks Continue (POST) → 303 to a freshly minted Supabase magic link **on the same origin** → existing `/founders/auth/callback` verifies + routes by status. Multiple links may coexist per founder; each "Copy" mints a new one.

### What Was Built

- [x] **Migration** [docs/migrations/2026-06-21-founder-invite-links.sql](docs/migrations/2026-06-21-founder-invite-links.sql) — `founder_invite_links` table: service-role only (no grants to authenticated/anon, RLS enabled), hashed tokens, UNIQUE hash index. **Applied to prod 2026-06-21.**
- [x] **Pure helpers** [lib/founders/invite-links.ts](lib/founders/invite-links.ts) (hash, expiry boundary, status eligibility) + unit tests [tests/founder-invite-links.test.ts](tests/founder-invite-links.test.ts).
- [x] **Service-role helpers** in [lib/auth/founders-admin.ts](lib/auth/founders-admin.ts) (`createFounderInviteLink`, `findFounderByInviteToken`, `resolveFounderInviteToken`, `revokeFounderInviteLinks`).
- [x] **Public bridge** [app/[locale]/founders/invite/[token]/page.tsx](app/%5Blocale%5D/founders/invite/%5Btoken%5D/page.tsx) (GET confirm, no auth) + [confirm/route.ts](app/%5Blocale%5D/founders/invite/%5Btoken%5D/confirm/route.ts) (POST). `no-store` + `no-referrer` on both (route + [middleware.ts](middleware.ts)).
- [x] **Admin API** [app/api/admin/founders/[id]/invite-link/route.ts](app/api/admin/founders/%5Bid%5D/invite-link/route.ts) — POST mints, DELETE revokes all. Does **not** touch `last_invited_at` (copying ≠ sending, keeps the stale-invite cron honest).
- [x] **Admin UI** [app/admin/founders/[id]/page.tsx](app/admin/founders/%5Bid%5D/page.tsx) — "Copy invite link" / "Copy sign-in link" button + reveal box (URL + expiry + Copy + Revoke all links) + toast.
- [x] **Login reason banner** [app/[locale]/founders/login/page.tsx](app/%5Blocale%5D/founders/login/page.tsx) (renders `?reason=expired|not_invited|revoked|...`). Strings under `founders.login.reasons` + `founders.invite` in all three locales.
- [x] **Revocation hooks** — links deleted on archive ([revoke route](app/api/admin/founders/%5Bid%5D/revoke/route.ts)) and delete ([id route](app/api/admin/founders/%5Bid%5D/route.ts)).
- [x] **Integration tests** [tests/integration/founder-invite-links.test.ts](tests/integration/founder-invite-links.test.ts) — lookup-by-hash, UNIQUE index, RLS lockdown, coexistence/revoke (self-skip without `SUPABASE_TEST_*`).

### Bugs Fixed During Rollout

| Symptom | Cause | Fix |
|---|---|---|
| Continue button did nothing | Confirm POST returned the default **307** redirect, which preserves the method → browser re-POSTed to the GET-only magic-link callback → 405 | Redirect with **303 See Other** (Post/Redirect/Get) so the browser switches to GET (`56e06d8`) |
| Continue blocked by CSP | Post-submit redirect went to the canonical **apex** `siteUrl()` while founders browse **www** → cross-origin redirect tripped `form-action 'self'` ([next.config.mjs](next.config.mjs)) | Re-base the post-submit redirect onto the **request's own origin** so the whole chain stays same-origin (`a897f9e`) |

### Security

256-bit token (`randomBytes(32)`) stored only as a SHA-256 hash → a DB leak yields no usable links; 30-day expiry; revocable (manual + on archive/delete); confirm-on-POST defeats email scanners/previews; `no-store` + `no-referrer` on the credential-bearing hops. Admin endpoints gated by middleware + `requireAdmin`; the bridge only authenticates the matching founder, then hands off to the existing hardened callback.

### Known Limitations / Out of Scope

- Founder login email is not editable in the admin (`adminFounderUpdateSchema` has no `email`), so there is no email-change revocation hook.
- **Canonical host:** `NEXT_PUBLIC_SITE_URL` is the apex but the site is served on `www`, so admin-copied links and emails use the apex (the confirm redirect is now origin-relative, so it still works wherever opened). Setting `NEXT_PUBLIC_SITE_URL=https://www.kwamebrathwaite.com` would make copied links/emails use `www` directly — a separate, optional cleanup.

### Status

Shipped to `main` and verified working in production. Commits `924d46c` (feature), `56e06d8` (303 fix), `a897f9e` (CSP origin fix).

### Follow-up — portrait + fr/ja localization (June 21, 2026)

- Invitation portrait swapped to `founders_KB_2026.jpg` (`fd00344`).
- Translated the founder-facing invite/login flow for **French + Japanese** (`7244a9e`): invitation page `intro2`/`intro3` + the three benefit lines, plus the `login`, `callback`, `invite` (confirm page), and `login.reasons` strings — all previously English fallbacks/placeholders. Verified FR/JA login pages + reason banners render translated and EN is unchanged.
- **Known follow-ups:** (1) **Portal sub-pages** (briefings, previews, profile, security) likely still have untranslated fr/ja strings — not yet swept. (2) Translations are dev-authored; a native-speaker review is advisable, especially the longer `intro3` / `benefitTax` sentences. (3) The fr/ja `founders.invitation` block still carries ~5 dead keys from an older design (`term20x20`, `termDonation`, `termEdition`, `holdUntil2036`, `termsHeading`) — unused, left in place.

---

## Newsletter Double Opt-In + Hardening (May 21, 2026)

### Problem

Bot-driven newsletter signups were flooding the admin inbox with `[Admin] New newsletter subscriber: ...` emails and filling `newsletter_subscribers` with rows from unrelated domains. The honeypot field on the footer form and the 3/min IP rate limit on `/api/newsletter/subscribe` were ineffective — bots POST directly to the API and rotate IPs, then never engage further.

### Architecture

Double opt-in with scanner-safe confirmation:

1. POST `/api/newsletter/subscribe` → insert pending row, send confirmation email.
2. Email link → `/[locale]/newsletter/confirm?token=...` (page, GET, **read-only**).
3. User clicks button → form POST → `/api/newsletter/confirm` (atomic update + sends welcome + admin email).
4. Redirect → `/[locale]/newsletter/confirmed`.

The page-in-the-middle pattern matches the existing unsubscribe flow exactly. Email scanners (Defender / Outlook Safe Links / Proofpoint / Mimecast) that prefetch the link hit only the page, never the mutating API.

### What Was Fixed

- [x] **Migration** [docs/migrations/2026-05-21-newsletter-double-opt-in.sql](docs/migrations/2026-05-21-newsletter-double-opt-in.sql) adds `confirmed_at`, `confirmation_token`, `confirmation_sent_at`, `confirmation_send_count` to `newsletter_subscribers`. Existing rows are grandfathered (`confirmed_at = subscribed_at`). **Must be run against Supabase prod before the deploy is useful.**
- [x] **Subscribe route** [app/api/newsletter/subscribe/route.ts](app/api/newsletter/subscribe/route.ts) now inserts a pending row and sends a confirmation email only — no admin notification, no welcome email. Includes per-email resend throttle (15-minute cooldown, hard cap of 5 sends) using optimistic compare-and-swap on `confirmation_send_count` to close the email-bomb vector. Unsubscribed re-signups rotate `confirmation_token` so any previously emitted link is invalidated.
- [x] **Confirm page** [app/[locale]/newsletter/confirm/page.tsx](app/%5Blocale%5D/newsletter/confirm/page.tsx) shows a button that form-POSTs the token. Read-only GET — safe for email scanners. Strings under `newsletterConfirm` in all three locales.
- [x] **Confirm API** [app/api/newsletter/confirm/route.ts](app/api/newsletter/confirm/route.ts) is POST-only. Uses an atomic `UPDATE ... WHERE confirmation_token = ? AND confirmed_at IS NULL RETURNING ...` so concurrent requests can't double-fire the welcome/admin emails.
- [x] **New email template** [lib/email/templates/NewsletterConfirmEmail.tsx](lib/email/templates/NewsletterConfirmEmail.tsx).
- [x] **Confirmation landing page** [app/[locale]/newsletter/confirmed/page.tsx](app/%5Blocale%5D/newsletter/confirmed/page.tsx) with `?status=invalid` variant. Strings under `newsletterConfirmed`.
- [x] **Footer success copy** updated in all three locales to "check your inbox to confirm".
- [x] **Active-subscriber filter** in [app/api/admin/newsletter/route.ts](app/api/admin/newsletter/route.ts), [app/api/admin/newsletter/export/route.ts](app/api/admin/newsletter/export/route.ts), and [app/api/admin/stats/route.ts](app/api/admin/stats/route.ts) is now `confirmed_at IS NOT NULL AND unsubscribed_at IS NULL`. Previously confirmed-only, which leaked backfilled unsubscribed rows.
- [x] **Daily cleanup cron** [app/api/cron/newsletter-cleanup/route.ts](app/api/cron/newsletter-cleanup/route.ts) at `0 3 * * *` UTC ([vercel.json](vercel.json)) deletes pending rows older than 7 days. Authed via `CRON_SECRET` like the existing `leads-weekly` cron.
- [x] **Types + canonical schema** updated ([lib/supabase/types.ts](lib/supabase/types.ts), [docs/DATABASE_SCHEMA.sql](docs/DATABASE_SCHEMA.sql)).

### Threats Addressed

| Threat | Mitigation |
|---|---|
| Bot signups spam admin inbox | Admin email deferred until double opt-in confirmation |
| Email scanners auto-confirm bot signups | Confirm is POST-only behind a page button; GET is read-only |
| Email-bomb attack (rotate IPs, hammer victim with confirmation emails) | Per-email cooldown (15 min) + hard cap (5 sends) + token rotation on reactivation |
| Race condition double-fires admin email on rapid clicks | Atomic conditional UPDATE in confirm route |
| Backfilled unsubscribed rows leak into admin views | Active filter includes `unsubscribed_at IS NULL` |
| Pending bot rows accumulate forever | Daily cleanup cron deletes pending > 7 days |

### Deployment Checklist

1. Run the migration in the Supabase SQL editor.
2. Verify `SELECT count(*) FROM newsletter_subscribers WHERE confirmed_at IS NULL` returns 0 immediately after the migration.
3. Confirm `CRON_SECRET` is set in Vercel project env (already used by `leads-weekly`).
4. Deploy the branch. Test happy path with a real address (expect a single confirmation email, no admin email until the page button is clicked).
5. Vercel Cron auto-registers `newsletter-cleanup` on next deploy.

### Known Limitations / Out of Scope

- Per-IP rate limiting on the subscribe endpoint is still in-memory ([lib/api/rate-limit.ts](lib/api/rate-limit.ts)) — not durable across serverless instances. The per-email throttle (in the DB) closes the higher-impact email-bomb vector; durable IP limiting is a separate workstream.
- Other public forms (inquiries, licensing, exhibition reminders, wall-view) are not in scope for this change. Inquiries already has heuristic spam scoring; the others may need similar treatment in a follow-up.
- No metrics dashboard yet (pending count, confirmation rate, top domains, rate-limit blocks). Single SQL queries against the table are enough at current volume.

---

## Public Form Submissions Fix — RLS Policy Gap (April 11, 2026)

### Problem

The public contact form at `/contact` was returning "There was an error submitting your inquiry. Please try again." on production for every submission. `/api/inquiries` was responding `500 DB_ERROR`. Leads were being silently dropped.

The same root cause affected five other public write endpoints that were not yet reported as broken because they see less traffic, but which were almost certainly losing submissions too (licensing requests, wall-view lead capture, exhibition reminders, and the translation cache).

### Root Causes

1. **Missing RLS policy on `inquiries` table.** [docs/DATABASE_SCHEMA.sql:321](docs/DATABASE_SCHEMA.sql#L321) defines `"Public can submit inquiries" ... WITH CHECK (true)` but this file is a documented schema, not an auto-applied migration. The policy was never run against the production Supabase database, so anon inserts were rejected with Postgres error `42501 / new row violates row-level security policy`. The same gap likely affects `newsletter_subscribers` and `translation_cache` where similar documented policies were never applied.

2. **Unresolved Postgres behavior after the policy was recreated.** Even after dropping the old policies and creating an explicit `CREATE POLICY ... FOR INSERT TO anon WITH CHECK (true)`, the policy still did not match `anon`-role inserts, either through PostgREST or via direct `SET LOCAL ROLE anon` in the Supabase SQL editor. Diagnostics confirmed: RLS enabled but not forced, no triggers, no check constraints, no restrictive policies, `anon` role exists with standard flags, `current_user` correctly switches to `anon`, and direct `postgres`-role inserts succeed. By documented Postgres semantics the `TO anon` policy should have matched and the insert should have been allowed. It did not. **Root cause never identified** — deferred in favor of shipping a workaround.

### What Was Fixed

- [x] **Six public write routes switched from the anon-key `createClient()` to the service-role `createAdminClient()`.** The trust boundary moves fully to the route layer, which was already enforcing strict Zod validation, per-IP rate limiting, and honeypot checks on all of these endpoints. No new attack surface; RLS was supposed to be a second line of defense but was actually a primary point of failure.

  | File | Form / operation |
  |---|---|
  | [app/api/inquiries/route.ts](app/api/inquiries/route.ts) | Contact form (the originally reported bug) |
  | [app/api/licensing/request/route.ts](app/api/licensing/request/route.ts) | Licensing request form |
  | [app/api/generate-room/register/route.ts](app/api/generate-room/register/route.ts) | Wall-view email capture |
  | [app/api/generate-room/route.ts](app/api/generate-room/route.ts) | Wall-view AI room generation |
  | [app/api/exhibitions/reminders/route.ts](app/api/exhibitions/reminders/route.ts) | Exhibition reminder signup |
  | [app/api/translate/route.ts](app/api/translate/route.ts) | Translation cache upsert |

  Commit: `ec3a84b` — "Use service-role client for public form submissions to bypass RLS". Pushed to `main`, auto-deployed via Vercel. Production verified: contact form submits successfully and shows the "Thank you for your inquiry" success state.

### Not Broken (verified during audit)

- `app/api/newsletter/subscribe/route.ts` and `app/api/newsletter/unsubscribe/route.ts` were already on `createAdminClient()` from the April 9 newsletter work. Newsletter submissions were never affected.

### Diagnostic Path (for reference if a similar issue happens again)

1. **Reproduce locally before guessing.** `npm run dev` + `curl -X POST http://localhost:3000/api/inquiries ...` surfaced the real Supabase error (`42501 new row violates row-level security policy`) in the dev server terminal within seconds. Logs at [app/api/inquiries/route.ts:80](app/api/inquiries/route.ts#L80) were enough to pinpoint the layer, though they don't currently include the full Postgres error object — see follow-ups below.
2. **Isolate with direct PostgREST calls.** `curl` against `${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/inquiries` with the anon key reproduces the same 42501, proving the failure is at the Supabase layer, not Next.js.
3. **Inspect policy state with `pg_policy` / `pg_trigger` / `pg_constraint`.** Single-statement JSON queries against those catalog tables return the full picture. Note that Supabase's SQL editor only displays the last statement's result when multiple run together — run each inspection query separately.
4. **Test role impersonation in a helper function, not in plain SQL.** `SET LOCAL ROLE` + INSERT in the editor works, but `RAISE NOTICE` output is hidden in the editor UI. Use `CREATE OR REPLACE FUNCTION pg_temp.test(...) RETURNS TABLE(step text, value text)` so the diagnostic rows come back as a normal result set.

### Still Open / Follow-Ups

- [ ] **Root cause of the `TO anon WITH CHECK (true)` non-match is unexplained.** The workaround is shipping; the mystery is not. When time permits, consider opening a Supabase support ticket with the catalog dumps we already captured, or test the same policy shape on a fresh Supabase project to see if the behavior reproduces.
- [ ] **React error #185 console spam on `/contact`.** Separate issue, noticed during initial debugging of this bug. Form renders and now submits correctly, but the production console shows 50+ "Minified React error #185" (maximum update depth exceeded) entries. Root cause not identified — will need a dev-mode repro to see the non-minified stack. Purely cosmetic, not blocking.
- [ ] **Migration hygiene.** `docs/DATABASE_SCHEMA.sql` is currently spec, not an applied artifact — there is no tool ensuring the live database matches it, which is how this bug reached production. The `docs/migrations/` folder started during the April 9 newsletter work (`2026-04-09-newsletter-unsubscribe.sql`) is the right direction. Finish the transition: every schema change goes in `docs/migrations/` with an `YYYY-MM-DD-...sql` prefix, run in order against every environment, and `DATABASE_SCHEMA.sql` becomes a generated snapshot rather than a source of truth.
- [ ] **Improve API error logging.** [app/api/inquiries/route.ts:80](app/api/inquiries/route.ts#L80) logs `'Database error:', error` which works locally but is opaque in Vercel logs when you need to diagnose production fast. Consider structured logging: `console.error('Database error inserting inquiry:', { code: error.code, message: error.message, details: error.details, hint: error.hint })`. Applies to the other five routes in this fix as well.
- [ ] **Clean up test rows.** During diagnosis, several test rows were inserted into the production `inquiries` table (emails: `servicerole@example.com`, `pg-direct@example.com`, `diag-*@example.com`, etc.). These were removed at the end of the session via a `DELETE ... WHERE email IN (...)` statement. Verify they are gone, and avoid reproducing bugs against the production database in future — point local dev at a separate Supabase project or branch.

---

## Email Send Fix — `@react-email/render` Hoisting (April 11, 2026)

### Problem

Immediately after shipping the RLS workaround above, the contact form was submitting successfully and rows were landing in the `inquiries` table, but **no admin notification or user confirmation emails were arriving** at `ryan.jackson.2009@gmail.com`. The Resend dashboard showed zero send activity for the `kwamebrathwaite.com` domain even though the domain was verified at April 11 1:00 AM. Every other public write path worked, but every email send was silently failing.

### Root Cause

The local dev server log surfaced the real error the moment we looked for it:

```
Failed to send email: TypeError: render is not a function
  at Emails.create (resend/dist/index.mjs:665:37)
  at sendEmail (lib/email/send.ts:18:33)
```

The `resend` SDK (v6.9.2) uses `await import('@react-email/render')` internally to convert email templates to HTML before making the HTTP call. It declares `@react-email/render: *` as a **peer dependency** — meaning the application, not resend, is responsible for installing it at the top level of `node_modules` where Node's module resolution can find it from `resend`'s location.

`package.json` did not declare `@react-email/render` directly. It was only being pulled in transitively by `@react-email/components@1.0.7`, which bundles `@react-email/render@2.0.4` in a nested `node_modules/@react-email/components/node_modules/@react-email/render/` folder. Node's resolution walks up from `resend`'s location to the top-level `node_modules/` but never dives sideways into other packages' private nested folders, so the import at runtime returned an empty/malformed module, `render` destructured to `undefined`, and calling `undefined(element)` threw the `TypeError` before any HTTP request to Resend was made.

This explains every observed symptom:
- **Emails silently failed** — the fire-and-forget `sendEmail` wrapper in [lib/email/send.ts:36](lib/email/send.ts#L36) catches all exceptions and only logs a warning, so the API route always returned 201 even though the email never went out.
- **Zero Resend API activity** — the request never left the Node process, so there was nothing for Resend to log.
- **Domain verification was a red herring** — the domain was correctly set up and would have worked if the request had ever reached Resend's servers.

### What Was Fixed

- [x] **`@react-email/render@2.0.4` installed as a direct top-level dependency** via `npm install @react-email/render@2.0.4`. This forces npm to hoist it to `node_modules/@react-email/render/` where `resend`'s dynamic import can find it. Same version as the nested copy already in use, so no behavior change for existing consumers. `package-lock.json` deduplicated the nested copy automatically.
- [x] **Verified end-to-end** — a local `curl` to `/api/inquiries` after the fix produced both log lines in the dev server output:
  ```
  Email sent: abc91e36-71ab-4c35-afe0-3bd5448fbeb3 → ryan.jackson.2009@gmail.com
  Email sent: d6b86570-76d3-4931-847a-0726f434b9db → info@kwamebrathwaite.com, ryan.jackson.2009@gmail.com
  ```
  Both emails correspond to the `InquiryUserEmail` (user confirmation) and `InquiryAdminEmail` (admin notification) templates being rendered and successfully delivered to Resend's API.

Commit: `0952c03` — "Add @react-email/render as direct dep to fix email sends". Pushed to `main`, auto-deployed via Vercel.

### Why the RLS Fix Didn't Surface This Earlier

The previous fix in this same session switched six routes from the anon-key client to the service-role client. That unblocked the DB insert and the API route started returning 201. But the email send happens **after** the DB insert succeeds (fire-and-forget, non-blocking, per the comment at [app/api/inquiries/route.ts:86](app/api/inquiries/route.ts#L86)), and the email failure is swallowed inside `sendEmail`'s try/catch. So the success response masks the email failure, and the user could not see any difference between "DB insert failed" (which was the RLS symptom) and "DB insert succeeded, email failed" (which was this issue). Only the dev server terminal log showed the real error.

### Diagnostic Path (for reference)

The entire diagnosis took one grep against the dev server log file. The lesson: **when something silently fails after a fix, check the server log, not the user-facing response.** The framework pattern here should have been:

1. Ship the RLS fix.
2. Immediately test end-to-end, including the email side, before closing out.
3. If anything is silently failing, `grep -E "Email|Resend|error" server.log` is the first move.

Steps 2 and 3 were skipped in the original session — the contact form showed "Thank you" so we thought we were done. The second bug was only discovered when the user independently went looking for the admin notification email.

### Related Follow-Up (now more urgent)

The "Improve API error logging" item from the previous section is now more clearly justified. [lib/email/send.ts:36-38](lib/email/send.ts#L36-L38) currently does:

```ts
} catch (error) {
  console.error('Failed to send email:', error)
}
```

This is fine for local dev but in Vercel function logs it's easy to miss because it's a generic `console.error` with no structured metadata and no alerting. Consider one of:

- Wire email failures into Sentry (or whatever error reporter) instead of only `console.error`.
- Return a non-blocking header on the API response in dev mode, e.g. `X-Email-Send-Status: failed-render-error`, so a developer hitting the endpoint can see the email side-effect state without tailing logs.
- Change the success response to include `{ emailSent: true/false }` so the frontend could optionally surface "We saved your inquiry but couldn't send the confirmation email; we'll still get back to you" instead of a flat "Thank you".

None of these are blocking for shipping; they're all about not being blindsided the next time an email failure masquerades as success.

---

## Post-Launch Privacy & Security Hardening (April 9, 2026)

### Completed

- [x] **Newsletter unsubscribe flow** — the privacy policy already promised "you can unsubscribe at any time" but no mechanism existed, which was a CAN-SPAM and GDPR gap
  - New SQL migration `docs/migrations/2026-04-09-newsletter-unsubscribe.sql` adds `unsubscribe_token` (UUID, unique, auto-generated) and `unsubscribed_at` (soft-delete timestamp) to `newsletter_subscribers`. Safe to re-run.
  - `app/api/newsletter/subscribe/route.ts` now uses the admin client (previous anon-client existence check was silently a no-op under RLS), reactivates previously-unsubscribed rows on resubscribe, and threads the per-subscriber token into the welcome email
  - New `app/api/newsletter/unsubscribe/route.ts` POST handler — rate-limited 10/min/IP, accepts form-encoded or JSON body, soft-deletes via `unsubscribed_at`, redirects to localized confirmation
  - New confirm page `app/[locale]/newsletter/unsubscribe/page.tsx` (click-to-confirm prevents email scanners from auto-unsubscribing users) and confirmation page `app/[locale]/newsletter/unsubscribed/page.tsx`. Both marked `noindex`
  - `lib/email/templates/NewsletterWelcomeEmail.tsx` now accepts an `unsubscribeUrl` prop and renders the standard disclosure footer
  - Localized strings added under `newsletterUnsubscribe` in all three locale files

- [x] **Google Maps cookie consent control** — previously the Google Maps script ran on every public page via `GoogleMapsProvider` in the locale layout, with no way for a visitor to stop it setting cookies
  - `components/providers/GoogleMapsProvider.tsx` now reads a `kb-maps-consent` localStorage key and only calls `useLoadScript` when the value is not `"revoked"`. Default behaviour is granted, so the map loads on first visit for everyone and consumers are not forced through a click-to-load placeholder. Consent state is event-broadcast so every consumer stays in sync across tabs
  - New `CookieConsentBanner` (`components/features/privacy/CookieConsentBanner.tsx`) wired into the locale layout gives first-time visitors a subtle accept/decline control — a dismissable bar with localized copy under the `cookieBanner` namespace
  - New `MapsConsentControl` (`components/features/privacy/MapsConsentControl.tsx`) is embedded inside the rewritten privacy policy so a visitor can flip their preference later without hunting through browser settings
  - `ExhibitionsMapView.tsx` and `VenueCard.tsx` render a localized "blocked" state when consent has been revoked (strings under `exhibitions.map.blockedTitle` and `exhibitions.map.blockedBody`), pointing back at the privacy page's cookies section so the visitor can re-enable Maps
  - `app/admin/layout.tsx` passes `autoGrant` to the provider so address autocomplete and location preview keep working for signed-in operators without any consent prompt — the gate is only for public visitors

- [x] **Privacy policy rewritten and localized** — the previous page was hardcoded English with no cookies section, no GDPR/CCPA rights, no retention timelines, and no real contact method
  - `app/[locale]/privacy/page.tsx` is now a server component reading from `getTranslations('privacyPolicy')`
  - Thirteen sections: data controller, information we collect, use, legal basis, retention, third-party processors, cookies, GDPR rights, CCPA rights, children's privacy, international transfers, changes, contact
  - Retention timelines stated explicitly: inquiries 3 years from last contact, newsletter until unsubscribe, server logs ~30 days
  - Third-party processors disclosed: Vercel, Supabase, Resend, Google Maps (consent-gated), DeepL, OpenAI
  - Embeds `MapsConsentControl` client component so visitors can view and change their Google Maps consent from the privacy page
  - Translated to French and Japanese (first-pass manual translation — review recommended before final launch)
  - Uses `info@kwamebrathwaite.com` as the privacy contact. **Action item:** swap for the real privacy address once available

- [x] **security.txt published** per RFC 9116 at `public/.well-known/security.txt`
  - Contact: `info@kwamebrathwaite.com`, Expires: 2027-04-09, Preferred-Languages: en, Canonical URL set
  - **Action item:** update this file annually (or sooner if the contact email changes) — an expired `Expires` field invalidates the record

- [x] **Rate-limiting gap audit** of all public POST endpoints
  - Added 5/min per-IP rate limit to `app/api/exhibitions/reminders/route.ts` (previously unlimited)
  - Added 60/min per-IP rate limit to `app/api/translate/route.ts` (previously unlimited — protects the paid DeepL API)
  - Confirmed existing rate limits on inquiries (5/min), newsletter subscribe (3/min), licensing request (5/hour), generate-room (5/5min), generate-room register (5/min), not-found-log (30/min)

### Manual action items before these changes are fully live

1. Apply the migration in Supabase SQL editor: `docs/migrations/2026-04-09-newsletter-unsubscribe.sql` (backfill-safe, idempotent)
2. Swap `info@kwamebrathwaite.com` for the real privacy-contact email in `messages/{en,fr,ja}.json` under `privacyPolicy` and in `public/.well-known/security.txt` once it is provisioned
3. Send a test newsletter signup after deploy and verify the welcome email contains a working unsubscribe link
4. Open the exhibitions map in incognito and verify the cookie consent banner appears on first visit, that clicking "Decline" blocks the Maps script and shows the "blocked" state on the map page, and that the preference persists across reloads

### Explicitly deferred to a post-launch phase 2

These were scoped out of this session as non-critical but should still happen:

- [ ] Sentry / error monitoring / uptime pings
- [ ] Upstash or Redis-backed persistent rate limiter (in-memory is acceptable while traffic is low but resets on every cold start)
- [ ] Newsletter double opt-in
- [ ] www→apex redirect (coordinate with the in-flight redirect-handling strategy)
- [ ] Tighten CSP `'unsafe-inline'` for scripts once Google Maps' inline requirements can be audited
- [ ] Incident response runbook
- [ ] Accessibility audit
- [ ] Dependabot / `npm audit` automation
- [ ] Localize `app/[locale]/terms/page.tsx` the same way the privacy page was localized
- [ ] Native French/Japanese review of the privacy policy copy

---

## Forms, Email Notifications & Spam Protection (April 9, 2026)

### Completed
- [x] **Contact Us form wired up** — converted the static placeholder on `/contact` into a working client form (`components/features/contact/ContactForm.tsx`) that submits to `/api/inquiries`, sends a branded user confirmation and an admin notification via Resend
- [x] **Newsletter admin notifications** — admin now gets a branded email on every newsletter signup via new `NewsletterAdminEmail` template wired into `/api/newsletter/subscribe`
- [x] **Spam protection added to newsletter form** — added honeypot field to footer newsletter form, validation schema, and server-side check in the subscribe route
- [x] **Admin email default updated** — changed from `admin@kwamebrathwaite.com` to `info@kwamebrathwaite.com` in `lib/email/client.ts`
- [x] **Build fix** — added `slug` to the `MapExhibition` type, Supabase select query, and `VenueCard` construction to resolve Vercel build failure on commit `c65b94c`

### Forms & Email Status
All public forms now have full email flows (user confirmation + admin notification to `info@kwamebrathwaite.com`) and spam protection (rate limiting + honeypot + Zod validation):
- Contact Us (`/contact`) → `/api/inquiries`
- Artwork Inquiry (modal) → `/api/inquiries`
- Licensing Request (`/licensing`) → `/api/licensing/request`
- Exhibition Reminder (map popup) → `/api/exhibitions/reminders`
- Newsletter (footer) → `/api/newsletter/subscribe`

### Notes
- `RESEND_API_KEY` is configured in `.env.local`; domain will be verified on go-live
- All emails currently send from `noreply@kwamebrathwaite.com` (configurable via `EMAIL_FROM` env var)

---

## Pre-Launch Security Hardening (April 9, 2026)

### Completed
- [x] **Security audit performed** across auth, API routes, forms, data handling, and env. Full plan at `C:\Users\HCI\.claude\plans\dapper-petting-starfish.md`
- [x] **Security headers added** in `next.config.mjs` — CSP, X-Frame-Options, HSTS, Referrer-Policy, Permissions-Policy, X-Content-Type-Options. CSP allows Supabase, Google Maps, DeepL, OpenAI, Resend domains
- [x] **Middleware admin API auth gap closed** — `middleware.ts` now matches `/api/admin/:path*` and verifies session before the request reaches the route handler (defense-in-depth on top of existing `requireAuth()`). `/api/admin/auth/*` endpoints excluded
- [x] **XSS vulnerability fixed** on about/archive pages
  - Installed `isomorphic-dompurify`
  - Created `lib/utils/sanitize-html.ts` with a tag/attribute allow-list
  - Applied `sanitizeHtml()` to all `dangerouslySetInnerHTML` calls in `app/[locale]/about/page.tsx` and `app/[locale]/archive/page.tsx`
- [x] **Database error messages sanitized** across 20 API routes — clients now receive generic messages ("Failed to fetch data", "An unexpected error occurred"), full error details still logged server-side via `console.error`
- [x] **Export endpoints rate-limited & audit-logged**
  - `/api/admin/newsletter/export` and `/api/admin/exhibition-reminders/export` now capped at 5 exports/hour per authenticated user
  - Each export writes an entry to `activity_log` with user email and record count
- [x] **Verified `.env.local` was never committed** to git history (`git log --all --full-history -- .env.local` is empty)
- [x] **Production build verified** — `npm run build` passes with all security changes in place

### Still Required Before Launch
- [ ] **CRITICAL: Rotate all API keys** if they were ever shared outside the local machine (Supabase service role, OpenAI, Resend, DeepL, Google Maps). Move production secrets to Vercel environment variables, never commit to files
- [ ] **HIGH: Replace in-memory rate limiter with Upstash Redis** — current `lib/api/rate-limit.ts` uses a `Map` that resets on every serverless cold start. Rate limits are unreliable under load. Install `@upstash/ratelimit` + `@upstash/redis`
- [ ] **MEDIUM: Supabase RLS policy audit** — verify Row Level Security is enabled on all tables in the Supabase dashboard and export policies as SQL migrations to `supabase/migrations/` for version control
- [ ] **MEDIUM: Restrict `select('*')` in public API routes** to explicit field lists — prevents future schema additions from accidentally leaking fields
- [ ] **MEDIUM: CSRF Origin/Referer check** for state-changing admin endpoints (POST/PUT/DELETE). Supabase Auth's `SameSite=Lax` cookies provide baseline protection but header validation is better

### Files Modified
- `next.config.mjs` — added `headers()` config with security headers
- `middleware.ts` — extended matcher to cover `/api/admin/:path*` with session check
- `lib/utils/sanitize-html.ts` — new file
- `app/[locale]/about/page.tsx`, `app/[locale]/archive/page.tsx` — XSS sanitization
- 20 API routes under `app/api/**/route.ts` — error message sanitization
- `app/api/admin/newsletter/export/route.ts`, `app/api/admin/exhibition-reminders/export/route.ts` — rate limiting + audit logging
- `package.json` — added `isomorphic-dompurify` dependency

---

## Grid Layout Polish (April 7, 2026)

### Completed
- [x] **Exhibitions grid switched to square aspect ratio** — changed `aspect-[4/5]` to `aspect-square` in `ExhibitionCard.tsx` to match the live reference site and reduce image cropping
- [x] **Press grid switched to square aspect ratio** — changed `aspect-[4/3]` to `aspect-square` in `PressCard.tsx` to match exhibitions grid for visual consistency

---

## Frontend Typography & UI Polish (April 4, 2026)

### Completed
- [x] **Global typography updated to better match the original site**
  - Swapped the core sans/heading system to **Barlow**
  - Updated shared typography styles in the app shell and global CSS
- [x] **Header logo refined to match the original live-text wordmark**
  - Converted to uppercase Barlow styling with tighter sizing/tracking
  - Final desktop logo size set to feel more proportional to the nav
- [x] **Header/footer cleanup**
  - Moved the light/dark theme toggle from the header to the footer
  - Site now defaults to **Light mode** on first visit
  - Increased footer text/control contrast for easier readability on black
- [x] **Homepage card presentation tuned**
  - Reduced Featured Exhibitions card size to better match Featured Works
  - Improved dark-section caption contrast on the homepage
- [x] **Public listing/detail typography aligned**
  - Tightened and unified caption sizing across Exhibitions and Press listing cards
  - Updated exhibition detail page title to use the same site-wide title system instead of the older serif treatment
- [x] **Public CTA/layout polish**
  - Tightened artwork detail action button widths for desktop/mobile balance

---

## Production DB: `exhibitions.exhibition_url` (April 4, 2026)

### Completed
- [x] **`exhibition_url` applied on production Supabase** — fixes PostgREST **PGRST204** ("Could not find the 'exhibition_url' column") and failed admin exhibition saves
- [x] Migration file in repo: [`docs/migrations/2026-04-04-exhibition-url.sql`](docs/migrations/2026-04-04-exhibition-url.sql)
- [x] Admin API UX (already on main): PUT returns real Supabase/Postgres error messages; duplicate slug (**23505**) → **409** with clear copy; form banner can show `details` hint/code

---

## Hero Slide Vertical Repositioning (March 30, 2026)

### Completed
- [x] Added `image_position_y` field (0–100, default 50) to `hero_slides` table
  - Admin form shows a **Vertical Position** slider after an image is uploaded
  - Slider shows live preview in real time (Top / Upper / Center / Lower / Bottom labels)
  - Public `HeroRotator` applies `object-position: center {Y}%` per slide
  - Files modified: `lib/supabase/types.ts`, `lib/api/validation.ts`, `lib/hero.ts`, `components/admin/HeroSlideForm.tsx`, `components/HeroRotator.tsx`
  - **Requires Supabase migration:** `ALTER TABLE hero_slides ADD COLUMN IF NOT EXISTS image_position_y INTEGER NOT NULL DEFAULT 50 CHECK (image_position_y >= 0 AND image_position_y <= 100);`

---

## Exhibition URL + Auto-Generate Exhibition Description (March 30, 2026)

### Completed
- [x] Added `exhibition_url` field to exhibitions (URL for this specific show, separate from `venue_url`)
- [x] Added "✨ Generate from exhibition URL" button on the Description card in the admin form
  - Scrapes the exhibition page and generates 2–4 sentence description via GPT-4o-mini
  - Mirrors existing venue description generation pattern
- [x] `VenueCard` on public exhibition detail page now shows **"View Exhibition Page →"** (gold/primary) when `exhibition_url` is set; "Visit Venue Website →" demoted to secondary styling
  - Files modified: `lib/supabase/types.ts`, `lib/api/validation.ts`, `components/admin/ExhibitionForm.tsx`, `components/features/exhibitions/ExhibitionDetail.tsx`, `components/features/exhibitions/VenueCard.tsx`, `app/[locale]/exhibitions/[slug]/page.tsx`
  - Files created: `app/api/admin/exhibitions/generate-exhibition-description/route.ts`
  - **Database:** `exhibition_url` column — migration tracked in `docs/migrations/2026-04-04-exhibition-url.sql`; **applied on production April 2026** (see section above)

---

## Exhibition Detail Page 500 Fix (March 30, 2026)

### Completed
- [x] Fixed 500 Internal Server Error on all exhibition detail pages (e.g. `/exhibitions/black-photojournalism`)
  - **Root cause 1:** `getExhibitionBySlug()` used `createClient()` which calls `await cookies()` from `next/headers`. During Vercel's ISR static generation, `cookies()` is unavailable and throws — same bug previously fixed for press detail pages in commit `08c8fe3`.
    - Fix: switched to `createPublicClient()` (cookie-free anon-key client) in `app/[locale]/exhibitions/[slug]/page.tsx`
  - **Root cause 2:** An empty `generateStaticParams() { return [] }` was marking the page as `●` (SSG/ISR) on Vercel, causing static generation attempts where the locale layout's `getContentFontScale()` → `createClient()` → `cookies()` chain would fail unrecoverably.
    - Fix: removed the empty `generateStaticParams` entirely — page is now `ƒ` (Dynamic, server-rendered on demand), matching the working press detail page behavior. `revalidate = 3600` is preserved for CDN caching.
  - Files modified: `app/[locale]/exhibitions/[slug]/page.tsx`
  - Commits: `a48bdef` (createPublicClient fix), `3af1839` (remove generateStaticParams)
  - Confirmed working: `https://kwamebrathwaite.vercel.app/exhibitions/black-photojournalism` returns 200

---

## Works Page Image Loading & Lazy Scroll (March 2026)

### Completed
- [x] Fixed all artworks not loading on Works page — API fetch defaulted to 20 items, increased to 100
- [x] Added scroll-based lazy fade-in using IntersectionObserver (replaces broken CSS-only animation)
  - Each artwork fades in with translateY transition when entering viewport
  - Staggered delays per row for natural appearance
  - Follows same pattern as `TimelineItem.tsx`
  - Files modified:
    - `app/[locale]/works/page.tsx` — Added `limit=100` to API fetch
    - `components/features/artworks/ArtworkGrid.tsx` — Replaced `animate-hidden`/`animate-fade-up` with `ScrollFadeItem` using IntersectionObserver

---

## SEO & Accessibility Auto-Generate (March 2026)

### Completed
- [x] Added focused "Auto-generate" button in SEO & Accessibility card of artwork edit form
  - Generates only `seo_title`, `alt_text`, `meta_title`, `meta_description` — never overwrites descriptions
  - Uses existing hand-written description as context for higher quality SEO output
  - GPT-4o Vision with `detail: 'low'` (cheaper since description provides context)
  - DeepL translations to French and Japanese with caching
  - Files created:
    - `components/admin/SEOGenerateButton.tsx` — Compact button with loading/error states
    - `app/api/admin/artworks/[id]/generate-seo/route.ts` — POST endpoint (auth-protected)
  - Files modified:
    - `lib/ai/prompts.ts` — Added `SEO_SYSTEM_PROMPT` + `buildSEOUserPrompt()`
    - `lib/ai/types.ts` — Added `GeneratedSEOContent`, `TranslatedSEOContent`, `SEOGenerationResult`, `SEOGenerationOptions`
    - `lib/ai/description-generator.ts` — Added `generateArtworkSEO()` function
    - `lib/ai/translation-service.ts` — Added `translateSEOContent()` for meta_title/meta_description
    - `lib/ai/index.ts` — New exports
    - `components/admin/ArtworkForm.tsx` — Integrated button in SEO card header

---

## Press Detail Pages (March 2026)

### Completed
- [x] Added individual press article detail pages
  - `app/[locale]/press/[id]/page.tsx` — Route with server-side data fetching
  - `components/features/press/PressDetail.tsx` — Full article layout
  - PressCard now links to detail pages instead of opening external URLs
  - Added i18n keys for press detail page (en, fr, ja)

---

## Exhibition Data Seed (March 2026)

### Completed
- [x] Parsed `docs/events.md` (2026 Exhibit Schedule) into SQL insert statements
  - Created `docs/seed_exhibitions.sql` with all 18 exhibitions
  - 1 past, 8 current, 9 upcoming (based on today's date 2026-03-28)
  - Includes slug, title, venue, city, state/region, country, dates, exhibition_type, venue_url, display_order
  - Duplicate show titles (Disco, Sunday Best, Bold & Brilliant) get city-suffixed slugs for uniqueness
  - Clears `exhibition_artworks` and `exhibitions` tables before inserting (safe re-run)
  - Successfully run against production Supabase database

---

## Multi-lingual Content Translation Fix (March 2026)

### Completed
- [x] Fixed untranslated body content on Archive, About, and Press pages for French and Japanese locales
  - Page titles/nav already translated via next-intl; body content from Supabase CMS and press items remained in English
  - **Translation service extended** (`lib/ai/translation-service.ts`):
    - Added `translatePageContent()` export — locale-aware wrapper using DeepL API with HTML tag preservation
    - Generalized cache params to support any source table (was hardcoded to `artworks`)
    - Added `tag_handling: 'html'` support for DeepL to preserve HTML markup
  - **Archive page** (`app/[locale]/archive/page.tsx`):
    - Now accepts locale param and translates CMS content (mission + description) via DeepL before rendering
  - **About page** (`app/[locale]/about/page.tsx`):
    - Translates CMS content (biography + movement) via DeepL
    - Replaced hardcoded English timeline events with next-intl `t()` calls
  - **Press page** (`app/[locale]/press/page.tsx`):
    - Translates press item `title` and `excerpt` server-side (author/publication names left untranslated as proper nouns)
  - **Message files** (`messages/en.json`, `fr.json`, `ja.json`):
    - Added all 7 timeline events with translated title and description for each locale
  - All translations cached in `translation_cache` table; English locale has zero overhead
  - Cache uses MD5 hash of source content — editing English content auto-triggers re-translation

---

## Press Reorder Feature (March 2026)

### Completed
- [x] Added drag-and-drop reorder functionality for press items (mirrors artworks reorder)
  - Admin can reorder press items via Admin > Press > Reorder button
  - Drag-and-drop UI with auto-save using `@hello-pangea/dnd`
  - Filter tabs: "All" vs "Featured Only" for independent reordering
  - Featured star toggle to mark/unmark press items as featured
  - Public press page now sorts by: featured first → display_order → publish_date → created_at
  - Files created:
    - `app/api/admin/press/reorder/route.ts` — PUT endpoint for bulk reorder (updates `display_order`)
    - `components/admin/PressReorderList.tsx` — Drag-and-drop reorder component
    - `app/admin/press/reorder/page.tsx` — Reorder page with loading/error states
  - Files modified:
    - `app/admin/press/page.tsx` — Added "Reorder" button next to "Add Press"
    - `app/[locale]/press/page.tsx` — Updated sort order to respect `display_order`
  - Reuses existing `adminReorderSchema` validation and `display_order` DB column/index
- [x] Rich text editor HTML source view toggle
  - Added `</>` toolbar button to switch between WYSIWYG and raw HTML editing
  - Useful for fixing formatting issues or pasting pre-formatted HTML
  - File modified: `components/admin/RichTextEditor.tsx`
- [x] Modern thin scrollbar styling
  - Global 6px translucent scrollbar replacing browser default (~15px)
  - Rounded thumb, invisible track, dark mode support
  - File modified: `app/globals.css`

---

## Archive Page CMS Integration (March 2026)

### Completed
- [x] Connected Archive page to Supabase `site_content` table
  - Fetches `mission` and `description` sections via `getPageContent()`
  - Renders CMS HTML content with `dangerouslySetInnerHTML` (same pattern as About page)
  - Two-column layout: rich HTML content on left, sticky image on right
  - Image URL configurable via `page_settings` metadata (`image_url` field)
  - Defaults to existing portrait photo if no image URL is set
  - Admin can edit content via Admin > Content > Archive tab (already existed)
  - Admin can set archive image via Admin > Page Settings > Archive row (new)
  - Files modified:
    - `app/[locale]/archive/page.tsx` — Replaced skeleton loaders with CMS content, two-column layout with image
    - `app/admin/page-settings/page.tsx` — Added image URL input for archive page

---

## Content Font Size Adjuster (March 2026)

### Completed
- [x] Admin-controlled content font size adjuster in Page Settings
  - Global setting with three presets: Small (87.5%), Default (100%), Large (112.5%)
  - Segmented button control in admin Page Settings panel
  - Uses CSS custom property `--content-font-scale` on `<main>` element
  - Applies to all public pages across all languages (en, fr, ja)
  - Scoped to content text only — header, footer, admin panel unaffected
  - Artwork wall label metadata (13px) intentionally stays fixed
  - Stored in `page_settings` table via `_global` row metadata JSONB
  - No schema migration needed — uses existing `metadata` column
  - Files modified:
    - `lib/page-settings.ts` — Added `getContentFontScale()` helper
    - `app/admin/page-settings/page.tsx` — Added font size segmented control
    - `app/[locale]/layout.tsx` — Reads setting, sets CSS variable on `<main>`
    - `app/globals.css` — CSS rules using `--content-font-scale`
    - `docs/DATABASE_SCHEMA.sql` — Added `_global` seed row
  - DB setup: `INSERT INTO page_settings (page_slug, show_title, metadata) VALUES ('_global', true, '{"content_font_scale": "default"}')`

---

## AI Press Article Summarizer (March 2026)

### Completed
- [x] AI-powered URL summarization for press articles
  - Admin pastes article URL, clicks "Generate Summary" to auto-fill form fields
  - Fetches article HTML server-side, parses with `cheerio` for metadata + content
  - Extracts: title, author, publication name, publish date (from OG/meta tags)
  - Sends clean article text to GPT-4o for summary generation
  - Configurable word count: 50-600 words (default 100)
  - Auto-fills excerpt (always), plus title/author/publication/date (only if empty)
  - Cost: ~$0.01-0.03 per summarization
  - Files created:
    - `lib/ai/press-summarizer.ts` — URL fetching, cheerio parsing, GPT-4o summarization
    - `app/api/admin/press/summarize-url/route.ts` — Authenticated POST endpoint
  - Files modified:
    - `components/admin/PressForm.tsx` — Added Generate Summary button + word count input
    - `lib/ai/types.ts` — Added `PressSummaryResult` interface
    - `lib/ai/prompts.ts` — Added press summary system prompt
    - `lib/ai/index.ts` — Added exports
    - `lib/api/validation.ts` — Added `pressSummarizeUrlSchema`
  - New dependency: `cheerio` (HTML parser)
  - Design spec: `docs/superpowers/specs/2026-03-28-press-url-summarizer-design.md`

---

## Artwork Form Field Updates (March 2026)

### Completed
- [x] Split single Dimensions field into two: Dimensions (in) and Dimensions (cm)
  - DB column `dimensions_cm` already existed, now exposed in form
- [x] Removed Category dropdown from the artwork form
  - Category field kept in validation schema for backwards compatibility
- [x] Added Edition field (e.g., `#1/5 (Ed. 5 + 2AP)`)
  - DB column `edition` already existed, now exposed in form
- [x] Added Unique ID field (e.g., `AJASS_Loc_59_001`)
  - Maps to `archive_reference` DB column, already existed
- Files modified: `components/admin/ArtworkForm.tsx`, `lib/api/validation.ts`

---

## About Page Section Visibility Toggles (March 2026)

### Completed
- [x] Added admin toggles to show/hide Timeline and Movement sections on the About page
  - Uses existing `page_settings.metadata` JSONB column — no DB migration needed
  - Added `getSectionVisibility()` helper in `lib/page-settings.ts`
  - Extended PUT `/api/admin/page-settings` to accept `metadata` field
  - Added "Section Visibility" sub-row in `/admin/page-settings` for the About page
  - About page conditionally renders Timeline and Movement based on toggle state
  - Both default to hidden (off) since content isn't ready yet

---

## View on Wall Refinements (March 2026)

### Completed
- [x] Removed side background/padding on artwork in View on Wall modal
  - Replaced explicit `height` with `aspect-ratio` so container always matches image proportions
  - Changed `object-contain` to `object-cover` to eliminate letterboxing
  - File: `components/ui/ViewOnWallModal.tsx`
- [x] Fixed View on Wall aspect ratio using image's natural dimensions
  - Container shape was derived from physical print dimensions (e.g. "20 × 24 inches" ≈ square), causing landscape photos to appear nearly square
  - Now detects the image's intrinsic aspect ratio via `new Image()` on load
  - Physical dimensions still control wall-relative scale; image ratio controls shape
  - Changed image fit back to `object-contain` to prevent cropping
  - File: `components/ui/ViewOnWallModal.tsx`

---

## Museum Aesthetic Overhaul (March 2026)

### Completed
- [x] Created `docs/BRAND_BRIEF.md` — visual reference document for museum gallery aesthetic
- [x] Added Tailwind tokens: `page-title`, `section-title`, `gray-heading`, `gray-body`, `gray-meta`, `gray-cta`
- [x] Added CSS utility classes: `.page-title-museum`, `.section-title-museum`, `.cta-museum`
- [x] Added `page_settings` database table with per-page `show_title` toggle
- [x] Created `PageTitle` component with conditional visibility
- [x] Created API routes: `/api/admin/page-settings` (admin CRUD), `/api/page-settings/[slug]` (public read)
- [x] Created `lib/page-settings.ts` helper (`getShowTitle`, `getPageSettings`)
- [x] Updated all 8 public page H1s to use museum heading style + PageTitle component
- [x] Simplified Footer: lighter newsletter styling, minimal copyright line, muted links
- [x] Redesigned PressCard: removed gold accent, borders, excerpts, "Read article" CTA; added uppercase titles, mixed image/text-only layout
- [x] Changed Press page grid from 3-column to 4-column
- [x] Simplified ArtworkDetail: stacked metadata without labels, text-only CTAs, removed availability badge
- [x] Updated About page: section-title-museum for H2s, generous line-height, muted body text
- [x] Full heading consistency audit across all public pages (March 28, 2026)
  - [x] Homepage: "Featured Works" and "Featured Exhibitions" h2s → `section-title-museum`
  - [x] Archive page: "Mission" h2 → `section-title-museum`
  - [x] Exhibition detail: h1 → `page-title-museum`, "About Exhibition" h2 → `section-title-museum`
  - [x] Exhibition detail page: "Featured Works" h2 → `section-title-museum`
  - [x] Artwork detail page: "Related Works" h2 → `section-title-museum`
  - [x] Licensing page: "How It Works" and "License Types" h2s → `section-title-museum`
  - [x] LicenseRequestForm: h1 → `page-title-museum`, success h2 → `section-title-museum`
  - [x] Timeline: decade h3s → `section-title-museum`
- [x] Created Admin Page Settings UI with toggle switches
- [x] Added "Page Settings" to admin sidebar navigation
- [x] Updated `DESIGN_SYSTEM.md` with museum heading typography specs
- [x] Global typography updated to better match the original site: switched core sans/heading stack from Inter to Barlow in `app/layout.tsx`, `tailwind.config.ts`, and `app/globals.css`

---

## Phase 1: Foundation & Core Infrastructure

### Completed
- [x] Next.js 14 project initialization (App Router)
- [x] TypeScript configuration
- [x] Tailwind CSS with design tokens from DESIGN_SYSTEM.md
- [x] next-intl configuration for i18n (en, fr, ja)
- [x] Folder structure per TECHNICAL_SPEC_v2.md
- [x] Supabase client setup (client.ts, server.ts)
- [x] TypeScript types for database tables
- [x] Base app layout with fonts
- [x] Locale-aware layout wrapper
- [x] Global CSS with component classes
- [x] Environment variables template
- [x] Header component (sticky, text logo, desktop nav, mobile hamburger)
- [x] Footer component (3-column layout, newsletter form, Instagram icon)
- [x] Mobile navigation (slide-in drawer from right)
- [x] LanguageSwitcher component (locale-preserving dropdown)

---

## Phase 2: Public Pages & Components

### Completed
- [x] Homepage with ArtworkGrid and ExhibitionCards
- [x] Works page with gallery grid, filters, and lightbox
- [x] Exhibitions page with tab filtering
- [x] Press page with press cards
- [x] About page structure (placeholder content)
- [x] About page CMS integration
  - [x] Biography section fetches from `/api/content/about/biography`
  - [x] Movement section fetches from `/api/content/about/movement`
  - [x] Server-side rendering with 60-second revalidation
- [x] Archive page structure (placeholder content)
- [x] Contact page with form
- [x] Privacy policy page
- [x] Terms of use page

### UI Components Completed
- [x] ImagePlaceholder component (`components/ui/ImagePlaceholder.tsx`)
- [x] Lightbox component (`components/ui/Lightbox.tsx`) - Full accessibility
- [x] ViewOnWallModal component (`components/ui/ViewOnWallModal.tsx`) - Artwork visualization
- [x] ArtworkCard component (`components/features/artworks/ArtworkCard.tsx`)
- [x] ArtworkGrid component (`components/features/artworks/ArtworkGrid.tsx`)
- [x] ExhibitionCard component (`components/features/exhibitions/ExhibitionCard.tsx`)
- [x] PressCard component (`components/features/press/PressCard.tsx`)

### Completed (Detail Pages)
- [x] Artwork detail page (`app/[locale]/works/[id]/page.tsx`)
  - [x] ArtworkDetail component with lightbox integration
  - [x] Schema.org VisualArtwork structured data
  - [x] SEO metadata (generateMetadata)
  - [x] Related artworks section
  - [x] ISR with 1-hour revalidation

### Completed (Detail Pages)
- [x] Exhibition detail page (`app/[locale]/exhibitions/[id]/page.tsx`)
  - [x] ExhibitionDetail component with lightbox integration
  - [x] Schema.org ExhibitionEvent structured data
  - [x] SEO metadata (generateMetadata)
  - [x] Featured artworks section
  - [x] ISR with 1-hour revalidation
  - [x] Translation keys for en, fr, ja

### Completed (Search)
- [x] Search functionality
  - [x] useDebounce hook (`lib/hooks/useDebounce.ts`)
  - [x] SearchBar component (`components/ui/SearchBar.tsx`)
  - [x] Search translations for en, fr, ja
  - [x] Filter pill CSS classes in globals.css
  - [x] Works page search + API integration with URL state
  - [x] Loading, empty, and error states

### Completed (Timeline)
- [x] Timeline component (`components/features/timeline/`)
  - [x] Timeline.tsx - Main container with filtering, decade grouping, animations
  - [x] TimelineItem.tsx - Individual event card with year badge, descriptions, images
  - [x] index.ts - Barrel exports
  - [x] Translation keys for en, fr, ja
  - [x] About page integration with sample career timeline data

### Completed (Newsletter)
- [x] Newsletter form submission handler
  - [x] Fixed Footer.tsx error handling (was incorrectly showing success on errors)
  - [x] Added error, alreadySubscribed, rateLimited translation keys (en, fr, ja)
  - [x] Proper handling of API responses including already-subscribed case
  - [x] Error/rate limit messages display in UI

### Completed (View on Wall Feature)
- [x] View on Wall visualization feature
  - [x] ViewOnWallModal component (`components/ui/ViewOnWallModal.tsx`)
    - Portal-based modal with focus trap and keyboard navigation
    - Room scene with CSS gradient backgrounds (white, gray, dark)
    - Artwork scaled to real-world proportions
    - Reference chair silhouette for scale comparison
    - Responsive design for mobile/tablet/desktop
  - [x] Dimension parsing utilities (`lib/utils/parseDimensions.ts`)
    - Parses "20 × 24 inches" and "50.8 × 61 cm" formats
    - Converts cm to inches for scale calculations
  - [x] Scale calculation utilities (`lib/utils/calculateArtworkScale.ts`)
    - Calculates pixel dimensions based on 8-foot wall height
    - Chair scale and artwork positioning helpers
  - [x] ArtworkDetail integration - "View on a Wall" button
  - [x] Translation keys for en, fr, ja
  - [x] CSS for artwork frame shadow effect

---

## Phase 3: API Routes

### Completed
- [x] Shared API utilities (`lib/api/`)
  - [x] `response.ts` - Standard response helpers (successResponse, errorResponse)
  - [x] `pagination.ts` - Pagination utilities
  - [x] `validation.ts` - Zod schemas for all endpoints
  - [x] `rate-limit.ts` - In-memory rate limiter
  - [x] `index.ts` - Re-exports
- [x] GET /api/artworks - List with pagination, filters (category, series, availability, year, q)
- [x] GET /api/artworks/:id - Single artwork detail
- [x] GET /api/artworks/featured - Featured artworks only
- [x] GET /api/exhibitions - List with type filter (past, current, upcoming)
- [x] GET /api/exhibitions/:id - Single exhibition with linked artworks
- [x] GET /api/exhibitions/current - Current and upcoming exhibitions
- [x] GET /api/press - List with type and featured filters
- [x] GET /api/press/:id - Single press item
- [x] GET /api/content/:page - All sections for a page
- [x] GET /api/content/:page/:section - Specific section content
- [x] POST /api/inquiries - Contact form (honeypot, rate limiting, Zod validation)
- [x] POST /api/newsletter/subscribe - Newsletter signup (rate limiting, duplicate handling)
- [x] POST /api/translate - Translation service with DeepL integration and caching

---

## Phase 4: Admin Panel

### Completed
- [x] Admin layout structure
- [x] Admin dashboard page (placeholder)
- [x] Admin authentication (Supabase Auth)
  - [x] Auth helpers (`lib/supabase/auth.ts`)
  - [x] Login API route (`app/api/admin/auth/login/route.ts`)
  - [x] Logout API route (`app/api/admin/auth/logout/route.ts`)
  - [x] Session API route (`app/api/admin/auth/session/route.ts`)
  - [x] Login page (`app/admin/login/page.tsx`)
- [x] Auth middleware protection (`middleware.ts` updated)
- [x] Admin shared components (`components/admin/`)
  - [x] AuthGuard - Route protection with redirect
  - [x] AdminSidebar - Navigation with icons
  - [x] AdminHeader - User info and logout
  - [x] DataTable - Sortable/filterable table with pagination
  - [x] StatusBadge - Color-coded badges
  - [x] ConfirmDialog - Delete confirmation modal
  - [x] FormField - Label + Input/Textarea/Select/Checkbox
  - [x] PageHeader - Title with breadcrumbs
  - [x] ImageUploader - Drag-drop to Supabase Storage
  - [x] RichTextEditor - TipTap wrapper
  - [x] ArtworkPicker - Searchable artwork multi-select
  - [x] ArtworkForm - Complete artwork form
- [x] Admin API utilities (`lib/api/admin.ts`)
- [x] Artworks CRUD pages
  - [x] API routes (`app/api/admin/artworks/`)
  - [x] List page (`app/admin/artworks/page.tsx`)
  - [x] Create page (`app/admin/artworks/new/page.tsx`)
  - [x] Edit page (`app/admin/artworks/[id]/edit/page.tsx`)

### Completed (Phase 4b)
- [x] Exhibitions CRUD pages
  - [x] API routes (`app/api/admin/exhibitions/`)
  - [x] List page (`app/admin/exhibitions/page.tsx`)
  - [x] Admin exhibitions list now prefers `thumbnail_image_url` over `image_url` for listing thumbnails
  - [x] Create page (`app/admin/exhibitions/new/page.tsx`)
  - [x] Edit page (`app/admin/exhibitions/[id]/edit/page.tsx`)
  - [x] ExhibitionForm component (`components/admin/ExhibitionForm.tsx`)
  - [x] Artwork linking API (`app/api/admin/exhibitions/[id]/artworks/route.ts`)
  - [x] Validation schemas in `lib/api/validation.ts`
  - [x] StatusBadge updated for exhibition types

### Completed (Phase 4c)
- [x] Press CRUD pages
  - [x] API routes (`app/api/admin/press/route.ts`, `app/api/admin/press/[id]/route.ts`)
  - [x] List page (`app/admin/press/page.tsx`)
  - [x] Create page (`app/admin/press/new/page.tsx`)
  - [x] Edit page (`app/admin/press/[id]/edit/page.tsx`)
  - [x] PressForm component (`components/admin/PressForm.tsx`)
  - [x] Validation schemas (`adminPressSchema`, `adminPressFiltersSchema`)

### Completed (Phase 4d)
- [x] Inquiries management
  - [x] API routes (`app/api/admin/inquiries/route.ts`, `app/api/admin/inquiries/[id]/route.ts`)
  - [x] List page with filtering (`app/admin/inquiries/page.tsx`)
  - [x] Detail/edit page (`app/admin/inquiries/[id]/page.tsx`)
  - [x] Validation schemas (`adminInquiryFiltersSchema`, `adminInquiryUpdateSchema`)
  - [x] StatusBadge updated for inquiry types (general, purchase, exhibition, press)
  - [x] DataTable ActionButtons updated with View icon support
  - [x] Features: status filtering, type filtering, search, admin notes, "Mark as Responded"

### Completed (Phase 4e)
- [x] Newsletter subscribers management
  - [x] API routes (`app/api/admin/newsletter/`)
  - [x] List page with filtering (`app/admin/newsletter/page.tsx`)
  - [x] CSV export functionality (`app/api/admin/newsletter/export/route.ts`)
  - [x] Delete subscriber with confirmation
  - [x] Validation schemas (`adminNewsletterFiltersSchema`)
  - [x] StatusBadge updated for locale badges (en, fr, ja)

### Completed (Phase 4f)
- [x] Site content editor
  - [x] Admin content page with tabbed interface (`app/admin/content/page.tsx`)
  - [x] Support for text, html, and json content types
  - [x] ContentSectionCard component enhanced for multiple content types
  - [x] JSON validation and formatting
  - [x] Uses existing API routes (`/api/admin/content`)

### Completed (Phase 4g)
- [x] Media library
  - [x] API routes (`app/api/admin/media/route.ts`)
    - [x] GET - List files from all storage buckets with search and pagination
    - [x] DELETE - Remove files from storage with activity logging
  - [x] Admin media page (`app/admin/media/page.tsx`)
    - [x] Bucket tabs (All, Artworks, Thumbnails, Exhibitions, Press)
    - [x] File grid with image previews
    - [x] Search by filename
    - [x] Copy URL to clipboard
    - [x] Delete with confirmation
    - [x] Upload modal with bucket selection and drag-drop
    - [x] Pagination
  - [x] Updated EntityType to include 'media' for activity logging

### Completed (Phase 4h)
- [x] Activity log view
  - [x] Validation schema (`lib/api/validation.ts` - `adminActivityFiltersSchema`)
  - [x] API routes (`app/api/admin/activity/`)
    - [x] GET - List activity logs with filters and pagination
    - [x] GET /users - Get unique user emails for filter dropdown
  - [x] Admin activity page (`app/admin/activity/page.tsx`)
    - [x] Filter by action type, entity type, user
    - [x] Search by entity title
    - [x] Activity cards with expandable changes
    - [x] Links to related entities
    - [x] Pagination
  - [x] StatusBadge updated for action types (create, update, delete, status_change, reorder)

---

## Phase 5: Polish & Optimization

### Completed
- [x] SEO meta tags
  - [x] Created `app/robots.ts` for robots.txt generation
  - [x] Created `app/sitemap.ts` for dynamic multi-locale sitemap
  - [x] Created `app/[locale]/works/layout.tsx` with metadata
  - [x] Created `app/[locale]/exhibitions/layout.tsx` with metadata
  - [x] Enhanced homepage metadata with OpenGraph, canonical, alternates
  - [x] Enhanced press, about, contact, archive pages with full metadata
  - [x] Added meta translation keys (metaTitle, metaDescription) to all locales
- [x] Schema.org structured data
  - [x] Created `components/seo/JsonLd.tsx` with reusable components
  - [x] Added Organization and WebSite schema to root layout
  - [x] Person and Breadcrumb schemas available for use
- [x] Sitemap generation
  - [x] Dynamic sitemap with all locales (en, fr, ja)
  - [x] Static pages and dynamic content (artworks, exhibitions)
  - [x] Proper hreflang alternates
- [x] Image optimization
  - [x] Installed Sharp for production optimization
  - [x] Configured AVIF and WebP formats in next.config.mjs
  - [x] Optimized device sizes and image sizes
- [x] Accessibility (WCAG AA)
  - [x] Added skip-to-main-content link with translations
  - [x] Added skip-link CSS styles
  - [x] Added `id="main-content"` to main element
- [x] Performance optimization
  - [x] Added preconnect hints for Google Fonts

### Completed (Navigation Styling Update)
- [x] Navigation typography update (11px, uppercase, 0.08em spacing)
- [x] Language switcher globe icon (lucide-react)
- [x] Language switcher dropdown styling (locale code + full name)
- [x] Mobile navigation typography (14px, uppercase, 44px touch targets)
- [x] Build verification passed

### Remaining (Manual Testing)
- [ ] Performance audit (Lighthouse 90+) - run manually
- [ ] Cross-browser testing (manual spot-check)

---

## Phase 6: Hero Slides Feature

### Completed (Hero Slides)
- [x] @hello-pangea/dnd package installed for drag-drop
- [x] TypeScript types for hero_slides table (`lib/supabase/types.ts`)
- [x] Validation schemas for hero API (`lib/api/validation.ts`)
- [x] Data fetching functions (`lib/hero.ts`)
- [x] Public API route `/api/hero`
- [x] Admin CRUD API routes `/api/admin/hero/*`
- [x] HeroRotator component (`components/HeroRotator.tsx`)
- [x] HeroSlideForm component (`components/admin/HeroSlideForm.tsx`)
- [x] HeroSlideList component with drag-drop (`components/admin/HeroSlideList.tsx`)
- [x] Admin hero pages (list, new, edit)
- [x] Admin sidebar updated with Hero Slides navigation
- [x] ImageUploader extended to support 'hero' bucket
- [x] Custom CSS for opacity slider (`app/globals.css`)
- [x] Homepage integration with HeroRotator
- [x] Hero rotator auto-rotation fix
  - [x] Added `hasInteracted` state to prevent pause on initial page load
  - [x] Auto-rotation now starts immediately regardless of mouse position
  - [x] Hover-to-pause still works after first user interaction

### Requires Manual Setup in Supabase
- [ ] Create `hero` storage bucket (public, with RLS policies)
- [ ] Run `hero_slides` table SQL (see `docs/HERO_SLIDES_FEATURE.md`)

---

## Phase 7: Artwork Detail Page Enhancement

### Completed (Agent 1 Work)
- [x] Updated Supabase types (`lib/supabase/types.ts`)
  - [x] Added `edition`, `archive_reference`, `dimensions_cm` fields to artworks
  - [x] Added `artwork_literature` table type for citations
- [x] Created adjacent artworks API (`app/api/artworks/[id]/adjacent/route.ts`)
  - [x] Returns previous/next artworks with filter context
- [x] Enhanced artwork detail page (`app/[locale]/works/[id]/page.tsx`)
  - [x] Now uses real Supabase data instead of sample data
  - [x] Fetches literature citations
  - [x] Fetches related artworks
  - [x] Full SEO metadata with OpenGraph and Twitter cards
  - [x] Schema.org VisualArtwork structured data
- [x] Created ShareButton component (`components/features/artworks/ShareButton.tsx`)
  - [x] Copy link to clipboard with toast feedback
  - [x] Email share via mailto:
  - [x] Social sharing (X/Twitter, Facebook)
  - [x] Dropdown menu with accessibility
- [x] Created ArtworkInquiryModal component (`components/features/artworks/ArtworkInquiryModal.tsx`)
  - [x] Artwork preview in header
  - [x] Form: name, email, phone, inquiry type, message
  - [x] react-hook-form + Zod validation
  - [x] Honeypot spam protection
  - [x] Success/error states
  - [x] Submits to existing /api/inquiries endpoint
- [x] Enhanced ArtworkDetail component (`components/features/artworks/ArtworkDetail.tsx`)
  - [x] 60/40 desktop layout per TYPOGRAPHY_SYSTEM.md
  - [x] Typography per TYPOGRAPHY_SYSTEM.md (11px labels, 14px values, 18px title)
  - [x] New metadata fields: edition, archive_reference, dimensions_cm
  - [x] Literature citations section
  - [x] ShareButton integration
  - [x] ArtworkInquiryModal integration (replaces link to contact page)
  - [x] Full-bleed artwork image on mobile (edge-to-edge, matching live site)
  - [x] "View on Wall" button placeholder (disabled, for Agent 2)
- [x] Updated gallery page (`app/[locale]/works/page.tsx`)
  - [x] Clicking artwork navigates to detail page (was opening lightbox)
  - [x] Removed lightbox code
- [x] Updated translation files
  - [x] Added new keys: edition, archiveReference, literature, viewOnWall, shareLink, shareLinkCopied, viewFullPage, inquiry.title/submit/success/error (en, fr, ja)
- [x] Updated component exports (`components/features/artworks/index.ts`)

### Requires Manual Setup in Supabase
- [ ] Run SQL to add new columns: `ALTER TABLE artworks ADD COLUMN edition VARCHAR(100), archive_reference VARCHAR(100), dimensions_cm VARCHAR(100)`
- [ ] Run SQL to create `artwork_literature` table (see `docs/ARTWORK_DETAIL_PAGE_BRIEF.md`)

### Integration Points
- [ ] Agent 2: View on Wall feature - button placeholder added, waiting for ViewOnWallModal implementation

---

## Phase 8: Featured Artworks Enhancement

### Completed
- [x] Home page dynamic featured artworks
  - [x] Removed hardcoded sample artworks array
  - [x] Created `lib/artworks.ts` with `getFeaturedArtworks()` helper
  - [x] Server-side fetching with `Promise.all()` for parallel data loading
  - [x] Conditional rendering (hides section if no featured artworks)
  - [x] Respects `display_order` field for sorting
- [x] Works page featured prioritization
  - [x] Updated `/api/artworks` to sort by `is_featured` first (descending)
  - [x] Featured artworks appear at top of Works page
  - [x] Secondary sort by `display_order`, then `created_at`
- [x] Admin artwork reordering
  - [x] Created `ArtworkReorderList` component (`components/admin/ArtworkReorderList.tsx`)
    - [x] Drag-and-drop reordering with `@hello-pangea/dnd`
    - [x] Filter tabs: "All" / "Featured Only"
    - [x] Inline featured toggle (star icon)
    - [x] Auto-save on reorder with loading indicator
    - [x] Error handling with automatic revert
  - [x] Created reorder page (`app/admin/artworks/reorder/page.tsx`)
  - [x] Added "Reorder" button to artworks list page header
  - [x] Exported component from `components/admin/index.ts`

### How Featured Artworks Work
1. **Featured star in admin** - Marks artworks to appear on home page AND at top of Works page
2. **Home page** - Shows up to 8 featured artworks from database (respects display order)
3. **Works page** - Shows all published artworks with featured ones appearing first
4. **Reorder page** - Drag-and-drop to set display order, filter to featured-only for easier management

---

## Phase 9: Dark Mode (Public Site)

### Completed
- [x] **Infrastructure**
  - [x] Installed `next-themes` package
  - [x] Updated `tailwind.config.ts` with `darkMode: 'class'`
  - [x] Updated `app/globals.css` with comprehensive dark mode:
    - CSS variables for dark palette (`#121212` bg, `#F0F0F0` text, `#C9A870` gold, etc.)
    - Dark variants on all ~15 component classes (btn-primary, btn-secondary, btn-text, btn-gold, btn-gold-outline, filter-pill, filter-pill-active, input, input-error, input-success, label, helper-text, card, card-bordered, card-elevated, card-featured, section-divider, exhibition-label)
    - Dark skeleton shimmer, grain overlay adjustment
  - [x] Created `components/ui/ThemeProvider.tsx` (wraps next-themes)
  - [x] Created `components/ui/ThemeToggle.tsx` (sun/moon icon, hydration-safe)
  - [x] Updated `app/layout.tsx` with ThemeProvider and `suppressHydrationWarning`
  - [x] Updated `components/ui/index.ts` with new exports
  - [x] Added theme translation keys to en.json, fr.json, ja.json

- [x] **Layout Components**
  - [x] `components/layout/Header.tsx` — ThemeToggle in desktop + mobile utility zones, dark classes on header/logo/nav/hamburger
  - [x] `components/layout/MobileMenu.tsx` — dark panel bg, borders, close button, nav links
  - [x] `components/layout/LanguageSwitcher.tsx` — dark button, dropdown, items

- [x] **High-Impact Pages & Components**
  - [x] `app/[locale]/page.tsx` — dark contrast on charcoal exhibition section
  - [x] `components/features/artworks/ArtworkCard.tsx` — dark ring for photo framing, image bg, title
  - [x] `components/features/artworks/ArtworkGrid.tsx` — dark skeleton placeholders
  - [x] `components/features/artworks/ArtworkDetail.tsx` — back link, image bg, buttons, title, all metadata labels/values, literature, archive reference
  - [x] `components/features/artworks/ArtworkInquiryModal.tsx` — modal bg, header, borders, artwork preview, title, close button
  - [x] `components/features/artworks/ShareButton.tsx` — button border/text, dropdown bg/border, menu items
  - [x] `components/features/exhibitions/ExhibitionCard.tsx` — status badges, image bg, title
  - [x] `components/features/exhibitions/ExhibitionDetail.tsx` — back link, status badges, title, metadata, prose

- [x] **Remaining Pages & UI Components**
  - [x] `components/ui/SearchBar.tsx` — dark bg, focus, text, placeholder
  - [x] `components/ui/ImagePlaceholder.tsx` — dark bg
  - [x] `components/features/press/PressCard.tsx` — image bg, gold accent, title, link text
  - [x] `components/features/timeline/Timeline.tsx` — timeline lines, dots, filter buttons, decade headers
  - [x] `components/features/timeline/TimelineItem.tsx` — dot borders, card bg, title, image bg
  - [x] `components/features/exhibitions/ExhibitionsListPanel.tsx` — panel bg, borders, text, skeletons
  - [x] `components/features/exhibitions/ExhibitionsMobileSheet.tsx` — sheet bg, drag handle, borders, text
  - [x] `components/features/exhibitions/ViewToggle.tsx` — inactive state dark colors
  - [x] `components/features/exhibitions/GeographicFilters.tsx` — inactive filter dark colors
  - [x] `components/features/exhibitions/ReminderModal.tsx` — modal bg, form inputs, error states
  - [x] `components/features/exhibitions/AddToCalendarButton.tsx` — button border/hover
  - [x] `components/features/exhibitions/ShareButton.tsx` — button border/hover
  - [x] `components/features/licensing/LicenseRequestForm.tsx` — step indicators, artwork selection, license cards
  - [x] `app/[locale]/about/page.tsx` — prose, timeline border, movement section
  - [x] `app/[locale]/press/page.tsx` — heading text
  - [x] `app/[locale]/archive/page.tsx` — skeleton dark bg
  - [x] `app/[locale]/privacy/page.tsx` — prose dark:prose-invert
  - [x] `app/[locale]/terms/page.tsx` — prose dark:prose-invert
  - [x] `app/[locale]/licensing/page.tsx` — step circles, license card borders
  - [x] `app/[locale]/works/page.tsx` — skeleton loading, clear filters
  - [x] `app/[locale]/exhibitions/[slug]/page.tsx` — featured works border

- [x] **Build verification passed** — `npm run build` successful

### Files Intentionally NOT Modified
| File | Reason |
|------|--------|
| `components/layout/Footer.tsx` | Already `bg-black text-white` by design |
| `components/HeroRotator.tsx` | Full-bleed images with dark overlays |
| `components/ui/Lightbox.tsx` | Already `bg-black/95` |
| `components/ui/ViewOnWallModal.tsx` | Already `bg-black/90` |
| `components/features/exhibitions/MarkerInfoPopup.tsx` | Google Maps controls styling |
| All `app/admin/**` files | Admin stays light-only |

### Dark Mode Color Palette
| Token | Value | Usage |
|-------|-------|-------|
| Background primary | `#121212` | Body bg |
| Background elevated | `#1A1A1A` | Modals, panels, cards |
| Background surface | `#2A2A2A` | Inputs, placeholders, image containers |
| Text primary | `#F0F0F0` | Headings, body text |
| Text secondary | `#A0A0A0` | Captions, labels |
| Border primary | `#333333` | Card borders, dividers |
| Gold adaptive | `#C9A870` | Accents, featured badges |

### WCAG Contrast Compliance
- `#F0F0F0` on `#121212` = 17.3:1 (AAA)
- `#A0A0A0` on `#121212` = 7.7:1 (AA)
- `#C9A870` on `#121212` = ~4.5:1 (AA)

---

## Feature Wishlist

Ideas for future enhancements (not yet planned for implementation):

### Admin Panel
- [ ] **Light/Dark Mode Toggle** - Add theme switching for admin panel
  - Complexity: Moderate-High (~7-11 hours)
  - Requires: Theme context already in place, ~40 admin file updates
  - Notes: TipTap editor needs separate dark mode CSS

### Public Site
- *(Add ideas here)*

### Performance & Infrastructure
- *(Add ideas here)*

---

## Blockers / Questions

*None currently*

---

## Environment Setup Required

Before running the project, create `.env.local` with:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

See `.env.example` for full list.

---

## Database Setup Required

Run the SQL in `/docs/DATABASE_SCHEMA.sql` in your Supabase project's SQL editor.

---

## Notes for Next Session

1. ~~Build UI components (ArtworkCard, etc.)~~ ✓ COMPLETED
2. ~~Implement API routes for data fetching~~ ✓ COMPLETED (Phase 3)
3. ~~Create artwork detail page (`works/[id]`)~~ ✓ COMPLETED
4. ~~Create exhibition detail page (`exhibitions/[id]`)~~ ✓ COMPLETED
5. ~~Wire up public pages to use API routes (replace sample data)~~ ✓ PARTIALLY COMPLETE (Homepage artworks done, exhibitions still sample)
6. ~~Set up admin authentication~~ ✓ COMPLETED (Phase 4a)
7. ~~Implement Artworks CRUD pages~~ ✓ COMPLETED (Phase 4a)
8. ~~Implement remaining Phase 4 items~~ ✓ PHASE 4 COMPLETE!
9. ~~Phase 5: Polish & Optimization~~ ✓ PHASE 5 COMPLETE!
   - SEO meta tags, sitemap, robots.txt
   - Schema.org structured data
   - Image optimization (Sharp, AVIF/WebP)
   - Accessibility improvements (skip links)
   - Performance optimizations (preconnect hints)
10. Run Lighthouse audit and cross-browser testing (manual)

---

## Project File Structure

```
components/
├── ui/
│   ├── ImagePlaceholder.tsx
│   ├── Lightbox.tsx
│   ├── SearchBar.tsx
│   ├── ThemeProvider.tsx
│   ├── ThemeToggle.tsx
│   └── index.ts
├── features/
│   ├── artworks/
│   │   ├── ArtworkCard.tsx
│   │   ├── ArtworkDetail.tsx
│   │   ├── ArtworkGrid.tsx
│   │   ├── ArtworkInquiryModal.tsx
│   │   ├── ShareButton.tsx
│   │   └── index.ts
│   ├── exhibitions/
│   │   ├── ExhibitionCard.tsx
│   │   ├── ExhibitionDetail.tsx
│   │   └── index.ts
│   ├── press/
│   │   ├── PressCard.tsx
│   │   └── index.ts
│   └── timeline/
│       ├── Timeline.tsx
│       ├── TimelineItem.tsx
│       └── index.ts
├── layout/
│   ├── Header.tsx
│   ├── Footer.tsx
│   ├── MobileMenu.tsx
│   └── LanguageSwitcher.tsx
├── seo/
│   ├── JsonLd.tsx
│   └── index.ts
└── admin/
    ├── index.ts
    ├── AuthGuard.tsx
    ├── AdminSidebar.tsx
    ├── AdminHeader.tsx
    ├── DataTable.tsx
    ├── StatusBadge.tsx
    ├── ConfirmDialog.tsx
    ├── ContentSectionCard.tsx
    ├── FormField.tsx
    ├── PageHeader.tsx
    ├── ImageUploader.tsx
    ├── RichTextEditor.tsx
    ├── ArtworkPicker.tsx
    ├── ArtworkForm.tsx
    ├── ArtworkReorderList.tsx
    └── ExhibitionForm.tsx

lib/
├── ai/
│   ├── index.ts
│   ├── description-generator.ts
│   ├── press-summarizer.ts
│   ├── prompts.ts
│   ├── translation-service.ts
│   └── types.ts
├── api/
│   ├── index.ts
│   ├── response.ts
│   ├── pagination.ts
│   ├── validation.ts
│   ├── rate-limit.ts
│   └── admin.ts
├── hooks/
│   ├── useDebounce.ts
│   └── index.ts
├── artworks.ts
├── hero.ts
└── supabase/
    ├── client.ts
    ├── server.ts
    ├── types.ts
    └── auth.ts

app/api/
├── artworks/
│   ├── route.ts
│   ├── featured/route.ts
│   └── [id]/
│       ├── route.ts
│       └── adjacent/route.ts
├── exhibitions/
│   ├── route.ts
│   ├── current/route.ts
│   └── [id]/route.ts
├── press/
│   ├── route.ts
│   └── [id]/route.ts
├── content/
│   └── [page]/
│       ├── route.ts
│       └── [section]/route.ts
├── inquiries/route.ts
├── newsletter/subscribe/route.ts
├── translate/route.ts
├── health/route.ts
└── admin/
    ├── auth/
    │   ├── login/route.ts
    │   ├── logout/route.ts
    │   └── session/route.ts
    ├── artworks/
    │   ├── route.ts
    │   ├── [id]/route.ts
    │   └── reorder/route.ts
    ├── exhibitions/
    │   ├── route.ts
    │   └── [id]/
    │       ├── route.ts
    │       └── artworks/route.ts
    ├── activity/
    │   ├── route.ts
    │   └── users/route.ts
    ├── inquiries/
    │   ├── route.ts
    │   └── [id]/route.ts
    ├── media/
    │   └── route.ts
    ├── newsletter/
    │   ├── route.ts
    │   ├── export/route.ts
    │   └── [id]/route.ts
    └── press/
        ├── route.ts
        ├── [id]/route.ts
        └── summarize-url/route.ts

app/admin/
├── layout.tsx
├── page.tsx
├── login/page.tsx
├── activity/
│   └── page.tsx
├── artworks/
│   ├── page.tsx
│   ├── new/page.tsx
│   ├── reorder/page.tsx
│   └── [id]/edit/page.tsx
├── content/
│   └── page.tsx
├── exhibitions/
│   ├── page.tsx
│   ├── new/page.tsx
│   └── [id]/edit/page.tsx
├── inquiries/
│   ├── page.tsx
│   └── [id]/page.tsx
├── media/
│   └── page.tsx
├── newsletter/
│   └── page.tsx
└── press/
    ├── page.tsx
    ├── new/page.tsx
    └── [id]/edit/page.tsx
```
