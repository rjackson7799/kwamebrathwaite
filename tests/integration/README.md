# Integration tests (RLS / authz / access gate)

These tests run against a **real Supabase project** to prove the
security-critical guarantees that can't be unit-tested:

**Founders Circle** (`founders-rls`, `founder-invite-links`)

- members can't read staff-only columns (`internal_notes`, `relationship_owner_email`) — column-level lockdown
- members can't read another member's row — row-level RLS
- only `active` founders can read portal data (`founder_print_fulfillments`) — `is_current_founder()` gate
- the column guard blocks a member changing their own `status`
- the edition-range CHECK rejects out-of-range edition numbers

**Smart Import** (`content-import-rpc`) — everything that lives inside
`publish_import_item()`, which the route calls through the **service-role**
client and therefore *without RLS*:

- a spoofed `p_actor` is rejected by `is_admin()` inside the function
- the RPC is not executable by `anon` or by an authenticated non-admin
- the field allowlist is re-enforced at the DB boundary
- the conditional-UPDATE claim makes publish idempotent under a double submission
- a failed write leaves the item **persistently** `failed` (nested `EXCEPTION`
  block / implicit savepoint) rather than rolling back to `pending`
- a live target can't be updated without `reviewed_at`; `slug`/`status` are
  never written on update, even if the apply mask names them
- `STALE_TARGET` is a normal return, not an exception
- deleting a target nulls the FK, **preserves** `published_snapshot`, and the
  DELETE succeeds — the CHECK references the snapshot, not the FK
- `parsed_data` is immutable even to service-role

There is also a hand-run SQL probe covering table-level RLS and the function
grants: [`docs/migrations/tests/content-import-rls.test.sql`](../../docs/migrations/tests/content-import-rls.test.sql).

## ⚠️ Use a DEDICATED test project — never production

The tests **create and delete auth users** and insert/delete founder rows.
Pointing them at production would create junk users and could delete data.
They read from `SUPABASE_TEST_*` env names (distinct from the app's prod
`NEXT_PUBLIC_SUPABASE_*` / `SUPABASE_SERVICE_ROLE_KEY`) specifically so they
can't accidentally hit prod.

## Setup

1. Create a separate Supabase project (or a branch DB) for testing.
2. Apply the migrations to it (the same `docs/migrations/*.sql` you run in the
   SQL editor), including `2026-05-31-founders-fundraiser-rework.sql` and —
   for the Smart Import suite — `2026-08-14-content-import.sql`.
3. Provide the three env vars (locally in a shell or `.env` you don't commit):

   ```bash
   export SUPABASE_TEST_URL="https://<test-project>.supabase.co"
   export SUPABASE_TEST_ANON_KEY="<test anon key>"
   export SUPABASE_TEST_SERVICE_ROLE_KEY="<test service role key>"
   ```

4. Run them:

   ```bash
   npm run test:integration
   ```

Without these vars set, the suite **self-skips** (so `npm run test` and a bare
CI checkout stay green).

## CI

`.github/workflows/ci.yml` runs `test:integration` with the same vars sourced
from GitHub repository **secrets** of the same names. Add them under
**Settings → Secrets and variables → Actions** to activate the integration job;
until then the step runs and skips (green).
