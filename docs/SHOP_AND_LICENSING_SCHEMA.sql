-- ============================================
-- Kwame Brathwaite Archive - Shop & Licensing Schema
-- Version: 1.0
-- Date: February 10, 2026
-- Database: Supabase (PostgreSQL)
-- ============================================

-- ============================================
-- LICENSING PORTAL TABLES
-- ============================================

-- --------------------------------------------
-- License Types (configurable categories)
-- --------------------------------------------
CREATE TABLE license_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- License types indexes
CREATE INDEX idx_license_types_active ON license_types(is_active);
CREATE INDEX idx_license_types_order ON license_types(display_order);

-- --------------------------------------------
-- License Requests
-- --------------------------------------------
CREATE TABLE license_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_number VARCHAR(50) UNIQUE NOT NULL,       -- e.g., "LIC-2026-001"
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  company VARCHAR(255),
  phone VARCHAR(50),
  license_type_id UUID REFERENCES license_types(id),
  territory VARCHAR(255),                            -- e.g., "North America", "Worldwide"
  duration VARCHAR(100),                             -- e.g., "1 year", "5 years", "perpetual"
  print_run VARCHAR(100),                            -- e.g., "5,000 copies", "N/A"
  usage_description TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'new',                  -- 'new', 'quoted', 'approved', 'rejected', 'active', 'expired'
  admin_notes TEXT,
  quoted_price DECIMAL(10, 2),
  quoted_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  expires_at DATE,
  locale VARCHAR(5) DEFAULT 'en',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- License requests indexes
CREATE INDEX idx_license_requests_status ON license_requests(status);
CREATE INDEX idx_license_requests_email ON license_requests(email);
CREATE INDEX idx_license_requests_created ON license_requests(created_at DESC);
CREATE INDEX idx_license_requests_number ON license_requests(request_number);

-- --------------------------------------------
-- License Request Artworks (Junction Table)
-- --------------------------------------------
CREATE TABLE license_request_artworks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID REFERENCES license_requests(id) ON DELETE CASCADE,
  artwork_id UUID REFERENCES artworks(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- License request artworks indexes
CREATE INDEX idx_license_request_artworks_request ON license_request_artworks(request_id);
CREATE INDEX idx_license_request_artworks_artwork ON license_request_artworks(artwork_id);

-- ============================================
-- MERCHANDISE SHOP TABLES
-- ============================================

-- --------------------------------------------
-- Products (separate from artworks)
-- --------------------------------------------
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  category VARCHAR(50),                              -- 'books', 'apparel', 'posters', 'accessories'
  base_price DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  image_url TEXT,
  images JSONB DEFAULT '[]',                         -- Array of image URLs
  status VARCHAR(20) DEFAULT 'draft',                -- 'draft', 'published', 'archived'
  is_featured BOOLEAN DEFAULT false,
  display_order INTEGER,
  metadata JSONB,                                    -- Flexible field for category-specific data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products indexes
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_featured ON products(is_featured);
CREATE INDEX idx_products_display_order ON products(display_order);

-- --------------------------------------------
-- Product Variants (sizes, colors, etc.)
-- --------------------------------------------
CREATE TABLE product_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,                        -- e.g., "Size M", "Blue - Large"
  sku VARCHAR(100) UNIQUE NOT NULL,
  price_override DECIMAL(10, 2),                     -- If NULL, uses product base_price
  inventory_count INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',               -- 'active', 'out_of_stock', 'discontinued'
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product variants indexes
CREATE INDEX idx_product_variants_product ON product_variants(product_id);
CREATE INDEX idx_product_variants_sku ON product_variants(sku);
CREATE INDEX idx_product_variants_status ON product_variants(status);

-- --------------------------------------------
-- Product Images
-- --------------------------------------------
CREATE TABLE product_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text VARCHAR(255),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product images indexes
CREATE INDEX idx_product_images_product ON product_images(product_id);

-- --------------------------------------------
-- Orders
-- --------------------------------------------
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number VARCHAR(50) UNIQUE NOT NULL,          -- e.g., "ORD-2026-001"
  email VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  shipping_address JSONB NOT NULL,                   -- { line1, line2?, city, state, postal_code, country }
  billing_address JSONB,                             -- If different from shipping
  stripe_payment_intent_id VARCHAR(255) UNIQUE,
  stripe_payment_status VARCHAR(50),                 -- 'succeeded', 'pending', 'failed'
  subtotal DECIMAL(10, 2) NOT NULL,
  shipping_cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
  tax DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(50) DEFAULT 'pending',              -- 'pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'
  fulfillment_status VARCHAR(50) DEFAULT 'unfulfilled', -- 'unfulfilled', 'partially_fulfilled', 'fulfilled'
  tracking_number VARCHAR(255),
  carrier VARCHAR(100),                              -- e.g., 'USPS', 'UPS', 'FedEx'
  notes TEXT,
  locale VARCHAR(5) DEFAULT 'en',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders indexes
CREATE INDEX idx_orders_email ON orders(email);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_fulfillment ON orders(fulfillment_status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_orders_stripe_intent ON orders(stripe_payment_intent_id);
CREATE INDEX idx_orders_number ON orders(order_number);

-- --------------------------------------------
-- Order Items
-- --------------------------------------------
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),
  product_name VARCHAR(255) NOT NULL,                -- Snapshot at time of order
  variant_name VARCHAR(100),                         -- Snapshot
  sku VARCHAR(100),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order items indexes
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);

-- ============================================
-- TRIGGERS (auto-update updated_at)
-- ============================================

CREATE TRIGGER update_license_types_updated_at
  BEFORE UPDATE ON license_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_license_requests_updated_at
  BEFORE UPDATE ON license_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_variants_updated_at
  BEFORE UPDATE ON product_variants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all new tables
ALTER TABLE license_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE license_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE license_request_artworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------
-- Public Read Policies
-- --------------------------------------------

CREATE POLICY "Public read active license types" ON license_types
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Public read published products" ON products
  FOR SELECT
  USING (status = 'published');

CREATE POLICY "Public read active product variants" ON product_variants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_variants.product_id
      AND products.status = 'published'
    )
  );

CREATE POLICY "Public read product images" ON product_images
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_images.product_id
      AND products.status = 'published'
    )
  );

-- --------------------------------------------
-- Public Insert Policies
-- --------------------------------------------

CREATE POLICY "Public can submit license requests" ON license_requests
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can create license request artworks" ON license_request_artworks
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can create orders" ON orders
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can create order items" ON order_items
  FOR INSERT
  WITH CHECK (true);

-- Public can read their own orders (by email match via API, not direct DB access)
CREATE POLICY "Public read own orders" ON orders
  FOR SELECT
  USING (true);

CREATE POLICY "Public read own order items" ON order_items
  FOR SELECT
  USING (true);

-- --------------------------------------------
-- Authenticated (Admin) Full Access Policies
-- --------------------------------------------

CREATE POLICY "Admin full access to license_types" ON license_types
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admin full access to license_requests" ON license_requests
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admin full access to license_request_artworks" ON license_request_artworks
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admin full access to products" ON products
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admin full access to product_variants" ON product_variants
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admin full access to product_images" ON product_images
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admin full access to orders" ON orders
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admin full access to order_items" ON order_items
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================
-- SEED DATA
-- ============================================

-- Default license types
INSERT INTO license_types (name, description, display_order) VALUES
  ('Editorial', 'For use in books, magazines, newspapers, and editorial publications', 1),
  ('Commercial', 'For advertising, branding, marketing, and commercial campaigns', 2),
  ('Film / Documentary', 'For use in films, documentaries, video productions, and streaming content', 3),
  ('Educational', 'For textbooks, curricula, classroom materials, and educational institutions', 4),
  ('Exhibition / Museum', 'For museum displays, gallery exhibitions, and institutional presentations', 5);

-- ============================================
-- STORAGE BUCKETS (Run in Supabase Dashboard)
-- ============================================
-- Additional buckets to create:
-- 6. products (public)
--
-- INSERT INTO storage.buckets (id, name, public) VALUES ('products', 'products', true);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE license_types IS 'Configurable license type categories';
COMMENT ON TABLE license_requests IS 'Image licensing requests from publishers, filmmakers, etc.';
COMMENT ON COLUMN license_requests.request_number IS 'Auto-generated: LIC-YYYY-NNN';
COMMENT ON COLUMN license_requests.status IS 'new, quoted, approved, rejected, active, expired';

COMMENT ON TABLE products IS 'Merchandise products (books, apparel, posters, accessories)';
COMMENT ON COLUMN products.category IS 'books, apparel, posters, accessories';
COMMENT ON COLUMN products.status IS 'draft, published, archived';

COMMENT ON TABLE product_variants IS 'Product size/color/edition variants with individual inventory';
COMMENT ON COLUMN product_variants.price_override IS 'If NULL, uses product base_price';
COMMENT ON COLUMN product_variants.status IS 'active, out_of_stock, discontinued';

COMMENT ON TABLE orders IS 'Customer merchandise orders';
COMMENT ON COLUMN orders.order_number IS 'Auto-generated: ORD-YYYY-NNN';
COMMENT ON COLUMN orders.status IS 'pending, processing, shipped, delivered, cancelled, refunded';
COMMENT ON COLUMN orders.fulfillment_status IS 'unfulfilled, partially_fulfilled, fulfilled';
COMMENT ON COLUMN orders.shipping_address IS 'JSON: { line1, line2?, city, state, postal_code, country }';

COMMENT ON TABLE order_items IS 'Individual items within an order (snapshot of product data at time of purchase)';

-- ============================================
-- END OF SHOP & LICENSING SCHEMA
-- ============================================
