-- Migration: Create exhibition_reminders table
-- Purpose: Lead capture for exhibition reminder requests
-- Date: January 18, 2026

-- Create exhibition_reminders table
CREATE TABLE exhibition_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exhibition_id UUID REFERENCES exhibitions(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  reminder_type VARCHAR(50) DEFAULT 'opening',  -- 'opening', 'closing', 'both'

  -- Denormalized exhibition data for easy export
  exhibition_title VARCHAR(255),
  exhibition_venue VARCHAR(255),
  exhibition_city VARCHAR(100),
  exhibition_country VARCHAR(100),
  exhibition_start_date DATE,
  exhibition_end_date DATE,

  -- Marketing metadata
  locale VARCHAR(5) DEFAULT 'en',
  source VARCHAR(50) DEFAULT 'map',  -- 'map', 'detail_page', 'list'
  user_agent TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_exhibition_reminders_exhibition ON exhibition_reminders(exhibition_id);
CREATE INDEX idx_exhibition_reminders_email ON exhibition_reminders(email);
CREATE INDEX idx_exhibition_reminders_created ON exhibition_reminders(created_at DESC);
CREATE INDEX idx_exhibition_reminders_type ON exhibition_reminders(reminder_type);

-- Enable RLS
ALTER TABLE exhibition_reminders ENABLE ROW LEVEL SECURITY;

-- Public can submit reminders (INSERT only)
CREATE POLICY "Public can submit reminders" ON exhibition_reminders
  FOR INSERT
  WITH CHECK (true);

-- Authenticated users (admin) can view all reminders
CREATE POLICY "Admin can view all reminders" ON exhibition_reminders
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Authenticated users (admin) can update reminders
CREATE POLICY "Admin can update reminders" ON exhibition_reminders
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Authenticated users (admin) can delete reminders
CREATE POLICY "Admin can delete reminders" ON exhibition_reminders
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- Documentation comments
COMMENT ON TABLE exhibition_reminders IS 'Lead capture for exhibition reminder requests from map and detail pages';
COMMENT ON COLUMN exhibition_reminders.reminder_type IS 'Type of reminder: opening (when exhibition opens), closing (before it closes), or both';
COMMENT ON COLUMN exhibition_reminders.source IS 'Where the reminder was requested: map, detail_page, or list';
COMMENT ON COLUMN exhibition_reminders.locale IS 'User locale at time of submission: en, fr, or ja';
