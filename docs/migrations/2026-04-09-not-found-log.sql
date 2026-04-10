-- Migration: Not-found (404) logging for broken-link monitoring
-- Purpose: Capture all 404 hits so the admin can see real inbound broken links
--          from legacy URLs (press articles, Google, social, etc.) after the
--          Vercel cutover, then write targeted 301 redirects based on real data.
-- Date: 2026-04-09

-- Raw 404 hit log. One row per page view of the 404 page.
CREATE TABLE IF NOT EXISTS not_found_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  path TEXT NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  locale VARCHAR(5),
  country VARCHAR(2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_not_found_log_path ON not_found_log(path);
CREATE INDEX IF NOT EXISTS idx_not_found_log_created ON not_found_log(created_at DESC);

ALTER TABLE not_found_log ENABLE ROW LEVEL SECURITY;

-- Public can insert (the /api/not-found-log endpoint uses the service role key
-- and bypasses RLS, but this policy documents the intent and covers the case
-- where the anon key is ever used directly).
DROP POLICY IF EXISTS "Public can insert 404s" ON not_found_log;
CREATE POLICY "Public can insert 404s" ON not_found_log
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admin can read 404s" ON not_found_log;
CREATE POLICY "Admin can read 404s" ON not_found_log
  FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admin can delete 404s" ON not_found_log;
CREATE POLICY "Admin can delete 404s" ON not_found_log
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- Dismissed paths: paths the admin has marked as "don't show again" (typically
-- bot scanner noise like /wp-admin, /.env). The aggregate view excludes these.
CREATE TABLE IF NOT EXISTS not_found_dismissed (
  path TEXT PRIMARY KEY,
  dismissed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  dismissed_by TEXT
);

ALTER TABLE not_found_dismissed ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can manage dismissed paths" ON not_found_dismissed;
CREATE POLICY "Admin can manage dismissed paths" ON not_found_dismissed
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Aggregate function: grouped path stats for the admin dashboard.
-- Excludes dismissed paths. Called via supabase.rpc('broken_links_aggregate', ...).
CREATE OR REPLACE FUNCTION broken_links_aggregate(days_back INT DEFAULT 30)
RETURNS TABLE (
  path TEXT,
  hit_count BIGINT,
  last_seen TIMESTAMP WITH TIME ZONE,
  first_seen TIMESTAMP WITH TIME ZONE,
  referrer_count BIGINT,
  top_referrer TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH windowed AS (
    SELECT *
    FROM not_found_log
    WHERE created_at >= NOW() - (days_back || ' days')::INTERVAL
      AND path NOT IN (SELECT path FROM not_found_dismissed)
  ),
  top_ref AS (
    SELECT DISTINCT ON (path)
      path,
      referrer
    FROM windowed
    WHERE referrer IS NOT NULL AND referrer <> ''
    ORDER BY path, created_at DESC
  )
  SELECT
    w.path,
    COUNT(*)::BIGINT AS hit_count,
    MAX(w.created_at) AS last_seen,
    MIN(w.created_at) AS first_seen,
    COUNT(DISTINCT w.referrer) FILTER (WHERE w.referrer IS NOT NULL AND w.referrer <> '')::BIGINT AS referrer_count,
    (SELECT referrer FROM top_ref WHERE top_ref.path = w.path) AS top_referrer
  FROM windowed w
  GROUP BY w.path
  ORDER BY hit_count DESC
  LIMIT 200;
$$;

-- Restrict execution to authenticated users only.
REVOKE ALL ON FUNCTION broken_links_aggregate(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION broken_links_aggregate(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION broken_links_aggregate(INT) TO service_role;

-- Prune function: delete log rows older than N days. Called manually from the
-- admin UI's "Clear old records" button, or optionally via a scheduled job.
CREATE OR REPLACE FUNCTION prune_not_found_log(days_to_keep INT DEFAULT 90)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count BIGINT;
BEGIN
  DELETE FROM not_found_log
  WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION prune_not_found_log(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION prune_not_found_log(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION prune_not_found_log(INT) TO service_role;

-- Optional: schedule automatic pruning via pg_cron (Supabase Pro+).
-- Uncomment if pg_cron is enabled in your project:
--
-- SELECT cron.schedule(
--   'prune-not-found-log-daily',
--   '0 3 * * *',  -- every day at 03:00 UTC
--   $$SELECT prune_not_found_log(90);$$
-- );
