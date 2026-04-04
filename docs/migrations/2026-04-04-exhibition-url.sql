-- Migration: Exhibition URL on public venue sites
-- Date: 2026-04-04
-- Description: Add exhibition_url for links to the venue's page for this specific show.
-- Fixes PostgREST PGRST204 when the admin API updates exhibitions without this column.
--
-- Run in Supabase Dashboard → SQL Editor (production and any preview/staging projects).

ALTER TABLE exhibitions ADD COLUMN IF NOT EXISTS exhibition_url TEXT;
