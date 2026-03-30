-- Migration: Exhibition Detail Page Enhancements
-- Date: 2026-03-29
-- Description: Add venue_description to exhibitions, create exhibition_press junction table

-- 1. Add venue_description to exhibitions
ALTER TABLE exhibitions ADD COLUMN IF NOT EXISTS venue_description TEXT;

-- 2. Create exhibition_press junction table
CREATE TABLE IF NOT EXISTS exhibition_press (
  exhibition_id UUID REFERENCES exhibitions(id) ON DELETE CASCADE,
  press_id UUID REFERENCES press(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  PRIMARY KEY (exhibition_id, press_id)
);

CREATE INDEX IF NOT EXISTS idx_exhibition_press_exhibition ON exhibition_press(exhibition_id);
CREATE INDEX IF NOT EXISTS idx_exhibition_press_press ON exhibition_press(press_id);

-- 3. RLS policies (matching exhibition_artworks pattern)
ALTER TABLE exhibition_press ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can view exhibition press links') THEN
    CREATE POLICY "Public can view exhibition press links"
      ON exhibition_press FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin full access to exhibition press') THEN
    CREATE POLICY "Admin full access to exhibition press"
      ON exhibition_press FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END
$$;
