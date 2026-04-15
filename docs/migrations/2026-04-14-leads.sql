-- Migration: AI-Powered Lead Generator
-- Purpose: Store prospective partnership/press/exhibition/collector/brand/academic
--          leads discovered by the weekly AI sweep, the sources to sweep, the
--          per-run cost + status log, and the configurable search-query templates.
-- Date: 2026-04-14
-- Spec: .claude/docs/2026-04-14-lead-generator-design.md

-- ---------------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE lead_category AS ENUM (
    'exhibition',
    'press',
    'collector',
    'brand_partnership',
    'academic',
    'mention'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE lead_status AS ENUM (
    'new',
    'qualified',
    'contacted',
    'responded',
    'converted',
    'dismissed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE lead_region AS ENUM (
    'us',
    'europe',
    'japan',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE lead_source_kind AS ENUM (
    'rss',
    'website',
    'social',
    'alerts_inbox'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE lead_source_type AS ENUM (
    'exa',
    'perplexity',
    'firecrawl',
    'rss',
    'google_alerts',
    'manual'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE lead_run_status AS ENUM (
    'running',
    'completed',
    'cap_reached',
    'failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE lead_run_trigger AS ENUM (
    'cron',
    'manual'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- leads: one row per discovered opportunity
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  status lead_status NOT NULL DEFAULT 'new',
  category lead_category NOT NULL,
  region lead_region NOT NULL DEFAULT 'other',
  language VARCHAR(5) NOT NULL DEFAULT 'en',

  title TEXT NOT NULL,
  summary_en TEXT,
  summary_ja TEXT,
  deep_brief_md TEXT,

  source_url TEXT NOT NULL,
  source_type lead_source_type NOT NULL,
  source_url_hash TEXT GENERATED ALWAYS AS (md5(source_url)) STORED,

  -- Relevance score 0-100, set by Claude during qualification.
  score INT CHECK (score BETWEEN 0 AND 100),

  organization TEXT,
  contact_name TEXT,
  contact_role TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  contact_social JSONB DEFAULT '{}'::jsonb,

  -- Raw payload from the discovering source (Exa result, RSS item, etc.) for debugging.
  raw JSONB DEFAULT '{}'::jsonb,

  -- Which run produced this lead (nullable for manually added leads).
  run_id UUID,

  notes TEXT,
  dismissed_reason TEXT
);

-- Dedup helper: hash of source_url is the uniqueness key.
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_source_url_hash ON leads(source_url_hash);
CREATE INDEX IF NOT EXISTS idx_leads_status_category_created
  ON leads(status, category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_region ON leads(region);
CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(score DESC);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access on leads" ON leads;
CREATE POLICY "Admin full access on leads" ON leads
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- lead_sources: curated sites, RSS feeds, social accounts, and the alerts inbox
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS lead_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  kind lead_source_kind NOT NULL,
  -- For rss/website: the URL. For social: @handle or profile URL.
  -- For alerts_inbox: the email address used to receive Google Alerts forwards.
  url_or_handle TEXT NOT NULL,
  label TEXT,

  category_hint lead_category,
  region lead_region NOT NULL DEFAULT 'other',
  language VARCHAR(5) DEFAULT 'en',

  active BOOLEAN NOT NULL DEFAULT TRUE,
  last_fetched_at TIMESTAMP WITH TIME ZONE,
  last_error TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_sources_kind_handle
  ON lead_sources(kind, url_or_handle);
CREATE INDEX IF NOT EXISTS idx_lead_sources_active ON lead_sources(active);

ALTER TABLE lead_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access on lead_sources" ON lead_sources;
CREATE POLICY "Admin full access on lead_sources" ON lead_sources
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- lead_runs: one row per sweep execution (cron or manual)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS lead_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  finished_at TIMESTAMP WITH TIME ZONE,

  status lead_run_status NOT NULL DEFAULT 'running',
  triggered_by lead_run_trigger NOT NULL DEFAULT 'cron',

  budget_cap_usd NUMERIC(8, 4) NOT NULL DEFAULT 5.0000,
  cost_usd NUMERIC(8, 4) NOT NULL DEFAULT 0,

  leads_found INT NOT NULL DEFAULT 0,
  leads_new INT NOT NULL DEFAULT 0,

  -- Per-provider cost breakdown: { exa: 0.12, perplexity: 1.80, hunter: 0.05, anthropic: 0.40 }
  cost_breakdown JSONB DEFAULT '{}'::jsonb,

  error_log JSONB DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_lead_runs_started ON lead_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_runs_status ON lead_runs(status);

ALTER TABLE lead_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access on lead_runs" ON lead_runs;
CREATE POLICY "Admin full access on lead_runs" ON lead_runs
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Backfill FK from leads.run_id now that lead_runs exists.
DO $$ BEGIN
  ALTER TABLE leads
    ADD CONSTRAINT leads_run_id_fkey
    FOREIGN KEY (run_id) REFERENCES lead_runs(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- lead_query_templates: category x region x language search query presets
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS lead_query_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  category lead_category NOT NULL,
  region lead_region NOT NULL,
  language VARCHAR(5) NOT NULL DEFAULT 'en',

  query_text TEXT NOT NULL,
  label TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_lead_query_templates_lookup
  ON lead_query_templates(category, region, language, active);

ALTER TABLE lead_query_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access on lead_query_templates" ON lead_query_templates;
CREATE POLICY "Admin full access on lead_query_templates" ON lead_query_templates
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- lead_settings: single-row key/value config (budget cap default, digest email, etc.)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS lead_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE lead_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access on lead_settings" ON lead_settings;
CREATE POLICY "Admin full access on lead_settings" ON lead_settings
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Seed defaults. Safe to re-run.
INSERT INTO lead_settings (key, value) VALUES
  ('budget_cap_usd', '5'::jsonb),
  ('digest_recipient', '""'::jsonb),
  ('top_n_per_category', '5'::jsonb),
  ('deep_research_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- updated_at trigger for leads
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_leads_updated_at ON leads;
CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
