-- ============================================
-- Migration: Licensing Portal tables
-- Date: 2026-07-06
-- Fixes: /api/licensing/types and /api/licensing/request returning 500
--        (PGRST205 "Could not find the table 'public.license_types'")
-- Safe to re-run: uses IF NOT EXISTS / DROP POLICY IF EXISTS guards.
-- Depends on (already present): uuid-ossp extension, update_updated_at_column()
--   function, artworks table, and public.is_admin(uuid) from
--   2026-05-22-admins-and-rls-refactor.sql.
-- Admin RLS uses public.is_admin(auth.uid()) — NOT auth.role() = 'authenticated'
--   — because Founders Circle members share the auth.users pool and would
--   otherwise be able to read all license-request PII via the anon REST API.
-- Run in: Supabase SQL editor.
-- ============================================

BEGIN;

-- --------------------------------------------
-- License Types (configurable categories)
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS license_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_license_types_active ON license_types(is_active);
CREATE INDEX IF NOT EXISTS idx_license_types_order ON license_types(display_order);

-- --------------------------------------------
-- License Requests
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS license_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_number VARCHAR(50) UNIQUE NOT NULL,       -- e.g., "LIC-2026-001"
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  company VARCHAR(255),
  phone VARCHAR(50),
  license_type_id UUID REFERENCES license_types(id),
  territory VARCHAR(255),
  duration VARCHAR(100),
  print_run VARCHAR(100),
  usage_description TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'new',
  admin_notes TEXT,
  quoted_price DECIMAL(10, 2),
  quoted_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  expires_at DATE,
  locale VARCHAR(5) DEFAULT 'en',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_license_requests_status ON license_requests(status);
CREATE INDEX IF NOT EXISTS idx_license_requests_email ON license_requests(email);
CREATE INDEX IF NOT EXISTS idx_license_requests_created ON license_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_license_requests_number ON license_requests(request_number);

-- --------------------------------------------
-- License Request Artworks (Junction Table)
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS license_request_artworks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID REFERENCES license_requests(id) ON DELETE CASCADE,
  artwork_id UUID REFERENCES artworks(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_license_request_artworks_request ON license_request_artworks(request_id);
CREATE INDEX IF NOT EXISTS idx_license_request_artworks_artwork ON license_request_artworks(artwork_id);

-- --------------------------------------------
-- Triggers (auto-update updated_at)
-- --------------------------------------------
DROP TRIGGER IF EXISTS update_license_types_updated_at ON license_types;
CREATE TRIGGER update_license_types_updated_at
  BEFORE UPDATE ON license_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_license_requests_updated_at ON license_requests;
CREATE TRIGGER update_license_requests_updated_at
  BEFORE UPDATE ON license_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- --------------------------------------------
-- Row Level Security
-- --------------------------------------------
ALTER TABLE license_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE license_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE license_request_artworks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active license types" ON license_types;
CREATE POLICY "Public read active license types" ON license_types
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Public can submit license requests" ON license_requests;
CREATE POLICY "Public can submit license requests" ON license_requests
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public can create license request artworks" ON license_request_artworks;
CREATE POLICY "Public can create license request artworks" ON license_request_artworks
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admin full access to license_types" ON license_types;
CREATE POLICY "Admin full access to license_types" ON license_types
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin full access to license_requests" ON license_requests;
CREATE POLICY "Admin full access to license_requests" ON license_requests
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin full access to license_request_artworks" ON license_request_artworks;
CREATE POLICY "Admin full access to license_request_artworks" ON license_request_artworks
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- --------------------------------------------
-- Seed default license types (only if table is empty)
-- --------------------------------------------
INSERT INTO license_types (name, description, display_order)
SELECT * FROM (VALUES
  ('Editorial', 'For use in books, magazines, newspapers, and editorial publications', 1),
  ('Commercial', 'For advertising, branding, marketing, and commercial campaigns', 2),
  ('Film / Documentary', 'For use in films, documentaries, video productions, and streaming content', 3),
  ('Educational', 'For textbooks, curricula, classroom materials, and educational institutions', 4),
  ('Exhibition / Museum', 'For museum displays, gallery exhibitions, and institutional presentations', 5)
) AS v(name, description, display_order)
WHERE NOT EXISTS (SELECT 1 FROM license_types);

COMMIT;
