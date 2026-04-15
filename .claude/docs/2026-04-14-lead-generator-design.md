# AI-Powered Lead Generator — Admin Feature

## Context

The Kwame Brathwaite archive needs a proactive way to surface new partnership, press, exhibition, collector, brand-licensing, and academic opportunities across the US, Europe, and Japan — instead of waiting for inbound inquiries. Today, awareness comes only from a single Google Alert on "Kwame Brathwaite." This feature adds an automated weekly sweep that uses paid search/research APIs + curated source lists to discover relevant articles, people, and organizations, qualify them with an LLM, and email a scannable digest of opportunities to the admin with one-click access to draft an intro message.

Goals: build the brand, create monetization paths, and reduce the manual research burden — at a predictable ~$20–50/month operating cost.

## Approach

**Build the orchestration, buy the commodities.** A custom Next.js + Supabase admin module (`/admin/leads`) calls best-in-class APIs (Exa, Perplexity Sonar Deep Research, Firecrawl, Hunter.io) for search, deep research, scraping fallback, and contact enrichment. All scoring, deduplication, storage, UI, email, and intro-message drafting happen in our codebase using existing patterns (Supabase, Resend, React Email, Vercel Cron, Claude via Anthropic SDK).

### Discovery strategy (Hybrid: cheap volume + targeted depth)

1. **Volume sweep (Exa + curated RSS + Firecrawl):** Run category-specific search queries in three parallel regional sweeps — US (EN), Europe (EN + FR), Japan (JA). Pull recent Google Alerts forwarded to a dedicated inbox. Pull RSS from curated source list. Scrape sites without RSS via Firecrawl.
2. **Deep research pass (Perplexity Sonar Deep Research or Claude w/ web tool):** Top N candidates per category get a deeper brief, contact enrichment, and a relevance score.
3. **Dedup + store:** URL/title hash dedup against `leads` table.
4. **Digest email:** Top 15–25 ranked leads grouped by category sent to admin via Resend.

### Lead categories (6)

`exhibition` · `press` · `collector` · `brand_partnership` · `academic` · `mention`

### Lifecycle

`new` → `qualified` → `contacted` → `responded` → `converted` / `dismissed`

### Cron schedule + budget cap

- **Weekly Sunday 22:00 UTC** via Vercel Cron (captures weekend activity).
- **Per-run hard cap: $5 USD default**, configurable in the Sources admin page. If hit mid-run, the job stops gracefully, emails partial results with a "⚠ budget cap reached" banner.
- **Manual "Run now"** button on `/admin/leads` for off-cycle runs (same cap applies).

### Intro-message drafting

- Always drafted in **English**. UI toggle "Translate to Japanese" calls Claude to produce a JA version with appropriate keigo and formal salutations.
- Tone presets: `formal_museum`, `warm_collector`, `casual_press`, `academic`, `brand_outreach`.
- Editable in a textarea before copy-to-clipboard or send-via-Resend with admin signature.

### Out of scope for v1 (deferred)

- "Convert to Press / Inquiry / Exhibition" record promotion (revisit in v1.1 once usage patterns are known).
- Daily lightweight sweeps (weekly only for v1).
- Direct social-platform API monitoring (use Brand24 or similar later if needed); v1 logs social account URLs as curated sources only.

---

## Architecture

### New database tables

```sql
leads (
  id, created_at, status, category, region, language,
  title, summary_en, summary_ja, source_url, source_type,
  score, contact_name, contact_role, contact_email, contact_phone,
  contact_social_jsonb, organization, deep_brief_md, raw_jsonb,
  notes, dismissed_reason
)

lead_sources (
  id, kind ('rss'|'website'|'social'|'alerts_inbox'),
  url_or_handle, category_hint, region, active, last_fetched_at
)

lead_runs (
  id, started_at, finished_at, status, cost_usd, leads_found,
  budget_cap_usd, error_log_jsonb, triggered_by ('cron'|'manual')
)

lead_query_templates (
  id, category, region, language, query_text, active
)
```

Indexes: `leads(status, category, created_at desc)`, `leads(source_url)` unique-ish for dedup.

### Critical files to create

**App routes / UI**
- `app/admin/leads/page.tsx` — index: filterable table by category/status/region, "Run now" button, latest run summary, link to sources.
- `app/admin/leads/[id]/page.tsx` — detail: brief, source links, contact card, intro-message generator, status controls, notes.
- `app/admin/leads/sources/page.tsx` — CRUD for `lead_sources`, query template overrides, budget cap config, alerts inbox display.
- `app/admin/leads/runs/page.tsx` — run history with cost, lead count, errors.

**API routes**
- `app/api/admin/leads/run/route.ts` — POST: trigger a run (manual or cron-authorized).
- `app/api/admin/leads/[id]/route.ts` — GET/PATCH lead (status, notes).
- `app/api/admin/leads/[id]/draft-message/route.ts` — POST: generate intro draft (params: tone, lang).
- `app/api/admin/leads/[id]/send-message/route.ts` — POST: send via Resend.
- `app/api/admin/leads/sources/route.ts` + `[id]/route.ts` — CRUD sources/templates.
- `app/api/cron/leads-weekly/route.ts` — Vercel Cron entry point (auth via `CRON_SECRET`).
- `app/api/inbound/google-alerts/route.ts` — Resend/Postmark/SendGrid inbound webhook to ingest forwarded Google Alert emails.

**Lib (orchestration core)**
- `lib/leads/run.ts` — main `runLeadGeneration({ budgetUsd, triggeredBy })` orchestrator with cost accounting + graceful cap-stop.
- `lib/leads/sources/exa.ts` — Exa search wrapper.
- `lib/leads/sources/perplexity.ts` — Perplexity Sonar Deep Research wrapper.
- `lib/leads/sources/firecrawl.ts` — Firecrawl scrape wrapper for non-RSS sites.
- `lib/leads/sources/rss.ts` — RSS parser for curated feeds.
- `lib/leads/sources/alerts-inbox.ts` — Google Alerts email parser.
- `lib/leads/enrich/hunter.ts` — Hunter.io contact enrichment.
- `lib/leads/qualify.ts` — Claude-powered scoring + brief generation per candidate.
- `lib/leads/dedup.ts` — URL/title-hash dedup against `leads`.
- `lib/leads/digest.ts` — Build + send weekly digest email via Resend.
- `lib/leads/draft-message.ts` — Claude-powered intro-message + JA translation.
- `lib/leads/budget.ts` — Per-run cost tracker with `assertUnderCap()` calls before each paid API hit.
- `lib/leads/queries.ts` — Default category × region × language query templates (seedable, overridable).

**Email templates (React Email)**
- `emails/LeadDigest.tsx` — weekly digest grouped by category with deep-link buttons.

**Config / cron**
- `vercel.json` (or `vercel.ts`) — add cron entry: `{ path: '/api/cron/leads-weekly', schedule: '0 22 * * 0' }`.
- `.env.local` additions: `EXA_API_KEY`, `PERPLEXITY_API_KEY`, `FIRECRAWL_API_KEY`, `HUNTER_API_KEY`, `ANTHROPIC_API_KEY`, `LEADS_INBOUND_SECRET`, `CRON_SECRET`, `LEADS_DIGEST_TO_EMAIL`.

### Reuse from existing codebase

- Supabase client patterns from `lib/supabase/*`.
- Resend send pattern + service-role auth from existing API routes (recent commits show this is already standardized).
- Admin layout/auth wrapper used by `app/admin/inquiries`, `app/admin/press`.
- React Email component conventions from existing `emails/*`.
- next-intl strings for any user-facing text in admin (EN + JA).

---

## Build sequence

1. **Schema + Supabase migration** for the four tables + RLS policies (admin-only).
2. **Source manager UI + CRUD APIs** (allows seeding sources + queries before running anything).
3. **Single-source vertical slice:** Exa search → Claude qualify → write to `leads` → render in index page. Prove the loop end-to-end with one category before fanning out.
4. **Add remaining sources:** RSS, Firecrawl, Perplexity Deep Research, alerts inbox, Hunter enrichment. Each behind a feature flag in `lib/leads/run.ts`.
5. **Budget cap + cost accounting** wired through every paid call.
6. **Lead detail page + intro-message drafting** (EN + JA toggle, Resend send).
7. **Digest email + Vercel Cron** wiring with `CRON_SECRET`.
8. **Run history page**, manual "Run now" button.
9. **Seed default query templates** for each category × region × language (12+ defaults).

---

## Verification

- **Schema:** Run migration in Supabase SQL editor; confirm tables + RLS via Supabase dashboard.
- **Vertical slice:** Trigger one manual run scoped to a single source (e.g., Exa, `press` category, US region only). Confirm rows appear in `leads` with score, summary, source URL.
- **Budget cap:** Set cap to $0.10 and run; confirm job halts, `lead_runs.status = 'cap_reached'`, partial digest sends with banner.
- **JA flow:** Verify a Japan-region run produces `summary_en` translated from JA source, and that "Translate to Japanese" toggle on intro message renders proper keigo.
- **Cron:** Hit `/api/cron/leads-weekly` locally with the `CRON_SECRET` header; confirm full path executes and digest arrives at `LEADS_DIGEST_TO_EMAIL`.
- **Inbound alerts:** Forward a real Google Alert email to the configured inbound address; confirm parsed leads land in `leads` with `source_type = 'google_alerts'`.
- **Dedup:** Run twice in a row; confirm second run reports 0 new leads for unchanged sources.
- **Intro message + send:** Generate, edit, send a draft to a test address; confirm Resend delivery and admin signature.
- **Cost sanity:** After one full real run, confirm `lead_runs.cost_usd` is < $5 and roughly matches the sum of Exa + Perplexity + Hunter + Anthropic invoice line items for that window.
