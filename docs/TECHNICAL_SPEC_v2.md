# Technical Specification Document v2
## Kwame Brathwaite Archive Website

**Version:** 2.0  
**Date:** January 17, 2026  
**Project:** kwamebrathwaite.com Refresh  
**Status:** Ready for Development

---

## 1. TECHNICAL OVERVIEW

### 1.1 Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript |
| **Styling** | Tailwind CSS |
| **Database** | Supabase (PostgreSQL) |
| **Auth** | Supabase Auth (admin only) |
| **Storage** | Supabase Storage |
| **Hosting** | Vercel (Edge Network/CDN) |
| **Email** | Resend API + React Email |
| **i18n** | next-intl + DeepL API |
| **Maps** | Google Maps API + Geocoding API |
| **State Management** | React Query (TanStack Query) |
| **Rich Text Editor** | TipTap |

### 1.2 System Architecture

```
┌─────────────────────┐
│      Vercel         │  (Edge Network + Hosting)
│    Next.js App      │
└──────────┬──────────┘
           │
     ┌─────┴─────┐
     │           │
┌────▼────┐ ┌────▼────┐
│Supabase │ │  APIs   │
│Database │ │ Resend  │
│Storage  │ │ DeepL   │
│Auth     │ │ Google  │
└─────────┘ └─────────┘
```

### 1.3 Environment Variables

```bash
# Database
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Email
RESEND_API_KEY=

# Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
GOOGLE_GEOCODING_API_KEY=

# Translation
DEEPL_API_KEY=

# Site
NEXT_PUBLIC_SITE_URL=https://kwamebrathwaite.com
```

---

## 2. DATABASE SCHEMA

### 2.1 Core Tables

#### artworks
```sql
CREATE TABLE artworks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  year INTEGER,
  medium TEXT,
  dimensions VARCHAR(100),
  description TEXT,
  image_url TEXT NOT NULL,
  image_thumbnail_url TEXT,
  category VARCHAR(50),
  series VARCHAR(255),
  availability_status VARCHAR(50) DEFAULT 'available',
  is_featured BOOLEAN DEFAULT false,
  display_order INTEGER,
  related_artwork_ids UUID[] DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'published',
  meta_title VARCHAR(255),
  meta_description TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_artworks_category ON artworks(category);
CREATE INDEX idx_artworks_series ON artworks(series);
CREATE INDEX idx_artworks_featured ON artworks(is_featured);
CREATE INDEX idx_artworks_year ON artworks(year);
CREATE INDEX idx_artworks_status ON artworks(status);
CREATE INDEX idx_artworks_availability ON artworks(availability_status);
```

**Field Reference:**
| Field | Type | Description |
|-------|------|-------------|
| category | VARCHAR(50) | 'photography', 'print', 'historical' |
| series | VARCHAR(255) | e.g., 'AJASS Sessions', 'Grandassa Models', 'Jazz Giants' |
| availability_status | VARCHAR(50) | 'available', 'sold', 'on_loan', 'not_for_sale', 'inquiry_only' |
| status | VARCHAR(20) | 'draft', 'published', 'archived' |
| related_artwork_ids | UUID[] | Up to 3 manually selected related works |

#### exhibitions
```sql
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
  exhibition_type VARCHAR(50),
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  venue_url TEXT,
  display_order INTEGER,
  status VARCHAR(20) DEFAULT 'published',
  meta_title VARCHAR(255),
  meta_description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_exhibitions_type ON exhibitions(exhibition_type);
CREATE INDEX idx_exhibitions_dates ON exhibitions(start_date, end_date);
CREATE INDEX idx_exhibitions_status ON exhibitions(status);
```

**Field Reference:**
| Field | Type | Description |
|-------|------|-------------|
| exhibition_type | VARCHAR(50) | 'past', 'current', 'upcoming' |
| status | VARCHAR(20) | 'draft', 'published', 'archived' |

#### exhibition_artworks (Junction Table)
```sql
CREATE TABLE exhibition_artworks (
  exhibition_id UUID REFERENCES exhibitions(id) ON DELETE CASCADE,
  artwork_id UUID REFERENCES artworks(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  PRIMARY KEY (exhibition_id, artwork_id)
);

CREATE INDEX idx_exhibition_artworks_exhibition ON exhibition_artworks(exhibition_id);
CREATE INDEX idx_exhibition_artworks_artwork ON exhibition_artworks(artwork_id);
```

#### press
```sql
CREATE TABLE press (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  publication VARCHAR(255),
  author VARCHAR(255),
  publish_date DATE,
  url TEXT,
  excerpt TEXT,
  image_url TEXT,
  press_type VARCHAR(50),
  is_featured BOOLEAN DEFAULT false,
  display_order INTEGER,
  status VARCHAR(20) DEFAULT 'published',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_press_type ON press(press_type);
CREATE INDEX idx_press_featured ON press(is_featured);
CREATE INDEX idx_press_date ON press(publish_date DESC);
CREATE INDEX idx_press_status ON press(status);
```

**Field Reference:**
| Field | Type | Description |
|-------|------|-------------|
| press_type | VARCHAR(50) | 'article', 'review', 'interview', 'feature' |
| status | VARCHAR(20) | 'draft', 'published', 'archived' |

#### inquiries
```sql
CREATE TABLE inquiries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  subject VARCHAR(255),
  message TEXT NOT NULL,
  inquiry_type VARCHAR(50),
  artwork_id UUID REFERENCES artworks(id),
  status VARCHAR(50) DEFAULT 'new',
  locale VARCHAR(5) DEFAULT 'en',
  admin_notes TEXT,
  responded_at TIMESTAMP,
  responded_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_inquiries_status ON inquiries(status);
CREATE INDEX idx_inquiries_type ON inquiries(inquiry_type);
CREATE INDEX idx_inquiries_created ON inquiries(created_at DESC);
```

**Field Reference:**
| Field | Type | Description |
|-------|------|-------------|
| inquiry_type | VARCHAR(50) | 'general', 'purchase', 'exhibition', 'press' |
| status | VARCHAR(50) | 'new', 'read', 'responded', 'archived' |

### 2.2 Content Management Tables

#### site_content
```sql
CREATE TABLE site_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page VARCHAR(50) NOT NULL,
  section VARCHAR(100) NOT NULL,
  content TEXT,
  content_type VARCHAR(50),
  metadata JSONB,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_site_content_page_section ON site_content(page, section);
```

**Content Sections:**
| Page | Section | Description |
|------|---------|-------------|
| home | hero_title | Homepage hero title |
| home | hero_subtitle | Homepage hero subtitle |
| home | intro | Homepage introduction text |
| about | biography | Kwame Brathwaite biography |
| about | movement | Black is Beautiful movement history |
| about | timeline | Career timeline data (JSON) |
| archive | mission | Archive mission statement |
| archive | description | Archive description |

#### newsletter_subscribers
```sql
CREATE TABLE newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  locale VARCHAR(5) DEFAULT 'en',
  subscribed_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_newsletter_email ON newsletter_subscribers(email);
```

### 2.3 Translation Cache

#### translation_cache
```sql
CREATE TABLE translation_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_table VARCHAR(50) NOT NULL,
  source_id UUID NOT NULL,
  source_field VARCHAR(50) NOT NULL,
  source_hash VARCHAR(64) NOT NULL,
  target_language VARCHAR(5) NOT NULL,
  translated_content TEXT NOT NULL,
  translation_service VARCHAR(20) DEFAULT 'deepl',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(source_table, source_id, source_field, target_language)
);

CREATE INDEX idx_translation_lookup ON translation_cache(source_table, source_id, target_language);
CREATE INDEX idx_translation_hash ON translation_cache(source_hash, target_language);
```

### 2.4 Activity Log

#### activity_log
```sql
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email VARCHAR(255) NOT NULL,
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  entity_title VARCHAR(255),
  changes JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_activity_log_user ON activity_log(user_email);
CREATE INDEX idx_activity_log_entity ON activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_log_created ON activity_log(created_at DESC);
```

**Field Reference:**
| Field | Type | Description |
|-------|------|-------------|
| action | VARCHAR(50) | 'create', 'update', 'delete' |
| entity_type | VARCHAR(50) | 'artwork', 'exhibition', 'press', 'inquiry', 'content' |

### 2.5 Storage Buckets

| Bucket | Purpose | Access |
|--------|---------|--------|
| artworks | High-resolution artwork images | Public read |
| thumbnails | Optimized thumbnails | Public read |
| exhibitions | Exhibition photos | Public read |
| press | Press images | Public read |
| press-kit | Downloadable press kit PDFs | Public read |

---

## 3. API ENDPOINTS

### 3.1 Public API Routes

#### Artworks
```
GET  /api/artworks                    - List artworks (pagination, filters)
     ?page=1&limit=20
     &category=photography
     &series=AJASS+Sessions
     &availability=available
     &year=1965
     &q=search+term
     &status=published (always enforced)

GET  /api/artworks/:id                - Single artwork (with translations)
GET  /api/artworks/featured           - Featured artworks
```

#### Exhibitions
```
GET  /api/exhibitions                 - List all exhibitions
     ?type=current|past|upcoming
     &status=published (always enforced)

GET  /api/exhibitions/:id             - Single exhibition with linked artworks
GET  /api/exhibitions/current         - Current and upcoming exhibitions
```

#### Press
```
GET  /api/press                       - List all press
     ?type=article|review|interview|feature
     &featured=true
     &status=published (always enforced)

GET  /api/press/:id                   - Single press item
```

#### Content
```
GET  /api/content/:page               - Get all sections for a page
GET  /api/content/:page/:section      - Get specific section
```

#### Contact/Inquiries
```
POST /api/inquiries                   - Submit inquiry form
     Body: { name, email, phone?, subject?, message, inquiry_type, artwork_id?, locale, honeypot }
```

#### Newsletter
```
POST /api/newsletter/subscribe        - Subscribe to newsletter
     Body: { email, locale }
```

#### Translation
```
POST /api/translate                   - On-demand translation (internal use)
     Body: { sourceTable, sourceId, sourceField, sourceContent, targetLanguage }
```

### 3.2 Admin API Routes

All admin routes require authentication via Supabase Auth.

#### Auth
```
POST /api/admin/auth/login            - Login
POST /api/admin/auth/logout           - Logout
GET  /api/admin/auth/session          - Get current session
```

#### Artworks
```
GET    /api/admin/artworks            - List all artworks (including drafts)
POST   /api/admin/artworks            - Create artwork
GET    /api/admin/artworks/:id        - Get artwork
PUT    /api/admin/artworks/:id        - Update artwork
DELETE /api/admin/artworks/:id        - Delete artwork
PUT    /api/admin/artworks/reorder    - Reorder artworks
       Body: { ids: [...] }
```

#### Exhibitions
```
GET    /api/admin/exhibitions         - List all exhibitions
POST   /api/admin/exhibitions         - Create exhibition
GET    /api/admin/exhibitions/:id     - Get exhibition
PUT    /api/admin/exhibitions/:id     - Update exhibition
DELETE /api/admin/exhibitions/:id     - Delete exhibition
POST   /api/admin/exhibitions/:id/artworks
       Body: { artworkIds: [...] }    - Link artworks to exhibition
```

#### Press
```
GET    /api/admin/press               - List all press
POST   /api/admin/press               - Create press item
GET    /api/admin/press/:id           - Get press item
PUT    /api/admin/press/:id           - Update press item
DELETE /api/admin/press/:id           - Delete press item
```

#### Inquiries
```
GET    /api/admin/inquiries           - List all inquiries
       ?status=new|read|responded|archived
       &type=general|purchase|exhibition|press

GET    /api/admin/inquiries/:id       - Get inquiry
PUT    /api/admin/inquiries/:id       - Update inquiry (status, notes)
       Body: { status?, admin_notes?, responded_at?, responded_by? }
```

#### Site Content
```
GET    /api/admin/content             - List all content sections
GET    /api/admin/content/:page       - Get page content
PUT    /api/admin/content/:page/:section - Update section
       Body: { content, content_type }
```

#### Newsletter
```
GET    /api/admin/newsletter          - List subscribers
GET    /api/admin/newsletter/export   - Export as CSV
DELETE /api/admin/newsletter/:id      - Delete subscriber
```

#### Media
```
GET    /api/admin/media               - List uploaded files
       ?bucket=artworks|exhibitions|press
POST   /api/admin/media/upload        - Upload file
       FormData: { file, bucket }
DELETE /api/admin/media/:bucket/:filename - Delete file
```

#### Geocoding
```
POST   /api/admin/geocode             - Lookup lat/lng from address
       Body: { address, city, state_region, country, postal_code }
```

#### Activity Log
```
GET    /api/admin/activity            - Get recent activity
       ?limit=50&entity_type=artwork
```

### 3.3 API Response Format

**Success Response:**
```typescript
{
  success: true,
  data: T | T[],
  metadata?: {
    page: number,
    pageSize: number,
    total: number,
    totalPages: number
  }
}
```

**Error Response:**
```typescript
{
  success: false,
  error: {
    code: string,
    message: string,
    details?: any
  }
}
```

---

## 4. FRONTEND ARCHITECTURE

### 4.1 Public Routes

```
app/
├── [locale]/
│   ├── layout.tsx                    # Locale-aware layout
│   ├── page.tsx                      # Homepage
│   ├── works/
│   │   ├── page.tsx                  # Gallery grid (with search/filter)
│   │   └── [id]/
│   │       └── page.tsx              # Single artwork detail
│   ├── exhibitions/
│   │   ├── page.tsx                  # Exhibitions list
│   │   └── [id]/
│   │       └── page.tsx              # Single exhibition
│   ├── press/
│   │   └── page.tsx                  # Press coverage
│   ├── about/
│   │   └── page.tsx                  # Biography & movement
│   ├── archive/
│   │   └── page.tsx                  # Archive information
│   ├── contact/
│   │   └── page.tsx                  # Inquiry form
│   ├── privacy/
│   │   └── page.tsx                  # Privacy policy
│   ├── terms/
│   │   └── page.tsx                  # Terms of use
│   ├── not-found.tsx                 # 404 page
│   └── error.tsx                     # Error page
```

**Locales:** `en` (default, no prefix), `fr`, `ja`

### 4.2 Admin Routes

```
app/
├── admin/
│   ├── layout.tsx                    # Auth wrapper + sidebar
│   ├── page.tsx                      # Dashboard
│   ├── login/
│   │   └── page.tsx                  # Login page
│   ├── artworks/
│   │   ├── page.tsx                  # List artworks
│   │   ├── new/
│   │   │   └── page.tsx              # Create artwork
│   │   └── [id]/
│   │       └── edit/
│   │           └── page.tsx          # Edit artwork
│   ├── exhibitions/
│   │   ├── page.tsx                  # List exhibitions
│   │   ├── new/
│   │   │   └── page.tsx              # Create exhibition
│   │   └── [id]/
│   │       └── edit/
│   │           └── page.tsx          # Edit exhibition
│   ├── press/
│   │   ├── page.tsx                  # List press
│   │   ├── new/
│   │   │   └── page.tsx              # Create press item
│   │   └── [id]/
│   │       └── edit/
│   │           └── page.tsx          # Edit press item
│   ├── inquiries/
│   │   ├── page.tsx                  # List inquiries
│   │   └── [id]/
│   │       └── page.tsx              # View inquiry detail
│   ├── content/
│   │   └── page.tsx                  # Edit site content
│   ├── newsletter/
│   │   └── page.tsx                  # View subscribers
│   ├── media/
│   │   └── page.tsx                  # Media library
│   └── activity/
│       └── page.tsx                  # Activity log
```

### 4.3 Component Architecture

#### Layout Components
| Component | Description |
|-----------|-------------|
| Header | Global navigation + language switcher |
| Footer | Links, newsletter signup, social |
| MobileMenu | Slide-out mobile navigation |
| PageTransition | Page transition animations |
| AdminLayout | Admin sidebar + header |
| AdminSidebar | Admin navigation |

#### Public Feature Components
| Component | Description |
|-----------|-------------|
| ArtworkGrid | Responsive grid with filtering |
| ArtworkCard | Individual artwork preview |
| ArtworkDetail | Full artwork view |
| Lightbox | Full-screen image viewer with zoom |
| ExhibitionCard | Exhibition preview card |
| ExhibitionMap | Google Maps integration |
| PressCard | Press item preview |
| Timeline | Interactive career timeline |
| ContactForm | Inquiry form with honeypot |
| NewsletterForm | Email signup form |
| SearchBar | Global search input |
| FilterBar | Category/series/year filters |
| LanguageSwitcher | Locale selector dropdown |

#### Admin Components
| Component | Description |
|-----------|-------------|
| AuthGuard | Protect admin routes |
| DataTable | Sortable, filterable table |
| ImageUploader | Drag-drop upload to Supabase |
| RichTextEditor | TipTap editor for content |
| ArtworkPicker | Searchable artwork selector |
| StatusBadge | Visual status indicators |
| ConfirmDialog | Delete confirmations |
| AddressLookup | Geocoding address input |
| ActivityFeed | Recent activity display |
| StatsCard | Dashboard statistics |

#### Utility Components
| Component | Description |
|-----------|-------------|
| ImageWithFallback | Image with loading/error states |
| LazyImage | Intersection observer lazy loading |
| SEO | Dynamic meta tags |
| JsonLd | Schema.org structured data |
| Honeypot | Invisible spam field |

### 4.4 State Management

**Client State:**
- React Context for UI state (menu open, lightbox active)
- Local component state for forms

**Server State:**
- React Query for all data fetching
- 5-minute stale time for listings
- 1-hour stale time for detail pages
- Optimistic updates for admin actions

### 4.5 Data Fetching Strategy

| Page Type | Strategy | Revalidation |
|-----------|----------|--------------|
| Homepage | SSG + ISR | 15 minutes |
| Works listing | SSR | On request |
| Work detail | SSG + ISR | 1 hour |
| Exhibitions | SSR | On request |
| Exhibition detail | SSG + ISR | 1 hour |
| Press | SSR | On request |
| About/Archive | SSG + ISR | 1 hour |
| Admin pages | CSR | Real-time |

---

## 5. INTERNATIONALIZATION (i18n)

### 5.1 Configuration

**Supported Locales:**
- `en` - English (default, no URL prefix)
- `fr` - French (`/fr` prefix)
- `ja` - Japanese (`/ja` prefix)

**Framework:** next-intl

### 5.2 Static Translations

Location: `/messages/{locale}.json`

**Translation Namespaces:**
- navigation
- hero
- works
- exhibitions
- press
- about
- contact
- common
- footer
- languageSwitcher

### 5.3 Dynamic Content Translation

**DeepL API Integration:**
- Translates database content on first request
- Caches translations in `translation_cache` table
- Cache invalidation via content hash comparison

**Translated Fields:**
| Table | Fields |
|-------|--------|
| artworks | title, description |
| exhibitions | title, description |
| press | title, excerpt |
| site_content | content |

**Never Translated:**
- Proper nouns (Kwame Brathwaite, venue names, publication names)
- Dates and dimensions (locale-formatted only)

### 5.4 SEO

**Hreflang Tags:**
```html
<link rel="alternate" hreflang="en" href="https://kwamebrathwaite.com/works" />
<link rel="alternate" hreflang="fr" href="https://kwamebrathwaite.com/fr/works" />
<link rel="alternate" hreflang="ja" href="https://kwamebrathwaite.com/ja/works" />
<link rel="alternate" hreflang="x-default" href="https://kwamebrathwaite.com/works" />
```

**Localized Sitemap:** Auto-generated with all locale variants.

---

## 6. ADMIN PANEL SPECIFICATION

### 6.1 Authentication

- Supabase Auth with email/password
- Protected by middleware checking session
- Session stored in HTTP-only cookie
- Auto-redirect to login if unauthenticated

### 6.2 Dashboard Features

**Statistics Cards:**
- Total artworks (published/draft)
- Total exhibitions
- Pending inquiries (new status)
- Newsletter subscribers

**Recent Activity Feed:**
- Last 10 actions from activity_log
- Links to relevant items

**Quick Actions:**
- Add new artwork
- Add new exhibition
- View pending inquiries

### 6.3 Artworks Management

**List View:**
- Sortable table (title, year, status, availability)
- Filter by category, series, status, availability
- Search by title
- Bulk actions: publish, unpublish, delete
- Drag-drop reorder

**Create/Edit Form:**
| Field | Type | Required |
|-------|------|----------|
| title | Text | Yes |
| year | Number | No |
| medium | Text | No |
| dimensions | Text | No |
| description | Rich text | No |
| image | Image upload | Yes |
| thumbnail | Auto-generated | - |
| category | Select | No |
| series | Text/Select | No |
| availability_status | Select | Yes |
| is_featured | Checkbox | No |
| related_artwork_ids | Artwork picker (max 3) | No |
| status | Select | Yes |
| meta_title | Text | No |
| meta_description | Textarea | No |

### 6.4 Exhibitions Management

**List View:**
- Table with title, venue, dates, type, status
- Filter by type, status
- Search by title/venue

**Create/Edit Form:**
| Field | Type | Required |
|-------|------|----------|
| title | Text | Yes |
| venue | Text | No |
| street_address | Text | No |
| city | Text | No |
| state_region | Text | No |
| postal_code | Text | No |
| country | Text | No |
| Address lookup button | Geocoding | - |
| location_lat | Number (auto) | No |
| location_lng | Number (auto) | No |
| start_date | Date | No |
| end_date | Date | No |
| description | Rich text | No |
| image | Image upload | No |
| exhibition_type | Select | Yes |
| venue_url | URL | No |
| linked_artworks | Artwork picker | No |
| status | Select | Yes |
| meta_title | Text | No |
| meta_description | Textarea | No |

### 6.5 Press Management

**List View:**
- Table with title, publication, date, type, status
- Filter by type, featured, status
- Search by title/publication

**Create/Edit Form:**
| Field | Type | Required |
|-------|------|----------|
| title | Text | Yes |
| publication | Text | No |
| author | Text | No |
| publish_date | Date | No |
| url | URL | No |
| excerpt | Textarea | No |
| image | Image upload | No |
| press_type | Select | No |
| is_featured | Checkbox | No |
| status | Select | Yes |

### 6.6 Inquiries Management

**List View:**
- Table with name, email, type, status, date
- Filter by type, status
- Color-coded status badges

**Detail View:**
- Full inquiry details
- Linked artwork (if applicable)
- Status update dropdown
- Admin notes textarea
- Mark as responded button

### 6.7 Site Content Management

**Sections Editor:**
- List of all page/section combinations
- Rich text editor (TipTap) for each section
- Preview capability
- Auto-save draft

### 6.8 Newsletter Management

**Subscriber List:**
- Table with email, locale, subscribed date
- Search by email
- Export to CSV button
- Delete individual subscribers

### 6.9 Media Library

**Features:**
- Grid view of all uploaded images
- Filter by bucket
- Upload new images (drag-drop)
- Copy URL to clipboard
- Delete unused images
- Image preview modal

---

## 7. SECURITY

### 7.1 Authentication & Authorization

**Admin Panel:**
- Supabase Auth with email/password
- Row Level Security (RLS) policies
- Protected API routes via middleware
- Session validation on every request

**Public Site:**
- No authentication required
- Rate limiting on form submissions

### 7.2 Form Security

**Spam Protection:**
- Honeypot field (hidden input)
- Rate limiting: 5 submissions per minute per IP
- Server-side validation

**Implementation:**
```typescript
// Honeypot field - bots fill this, humans don't see it
<input 
  type="text" 
  name="website" 
  style={{ display: 'none' }} 
  tabIndex={-1} 
  autoComplete="off"
/>

// Server check
if (body.website) {
  // Bot detected, silently reject
  return { success: true }; // Don't reveal detection
}
```

### 7.3 Data Protection

- All API keys in environment variables
- HTTPS enforced
- Input sanitization on all forms
- Prepared statements (SQL injection prevention)
- CSRF protection via SameSite cookies

### 7.4 Row Level Security (RLS)

```sql
-- Public can read published content
CREATE POLICY "Public read published artworks" ON artworks
  FOR SELECT USING (status = 'published');

-- Authenticated users can do everything
CREATE POLICY "Admin full access" ON artworks
  FOR ALL USING (auth.role() = 'authenticated');
```

---

## 8. PERFORMANCE

### 8.1 Image Optimization

- Next.js Image component for all images
- WebP format with JPEG fallback
- Responsive srcsets
- Lazy loading below fold
- Blur-up placeholders

**Image Sizes:**
| Type | Max Dimensions |
|------|----------------|
| Thumbnail | 400x400 |
| Medium | 1200x1200 |
| Large | 2400x2400 |

### 8.2 Caching Strategy

| Content | Cache Duration |
|---------|----------------|
| Static assets | 1 year |
| API responses | 5 minutes |
| Images | 1 month |
| Translations | Until content hash changes |

### 8.3 Performance Targets

- Lighthouse Score: 90+ all metrics
- First Contentful Paint: < 1.5s
- Largest Contentful Paint: < 2.5s
- Time to Interactive: < 3.5s
- Cumulative Layout Shift: < 0.1

---

## 9. SEO

### 9.1 Meta Tags

Every page includes:
- Title (page-specific)
- Description (page-specific)
- Open Graph tags (title, description, image, url)
- Twitter Card tags
- Canonical URL
- Hreflang tags

### 9.2 Structured Data

**Artwork Pages:**
```json
{
  "@context": "https://schema.org",
  "@type": "VisualArtwork",
  "name": "Artwork Title",
  "creator": {
    "@type": "Person",
    "name": "Kwame Brathwaite"
  },
  "dateCreated": "1965",
  "artMedium": "Photography",
  "image": "https://..."
}
```

**Exhibition Pages:**
```json
{
  "@context": "https://schema.org",
  "@type": "ExhibitionEvent",
  "name": "Exhibition Title",
  "startDate": "2024-01-15",
  "endDate": "2024-03-30",
  "location": {
    "@type": "Place",
    "name": "Venue Name",
    "address": "..."
  }
}
```

### 9.3 Sitemap

Auto-generated at `/sitemap.xml` including:
- All public pages
- All published artworks
- All published exhibitions
- All locale variants

---

## 10. DEPLOYMENT

### 10.1 Git Workflow

```
main (production)
└── staging (preview deployments)
    └── feature/* (development)
```

### 10.2 Vercel Configuration

- Automatic deployments on push to `main`
- Preview deployments for all PRs
- Environment variables in Vercel dashboard

### 10.3 Monitoring

- Vercel Analytics (page views, performance)
- Google Analytics 4 (user behavior)
- Error tracking via console/Vercel logs

---

## 11. TESTING

### 11.1 Testing Strategy

| Type | Tool | Coverage |
|------|------|----------|
| Unit | Jest + RTL | Components, utilities |
| Integration | Playwright | User flows |
| Manual | Checklist | Cross-browser, accessibility |

### 11.2 Manual Testing Checklist

**Browsers:**
- Chrome, Firefox, Safari, Edge (latest 2 versions)
- iOS Safari, Chrome Mobile

**Devices:**
- Desktop: 1920x1080, 1366x768
- Tablet: iPad, iPad Pro
- Mobile: iPhone 12+, Galaxy S21+

**Accessibility:**
- Keyboard navigation
- Screen reader (NVDA, VoiceOver)
- Color contrast (WCAG AA)
- Focus indicators

---

## 12. APPENDIX

### A. Content Sections Reference

| page | section | Description |
|------|---------|-------------|
| home | hero_title | "Kwame Brathwaite Photo Archive" |
| home | hero_subtitle | "Style. Culture. Self-Definition." |
| home | intro | Homepage introduction paragraph |
| about | biography | Full biography |
| about | movement | Black is Beautiful movement history |
| about | timeline | JSON array of timeline events |
| archive | mission | Archive mission statement |
| archive | description | Archive description |
| contact | intro | Contact page introduction |

### B. Status Values Reference

**Content Status:**
- `draft` - Not visible to public
- `published` - Visible to public
- `archived` - Hidden, preserved for records

**Artwork Availability:**
- `available` - For sale/inquiry
- `sold` - No longer available
- `on_loan` - Temporarily unavailable
- `not_for_sale` - Part of permanent collection
- `inquiry_only` - Price on request

**Inquiry Status:**
- `new` - Unread
- `read` - Viewed by admin
- `responded` - Reply sent
- `archived` - Closed/completed

### C. Activity Log Actions

- `create` - New record created
- `update` - Record modified
- `delete` - Record removed
- `status_change` - Status field changed
- `reorder` - Display order changed

---

**Document Control**  
Version: 2.0  
Last Updated: January 17, 2026  
Status: Ready for Development  
Supersedes: TECHNICAL_SPEC.md, multilingual-addendum.md
