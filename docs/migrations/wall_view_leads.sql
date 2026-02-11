-- Migration: Create wall_view_leads table
-- Purpose: Store email leads from the View on a Wall AI room generation feature
-- Run this in the Supabase SQL editor

CREATE TABLE IF NOT EXISTS wall_view_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  source text DEFAULT 'view_on_wall',
  artwork_id uuid REFERENCES artworks(id) ON DELETE SET NULL,
  generations_count integer DEFAULT 0,
  last_generated_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wall_view_leads_email ON wall_view_leads(email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_wall_view_leads_email_unique ON wall_view_leads(LOWER(email));

-- Row Level Security
ALTER TABLE wall_view_leads ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (public visitors registering their email)
CREATE POLICY "Anyone can insert wall view leads"
  ON wall_view_leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Anyone can update their own lead (for incrementing generations_count)
CREATE POLICY "Anyone can update wall view leads"
  ON wall_view_leads FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Admins can read all leads
CREATE POLICY "Admins can read all wall view leads"
  ON wall_view_leads FOR SELECT
  TO authenticated
  USING (true);
