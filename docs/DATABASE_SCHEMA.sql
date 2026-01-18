-- ============================================
-- Kwame Brathwaite Archive - Database Schema
-- Version: 2.0
-- Date: January 17, 2026
-- Database: Supabase (PostgreSQL)
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CORE TABLES
-- ============================================

-- --------------------------------------------
-- Artworks
-- --------------------------------------------
CREATE TABLE artworks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  year INTEGER,
  medium TEXT,
  dimensions VARCHAR(100),
  description TEXT,
  image_url TEXT NOT NULL,
  image_thumbnail_url TEXT,
  category VARCHAR(50),                              -- 'photography', 'print', 'historical'
  series VARCHAR(255),                               -- e.g., 'AJASS Sessions', 'Grandassa Models'
  availability_status VARCHAR(50) DEFAULT 'available', -- 'available', 'sold', 'on_loan', 'not_for_sale', 'inquiry_only'
  is_featured BOOLEAN DEFAULT false,
  display_order INTEGER,
  related_artwork_ids UUID[] DEFAULT '{}',           -- Up to 3 related works
  status VARCHAR(20) DEFAULT 'published',            -- 'draft', 'published', 'archived'
  meta_title VARCHAR(255),
  meta_description TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Artworks indexes
CREATE INDEX idx_artworks_category ON artworks(category);
CREATE INDEX idx_artworks_series ON artworks(series);
CREATE INDEX idx_artworks_featured ON artworks(is_featured);
CREATE INDEX idx_artworks_year ON artworks(year);
CREATE INDEX idx_artworks_status ON artworks(status);
CREATE INDEX idx_artworks_availability ON artworks(availability_status);
CREATE INDEX idx_artworks_display_order ON artworks(display_order);

-- --------------------------------------------
-- Exhibitions
-- --------------------------------------------
CREATE TABLE exhibitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  venue VARCHAR(255),
  street_address TEXT,
  city VARCHAR(100),
  state_region VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100),
  start_date DATE,
  end_date DATE,
  description TEXT,
  image_url TEXT,
  exhibition_type VARCHAR(50),                       -- 'past', 'current', 'upcoming'
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  venue_url TEXT,
  display_order INTEGER,
  status VARCHAR(20) DEFAULT 'published',            -- 'draft', 'published', 'archived'
  meta_title VARCHAR(255),
  meta_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Exhibitions indexes
CREATE INDEX idx_exhibitions_type ON exhibitions(exhibition_type);
CREATE INDEX idx_exhibitions_dates ON exhibitions(start_date, end_date);
CREATE INDEX idx_exhibitions_status ON exhibitions(status);
CREATE INDEX idx_exhibitions_display_order ON exhibitions(display_order);

-- --------------------------------------------
-- Exhibition Artworks (Junction Table)
-- --------------------------------------------
CREATE TABLE exhibition_artworks (
  exhibition_id UUID REFERENCES exhibitions(id) ON DELETE CASCADE,
  artwork_id UUID REFERENCES artworks(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  PRIMARY KEY (exhibition_id, artwork_id)
);

-- Exhibition artworks indexes
CREATE INDEX idx_exhibition_artworks_exhibition ON exhibition_artworks(exhibition_id);
CREATE INDEX idx_exhibition_artworks_artwork ON exhibition_artworks(artwork_id);

-- --------------------------------------------
-- Press
-- --------------------------------------------
CREATE TABLE press (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  publication VARCHAR(255),
  author VARCHAR(255),
  publish_date DATE,
  url TEXT,
  excerpt TEXT,
  image_url TEXT,
  press_type VARCHAR(50),                            -- 'article', 'review', 'interview', 'feature'
  is_featured BOOLEAN DEFAULT false,
  display_order INTEGER,
  status VARCHAR(20) DEFAULT 'published',            -- 'draft', 'published', 'archived'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Press indexes
CREATE INDEX idx_press_type ON press(press_type);
CREATE INDEX idx_press_featured ON press(is_featured);
CREATE INDEX idx_press_date ON press(publish_date DESC);
CREATE INDEX idx_press_status ON press(status);
CREATE INDEX idx_press_display_order ON press(display_order);

-- --------------------------------------------
-- Inquiries
-- --------------------------------------------
CREATE TABLE inquiries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  subject VARCHAR(255),
  message TEXT NOT NULL,
  inquiry_type VARCHAR(50),                          -- 'general', 'purchase', 'exhibition', 'press'
  artwork_id UUID REFERENCES artworks(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'new',                  -- 'new', 'read', 'responded', 'archived'
  locale VARCHAR(5) DEFAULT 'en',
  admin_notes TEXT,
  responded_at TIMESTAMP WITH TIME ZONE,
  responded_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inquiries indexes
CREATE INDEX idx_inquiries_status ON inquiries(status);
CREATE INDEX idx_inquiries_type ON inquiries(inquiry_type);
CREATE INDEX idx_inquiries_created ON inquiries(created_at DESC);
CREATE INDEX idx_inquiries_artwork ON inquiries(artwork_id);

-- ============================================
-- CONTENT MANAGEMENT TABLES
-- ============================================

-- --------------------------------------------
-- Site Content
-- --------------------------------------------
CREATE TABLE site_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page VARCHAR(50) NOT NULL,                         -- 'home', 'about', 'archive', 'contact'
  section VARCHAR(100) NOT NULL,                     -- 'hero_title', 'biography', etc.
  content TEXT,
  content_type VARCHAR(50) DEFAULT 'text',           -- 'text', 'html', 'markdown', 'json'
  metadata JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Site content unique constraint
CREATE UNIQUE INDEX idx_site_content_page_section ON site_content(page, section);

-- --------------------------------------------
-- Newsletter Subscribers
-- --------------------------------------------
CREATE TABLE newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  locale VARCHAR(5) DEFAULT 'en',
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Newsletter indexes
CREATE INDEX idx_newsletter_email ON newsletter_subscribers(email);
CREATE INDEX idx_newsletter_subscribed ON newsletter_subscribers(subscribed_at DESC);

-- ============================================
-- TRANSLATION CACHE
-- ============================================

CREATE TABLE translation_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_table VARCHAR(50) NOT NULL,                 -- 'artworks', 'exhibitions', 'press', 'site_content'
  source_id UUID NOT NULL,
  source_field VARCHAR(50) NOT NULL,                 -- 'title', 'description', etc.
  source_hash VARCHAR(64) NOT NULL,                  -- SHA-256 hash of source content
  target_language VARCHAR(5) NOT NULL,               -- 'fr', 'ja'
  translated_content TEXT NOT NULL,
  translation_service VARCHAR(20) DEFAULT 'deepl',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_translation UNIQUE(source_table, source_id, source_field, target_language)
);

-- Translation cache indexes
CREATE INDEX idx_translation_lookup ON translation_cache(source_table, source_id, target_language);
CREATE INDEX idx_translation_hash ON translation_cache(source_hash, target_language);

-- ============================================
-- ACTIVITY LOG
-- ============================================

CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email VARCHAR(255) NOT NULL,
  action VARCHAR(50) NOT NULL,                       -- 'create', 'update', 'delete', 'status_change', 'reorder'
  entity_type VARCHAR(50) NOT NULL,                  -- 'artwork', 'exhibition', 'press', 'inquiry', 'content'
  entity_id UUID,
  entity_title VARCHAR(255),                         -- Human-readable reference
  changes JSONB,                                     -- Optional: what changed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activity log indexes
CREATE INDEX idx_activity_log_user ON activity_log(user_email);
CREATE INDEX idx_activity_log_entity ON activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_log_created ON activity_log(created_at DESC);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- --------------------------------------------
-- Auto-update updated_at timestamp
-- --------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_artworks_updated_at
  BEFORE UPDATE ON artworks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exhibitions_updated_at
  BEFORE UPDATE ON exhibitions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_press_updated_at
  BEFORE UPDATE ON press
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_site_content_updated_at
  BEFORE UPDATE ON site_content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_translation_cache_updated_at
  BEFORE UPDATE ON translation_cache
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE artworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE exhibitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exhibition_artworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE press ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE translation_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------
-- Public Read Policies (Published Content Only)
-- --------------------------------------------

CREATE POLICY "Public read published artworks" ON artworks
  FOR SELECT
  USING (status = 'published');

CREATE POLICY "Public read published exhibitions" ON exhibitions
  FOR SELECT
  USING (status = 'published');

CREATE POLICY "Public read exhibition artworks" ON exhibition_artworks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM exhibitions 
      WHERE exhibitions.id = exhibition_artworks.exhibition_id 
      AND exhibitions.status = 'published'
    )
  );

CREATE POLICY "Public read published press" ON press
  FOR SELECT
  USING (status = 'published');

CREATE POLICY "Public read site content" ON site_content
  FOR SELECT
  USING (true);

CREATE POLICY "Public read translation cache" ON translation_cache
  FOR SELECT
  USING (true);

-- --------------------------------------------
-- Public Insert Policies (Forms)
-- --------------------------------------------

CREATE POLICY "Public can submit inquiries" ON inquiries
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can subscribe to newsletter" ON newsletter_subscribers
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can create translation cache" ON translation_cache
  FOR INSERT
  WITH CHECK (true);

-- --------------------------------------------
-- Authenticated (Admin) Full Access Policies
-- --------------------------------------------

CREATE POLICY "Admin full access to artworks" ON artworks
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admin full access to exhibitions" ON exhibitions
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admin full access to exhibition_artworks" ON exhibition_artworks
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admin full access to press" ON press
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admin full access to inquiries" ON inquiries
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admin full access to site_content" ON site_content
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admin full access to newsletter" ON newsletter_subscribers
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admin full access to translation_cache" ON translation_cache
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admin full access to activity_log" ON activity_log
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================
-- INITIAL SEED DATA
-- ============================================

-- --------------------------------------------
-- Site Content Placeholders
-- --------------------------------------------
INSERT INTO site_content (page, section, content, content_type) VALUES
  ('home', 'hero_title', 'Kwame Brathwaite Photo Archive', 'text'),
  ('home', 'hero_subtitle', 'Style. Culture. Self-Definition.', 'text'),
  ('home', 'intro', 'Welcome to the official archive of Kwame Brathwaite, pioneering photographer and founder of the Black is Beautiful movement.', 'text'),
  ('about', 'biography', '', 'html'),
  ('about', 'movement', '', 'html'),
  ('about', 'timeline', '[]', 'json'),
  ('archive', 'mission', '', 'html'),
  ('archive', 'description', '', 'html'),
  ('contact', 'intro', 'We welcome inquiries from collectors, museums, educators, and press.', 'text');

-- ============================================
-- STORAGE BUCKETS (Run in Supabase Dashboard)
-- ============================================
-- Note: Storage buckets must be created via Supabase Dashboard or API
-- 
-- Buckets to create:
-- 1. artworks (public)
-- 2. thumbnails (public)
-- 3. exhibitions (public)
-- 4. press (public)
-- 5. press-kit (public)
--
-- Example SQL for reference (run via Supabase SQL editor):
--
-- INSERT INTO storage.buckets (id, name, public) VALUES ('artworks', 'artworks', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('thumbnails', 'thumbnails', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('exhibitions', 'exhibitions', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('press', 'press', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('press-kit', 'press-kit', true);

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE artworks IS 'Photography and artwork archive';
COMMENT ON COLUMN artworks.series IS 'Collection/series name, e.g., AJASS Sessions, Grandassa Models';
COMMENT ON COLUMN artworks.availability_status IS 'available, sold, on_loan, not_for_sale, inquiry_only';
COMMENT ON COLUMN artworks.related_artwork_ids IS 'Array of up to 3 related artwork UUIDs';
COMMENT ON COLUMN artworks.status IS 'draft, published, archived';

COMMENT ON TABLE exhibitions IS 'Past, current, and upcoming exhibitions';
COMMENT ON COLUMN exhibitions.exhibition_type IS 'past, current, upcoming';

COMMENT ON TABLE exhibition_artworks IS 'Junction table linking exhibitions to artworks';

COMMENT ON TABLE press IS 'Press coverage and media mentions';
COMMENT ON COLUMN press.press_type IS 'article, review, interview, feature';

COMMENT ON TABLE inquiries IS 'Contact form submissions';
COMMENT ON COLUMN inquiries.inquiry_type IS 'general, purchase, exhibition, press';
COMMENT ON COLUMN inquiries.status IS 'new, read, responded, archived';

COMMENT ON TABLE site_content IS 'CMS content for static pages';
COMMENT ON COLUMN site_content.content_type IS 'text, html, markdown, json';

COMMENT ON TABLE newsletter_subscribers IS 'Email newsletter subscriptions';

COMMENT ON TABLE translation_cache IS 'Cached DeepL translations for i18n';

COMMENT ON TABLE activity_log IS 'Admin action audit trail';
COMMENT ON COLUMN activity_log.action IS 'create, update, delete, status_change, reorder';
COMMENT ON COLUMN activity_log.entity_type IS 'artwork, exhibition, press, inquiry, content';

-- ============================================
-- END OF SCHEMA
-- ============================================
