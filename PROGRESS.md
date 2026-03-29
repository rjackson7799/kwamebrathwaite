# Project Progress Tracker
## Kwame Brathwaite Archive Website

**Last Updated:** March 29, 2026 (SEO Auto-Generate & Press Detail Pages)

---

## SEO & Accessibility Auto-Generate (March 2026)

### Completed
- [x] Added focused "Auto-generate" button in SEO & Accessibility card of artwork edit form
  - Generates only `seo_title`, `alt_text`, `meta_title`, `meta_description` — never overwrites descriptions
  - Uses existing hand-written description as context for higher quality SEO output
  - GPT-4o Vision with `detail: 'low'` (cheaper since description provides context)
  - DeepL translations to French and Japanese with caching
  - Files created:
    - `components/admin/SEOGenerateButton.tsx` — Compact button with loading/error states
    - `app/api/admin/artworks/[id]/generate-seo/route.ts` — POST endpoint (auth-protected)
  - Files modified:
    - `lib/ai/prompts.ts` — Added `SEO_SYSTEM_PROMPT` + `buildSEOUserPrompt()`
    - `lib/ai/types.ts` — Added `GeneratedSEOContent`, `TranslatedSEOContent`, `SEOGenerationResult`, `SEOGenerationOptions`
    - `lib/ai/description-generator.ts` — Added `generateArtworkSEO()` function
    - `lib/ai/translation-service.ts` — Added `translateSEOContent()` for meta_title/meta_description
    - `lib/ai/index.ts` — New exports
    - `components/admin/ArtworkForm.tsx` — Integrated button in SEO card header

---

## Press Detail Pages (March 2026)

### Completed
- [x] Added individual press article detail pages
  - `app/[locale]/press/[id]/page.tsx` — Route with server-side data fetching
  - `components/features/press/PressDetail.tsx` — Full article layout
  - PressCard now links to detail pages instead of opening external URLs
  - Added i18n keys for press detail page (en, fr, ja)

---

## Exhibition Data Seed (March 2026)

### Completed
- [x] Parsed `docs/events.md` (2026 Exhibit Schedule) into SQL insert statements
  - Created `docs/seed_exhibitions.sql` with all 18 exhibitions
  - 1 past, 8 current, 9 upcoming (based on today's date 2026-03-28)
  - Includes slug, title, venue, city, state/region, country, dates, exhibition_type, venue_url, display_order
  - Duplicate show titles (Disco, Sunday Best, Bold & Brilliant) get city-suffixed slugs for uniqueness
  - Clears `exhibition_artworks` and `exhibitions` tables before inserting (safe re-run)
  - Successfully run against production Supabase database

---

## Multi-lingual Content Translation Fix (March 2026)

### Completed
- [x] Fixed untranslated body content on Archive, About, and Press pages for French and Japanese locales
  - Page titles/nav already translated via next-intl; body content from Supabase CMS and press items remained in English
  - **Translation service extended** (`lib/ai/translation-service.ts`):
    - Added `translatePageContent()` export — locale-aware wrapper using DeepL API with HTML tag preservation
    - Generalized cache params to support any source table (was hardcoded to `artworks`)
    - Added `tag_handling: 'html'` support for DeepL to preserve HTML markup
  - **Archive page** (`app/[locale]/archive/page.tsx`):
    - Now accepts locale param and translates CMS content (mission + description) via DeepL before rendering
  - **About page** (`app/[locale]/about/page.tsx`):
    - Translates CMS content (biography + movement) via DeepL
    - Replaced hardcoded English timeline events with next-intl `t()` calls
  - **Press page** (`app/[locale]/press/page.tsx`):
    - Translates press item `title` and `excerpt` server-side (author/publication names left untranslated as proper nouns)
  - **Message files** (`messages/en.json`, `fr.json`, `ja.json`):
    - Added all 7 timeline events with translated title and description for each locale
  - All translations cached in `translation_cache` table; English locale has zero overhead
  - Cache uses MD5 hash of source content — editing English content auto-triggers re-translation

---

## Press Reorder Feature (March 2026)

### Completed
- [x] Added drag-and-drop reorder functionality for press items (mirrors artworks reorder)
  - Admin can reorder press items via Admin > Press > Reorder button
  - Drag-and-drop UI with auto-save using `@hello-pangea/dnd`
  - Filter tabs: "All" vs "Featured Only" for independent reordering
  - Featured star toggle to mark/unmark press items as featured
  - Public press page now sorts by: featured first → display_order → publish_date → created_at
  - Files created:
    - `app/api/admin/press/reorder/route.ts` — PUT endpoint for bulk reorder (updates `display_order`)
    - `components/admin/PressReorderList.tsx` — Drag-and-drop reorder component
    - `app/admin/press/reorder/page.tsx` — Reorder page with loading/error states
  - Files modified:
    - `app/admin/press/page.tsx` — Added "Reorder" button next to "Add Press"
    - `app/[locale]/press/page.tsx` — Updated sort order to respect `display_order`
  - Reuses existing `adminReorderSchema` validation and `display_order` DB column/index
- [x] Rich text editor HTML source view toggle
  - Added `</>` toolbar button to switch between WYSIWYG and raw HTML editing
  - Useful for fixing formatting issues or pasting pre-formatted HTML
  - File modified: `components/admin/RichTextEditor.tsx`
- [x] Modern thin scrollbar styling
  - Global 6px translucent scrollbar replacing browser default (~15px)
  - Rounded thumb, invisible track, dark mode support
  - File modified: `app/globals.css`

---

## Archive Page CMS Integration (March 2026)

### Completed
- [x] Connected Archive page to Supabase `site_content` table
  - Fetches `mission` and `description` sections via `getPageContent()`
  - Renders CMS HTML content with `dangerouslySetInnerHTML` (same pattern as About page)
  - Two-column layout: rich HTML content on left, sticky image on right
  - Image URL configurable via `page_settings` metadata (`image_url` field)
  - Defaults to existing portrait photo if no image URL is set
  - Admin can edit content via Admin > Content > Archive tab (already existed)
  - Admin can set archive image via Admin > Page Settings > Archive row (new)
  - Files modified:
    - `app/[locale]/archive/page.tsx` — Replaced skeleton loaders with CMS content, two-column layout with image
    - `app/admin/page-settings/page.tsx` — Added image URL input for archive page

---

## Content Font Size Adjuster (March 2026)

### Completed
- [x] Admin-controlled content font size adjuster in Page Settings
  - Global setting with three presets: Small (87.5%), Default (100%), Large (112.5%)
  - Segmented button control in admin Page Settings panel
  - Uses CSS custom property `--content-font-scale` on `<main>` element
  - Applies to all public pages across all languages (en, fr, ja)
  - Scoped to content text only — header, footer, admin panel unaffected
  - Artwork wall label metadata (13px) intentionally stays fixed
  - Stored in `page_settings` table via `_global` row metadata JSONB
  - No schema migration needed — uses existing `metadata` column
  - Files modified:
    - `lib/page-settings.ts` — Added `getContentFontScale()` helper
    - `app/admin/page-settings/page.tsx` — Added font size segmented control
    - `app/[locale]/layout.tsx` — Reads setting, sets CSS variable on `<main>`
    - `app/globals.css` — CSS rules using `--content-font-scale`
    - `docs/DATABASE_SCHEMA.sql` — Added `_global` seed row
  - DB setup: `INSERT INTO page_settings (page_slug, show_title, metadata) VALUES ('_global', true, '{"content_font_scale": "default"}')`

---

## AI Press Article Summarizer (March 2026)

### Completed
- [x] AI-powered URL summarization for press articles
  - Admin pastes article URL, clicks "Generate Summary" to auto-fill form fields
  - Fetches article HTML server-side, parses with `cheerio` for metadata + content
  - Extracts: title, author, publication name, publish date (from OG/meta tags)
  - Sends clean article text to GPT-4o for summary generation
  - Configurable word count: 50-600 words (default 100)
  - Auto-fills excerpt (always), plus title/author/publication/date (only if empty)
  - Cost: ~$0.01-0.03 per summarization
  - Files created:
    - `lib/ai/press-summarizer.ts` — URL fetching, cheerio parsing, GPT-4o summarization
    - `app/api/admin/press/summarize-url/route.ts` — Authenticated POST endpoint
  - Files modified:
    - `components/admin/PressForm.tsx` — Added Generate Summary button + word count input
    - `lib/ai/types.ts` — Added `PressSummaryResult` interface
    - `lib/ai/prompts.ts` — Added press summary system prompt
    - `lib/ai/index.ts` — Added exports
    - `lib/api/validation.ts` — Added `pressSummarizeUrlSchema`
  - New dependency: `cheerio` (HTML parser)
  - Design spec: `docs/superpowers/specs/2026-03-28-press-url-summarizer-design.md`

---

## Artwork Form Field Updates (March 2026)

### Completed
- [x] Split single Dimensions field into two: Dimensions (in) and Dimensions (cm)
  - DB column `dimensions_cm` already existed, now exposed in form
- [x] Removed Category dropdown from the artwork form
  - Category field kept in validation schema for backwards compatibility
- [x] Added Edition field (e.g., `#1/5 (Ed. 5 + 2AP)`)
  - DB column `edition` already existed, now exposed in form
- [x] Added Unique ID field (e.g., `AJASS_Loc_59_001`)
  - Maps to `archive_reference` DB column, already existed
- Files modified: `components/admin/ArtworkForm.tsx`, `lib/api/validation.ts`

---

## About Page Section Visibility Toggles (March 2026)

### Completed
- [x] Added admin toggles to show/hide Timeline and Movement sections on the About page
  - Uses existing `page_settings.metadata` JSONB column — no DB migration needed
  - Added `getSectionVisibility()` helper in `lib/page-settings.ts`
  - Extended PUT `/api/admin/page-settings` to accept `metadata` field
  - Added "Section Visibility" sub-row in `/admin/page-settings` for the About page
  - About page conditionally renders Timeline and Movement based on toggle state
  - Both default to hidden (off) since content isn't ready yet

---

## View on Wall Refinements (March 2026)

### Completed
- [x] Removed side background/padding on artwork in View on Wall modal
  - Replaced explicit `height` with `aspect-ratio` so container always matches image proportions
  - Changed `object-contain` to `object-cover` to eliminate letterboxing
  - File: `components/ui/ViewOnWallModal.tsx`
- [x] Fixed View on Wall aspect ratio using image's natural dimensions
  - Container shape was derived from physical print dimensions (e.g. "20 × 24 inches" ≈ square), causing landscape photos to appear nearly square
  - Now detects the image's intrinsic aspect ratio via `new Image()` on load
  - Physical dimensions still control wall-relative scale; image ratio controls shape
  - Changed image fit back to `object-contain` to prevent cropping
  - File: `components/ui/ViewOnWallModal.tsx`

---

## Museum Aesthetic Overhaul (March 2026)

### Completed
- [x] Created `docs/BRAND_BRIEF.md` — visual reference document for museum gallery aesthetic
- [x] Added Tailwind tokens: `page-title`, `section-title`, `gray-heading`, `gray-body`, `gray-meta`, `gray-cta`
- [x] Added CSS utility classes: `.page-title-museum`, `.section-title-museum`, `.cta-museum`
- [x] Added `page_settings` database table with per-page `show_title` toggle
- [x] Created `PageTitle` component with conditional visibility
- [x] Created API routes: `/api/admin/page-settings` (admin CRUD), `/api/page-settings/[slug]` (public read)
- [x] Created `lib/page-settings.ts` helper (`getShowTitle`, `getPageSettings`)
- [x] Updated all 8 public page H1s to use museum heading style + PageTitle component
- [x] Simplified Footer: lighter newsletter styling, minimal copyright line, muted links
- [x] Redesigned PressCard: removed gold accent, borders, excerpts, "Read article" CTA; added uppercase titles, mixed image/text-only layout
- [x] Changed Press page grid from 3-column to 4-column
- [x] Simplified ArtworkDetail: stacked metadata without labels, text-only CTAs, removed availability badge
- [x] Updated About page: section-title-museum for H2s, generous line-height, muted body text
- [x] Full heading consistency audit across all public pages (March 28, 2026)
  - [x] Homepage: "Featured Works" and "Featured Exhibitions" h2s → `section-title-museum`
  - [x] Archive page: "Mission" h2 → `section-title-museum`
  - [x] Exhibition detail: h1 → `page-title-museum`, "About Exhibition" h2 → `section-title-museum`
  - [x] Exhibition detail page: "Featured Works" h2 → `section-title-museum`
  - [x] Artwork detail page: "Related Works" h2 → `section-title-museum`
  - [x] Licensing page: "How It Works" and "License Types" h2s → `section-title-museum`
  - [x] LicenseRequestForm: h1 → `page-title-museum`, success h2 → `section-title-museum`
  - [x] Timeline: decade h3s → `section-title-museum`
- [x] Created Admin Page Settings UI with toggle switches
- [x] Added "Page Settings" to admin sidebar navigation
- [x] Updated `DESIGN_SYSTEM.md` with museum heading typography specs

---

## Phase 1: Foundation & Core Infrastructure

### Completed
- [x] Next.js 14 project initialization (App Router)
- [x] TypeScript configuration
- [x] Tailwind CSS with design tokens from DESIGN_SYSTEM.md
- [x] next-intl configuration for i18n (en, fr, ja)
- [x] Folder structure per TECHNICAL_SPEC_v2.md
- [x] Supabase client setup (client.ts, server.ts)
- [x] TypeScript types for database tables
- [x] Base app layout with fonts
- [x] Locale-aware layout wrapper
- [x] Global CSS with component classes
- [x] Environment variables template
- [x] Header component (sticky, text logo, desktop nav, mobile hamburger)
- [x] Footer component (3-column layout, newsletter form, Instagram icon)
- [x] Mobile navigation (slide-in drawer from right)
- [x] LanguageSwitcher component (locale-preserving dropdown)

---

## Phase 2: Public Pages & Components

### Completed
- [x] Homepage with ArtworkGrid and ExhibitionCards
- [x] Works page with gallery grid, filters, and lightbox
- [x] Exhibitions page with tab filtering
- [x] Press page with press cards
- [x] About page structure (placeholder content)
- [x] About page CMS integration
  - [x] Biography section fetches from `/api/content/about/biography`
  - [x] Movement section fetches from `/api/content/about/movement`
  - [x] Server-side rendering with 60-second revalidation
- [x] Archive page structure (placeholder content)
- [x] Contact page with form
- [x] Privacy policy page
- [x] Terms of use page

### UI Components Completed
- [x] ImagePlaceholder component (`components/ui/ImagePlaceholder.tsx`)
- [x] Lightbox component (`components/ui/Lightbox.tsx`) - Full accessibility
- [x] ViewOnWallModal component (`components/ui/ViewOnWallModal.tsx`) - Artwork visualization
- [x] ArtworkCard component (`components/features/artworks/ArtworkCard.tsx`)
- [x] ArtworkGrid component (`components/features/artworks/ArtworkGrid.tsx`)
- [x] ExhibitionCard component (`components/features/exhibitions/ExhibitionCard.tsx`)
- [x] PressCard component (`components/features/press/PressCard.tsx`)

### Completed (Detail Pages)
- [x] Artwork detail page (`app/[locale]/works/[id]/page.tsx`)
  - [x] ArtworkDetail component with lightbox integration
  - [x] Schema.org VisualArtwork structured data
  - [x] SEO metadata (generateMetadata)
  - [x] Related artworks section
  - [x] ISR with 1-hour revalidation

### Completed (Detail Pages)
- [x] Exhibition detail page (`app/[locale]/exhibitions/[id]/page.tsx`)
  - [x] ExhibitionDetail component with lightbox integration
  - [x] Schema.org ExhibitionEvent structured data
  - [x] SEO metadata (generateMetadata)
  - [x] Featured artworks section
  - [x] ISR with 1-hour revalidation
  - [x] Translation keys for en, fr, ja

### Completed (Search)
- [x] Search functionality
  - [x] useDebounce hook (`lib/hooks/useDebounce.ts`)
  - [x] SearchBar component (`components/ui/SearchBar.tsx`)
  - [x] Search translations for en, fr, ja
  - [x] Filter pill CSS classes in globals.css
  - [x] Works page search + API integration with URL state
  - [x] Loading, empty, and error states

### Completed (Timeline)
- [x] Timeline component (`components/features/timeline/`)
  - [x] Timeline.tsx - Main container with filtering, decade grouping, animations
  - [x] TimelineItem.tsx - Individual event card with year badge, descriptions, images
  - [x] index.ts - Barrel exports
  - [x] Translation keys for en, fr, ja
  - [x] About page integration with sample career timeline data

### Completed (Newsletter)
- [x] Newsletter form submission handler
  - [x] Fixed Footer.tsx error handling (was incorrectly showing success on errors)
  - [x] Added error, alreadySubscribed, rateLimited translation keys (en, fr, ja)
  - [x] Proper handling of API responses including already-subscribed case
  - [x] Error/rate limit messages display in UI

### Completed (View on Wall Feature)
- [x] View on Wall visualization feature
  - [x] ViewOnWallModal component (`components/ui/ViewOnWallModal.tsx`)
    - Portal-based modal with focus trap and keyboard navigation
    - Room scene with CSS gradient backgrounds (white, gray, dark)
    - Artwork scaled to real-world proportions
    - Reference chair silhouette for scale comparison
    - Responsive design for mobile/tablet/desktop
  - [x] Dimension parsing utilities (`lib/utils/parseDimensions.ts`)
    - Parses "20 × 24 inches" and "50.8 × 61 cm" formats
    - Converts cm to inches for scale calculations
  - [x] Scale calculation utilities (`lib/utils/calculateArtworkScale.ts`)
    - Calculates pixel dimensions based on 8-foot wall height
    - Chair scale and artwork positioning helpers
  - [x] ArtworkDetail integration - "View on a Wall" button
  - [x] Translation keys for en, fr, ja
  - [x] CSS for artwork frame shadow effect

---

## Phase 3: API Routes

### Completed
- [x] Shared API utilities (`lib/api/`)
  - [x] `response.ts` - Standard response helpers (successResponse, errorResponse)
  - [x] `pagination.ts` - Pagination utilities
  - [x] `validation.ts` - Zod schemas for all endpoints
  - [x] `rate-limit.ts` - In-memory rate limiter
  - [x] `index.ts` - Re-exports
- [x] GET /api/artworks - List with pagination, filters (category, series, availability, year, q)
- [x] GET /api/artworks/:id - Single artwork detail
- [x] GET /api/artworks/featured - Featured artworks only
- [x] GET /api/exhibitions - List with type filter (past, current, upcoming)
- [x] GET /api/exhibitions/:id - Single exhibition with linked artworks
- [x] GET /api/exhibitions/current - Current and upcoming exhibitions
- [x] GET /api/press - List with type and featured filters
- [x] GET /api/press/:id - Single press item
- [x] GET /api/content/:page - All sections for a page
- [x] GET /api/content/:page/:section - Specific section content
- [x] POST /api/inquiries - Contact form (honeypot, rate limiting, Zod validation)
- [x] POST /api/newsletter/subscribe - Newsletter signup (rate limiting, duplicate handling)
- [x] POST /api/translate - Translation service with DeepL integration and caching

---

## Phase 4: Admin Panel

### Completed
- [x] Admin layout structure
- [x] Admin dashboard page (placeholder)
- [x] Admin authentication (Supabase Auth)
  - [x] Auth helpers (`lib/supabase/auth.ts`)
  - [x] Login API route (`app/api/admin/auth/login/route.ts`)
  - [x] Logout API route (`app/api/admin/auth/logout/route.ts`)
  - [x] Session API route (`app/api/admin/auth/session/route.ts`)
  - [x] Login page (`app/admin/login/page.tsx`)
- [x] Auth middleware protection (`middleware.ts` updated)
- [x] Admin shared components (`components/admin/`)
  - [x] AuthGuard - Route protection with redirect
  - [x] AdminSidebar - Navigation with icons
  - [x] AdminHeader - User info and logout
  - [x] DataTable - Sortable/filterable table with pagination
  - [x] StatusBadge - Color-coded badges
  - [x] ConfirmDialog - Delete confirmation modal
  - [x] FormField - Label + Input/Textarea/Select/Checkbox
  - [x] PageHeader - Title with breadcrumbs
  - [x] ImageUploader - Drag-drop to Supabase Storage
  - [x] RichTextEditor - TipTap wrapper
  - [x] ArtworkPicker - Searchable artwork multi-select
  - [x] ArtworkForm - Complete artwork form
- [x] Admin API utilities (`lib/api/admin.ts`)
- [x] Artworks CRUD pages
  - [x] API routes (`app/api/admin/artworks/`)
  - [x] List page (`app/admin/artworks/page.tsx`)
  - [x] Create page (`app/admin/artworks/new/page.tsx`)
  - [x] Edit page (`app/admin/artworks/[id]/edit/page.tsx`)

### Completed (Phase 4b)
- [x] Exhibitions CRUD pages
  - [x] API routes (`app/api/admin/exhibitions/`)
  - [x] List page (`app/admin/exhibitions/page.tsx`)
  - [x] Create page (`app/admin/exhibitions/new/page.tsx`)
  - [x] Edit page (`app/admin/exhibitions/[id]/edit/page.tsx`)
  - [x] ExhibitionForm component (`components/admin/ExhibitionForm.tsx`)
  - [x] Artwork linking API (`app/api/admin/exhibitions/[id]/artworks/route.ts`)
  - [x] Validation schemas in `lib/api/validation.ts`
  - [x] StatusBadge updated for exhibition types

### Completed (Phase 4c)
- [x] Press CRUD pages
  - [x] API routes (`app/api/admin/press/route.ts`, `app/api/admin/press/[id]/route.ts`)
  - [x] List page (`app/admin/press/page.tsx`)
  - [x] Create page (`app/admin/press/new/page.tsx`)
  - [x] Edit page (`app/admin/press/[id]/edit/page.tsx`)
  - [x] PressForm component (`components/admin/PressForm.tsx`)
  - [x] Validation schemas (`adminPressSchema`, `adminPressFiltersSchema`)

### Completed (Phase 4d)
- [x] Inquiries management
  - [x] API routes (`app/api/admin/inquiries/route.ts`, `app/api/admin/inquiries/[id]/route.ts`)
  - [x] List page with filtering (`app/admin/inquiries/page.tsx`)
  - [x] Detail/edit page (`app/admin/inquiries/[id]/page.tsx`)
  - [x] Validation schemas (`adminInquiryFiltersSchema`, `adminInquiryUpdateSchema`)
  - [x] StatusBadge updated for inquiry types (general, purchase, exhibition, press)
  - [x] DataTable ActionButtons updated with View icon support
  - [x] Features: status filtering, type filtering, search, admin notes, "Mark as Responded"

### Completed (Phase 4e)
- [x] Newsletter subscribers management
  - [x] API routes (`app/api/admin/newsletter/`)
  - [x] List page with filtering (`app/admin/newsletter/page.tsx`)
  - [x] CSV export functionality (`app/api/admin/newsletter/export/route.ts`)
  - [x] Delete subscriber with confirmation
  - [x] Validation schemas (`adminNewsletterFiltersSchema`)
  - [x] StatusBadge updated for locale badges (en, fr, ja)

### Completed (Phase 4f)
- [x] Site content editor
  - [x] Admin content page with tabbed interface (`app/admin/content/page.tsx`)
  - [x] Support for text, html, and json content types
  - [x] ContentSectionCard component enhanced for multiple content types
  - [x] JSON validation and formatting
  - [x] Uses existing API routes (`/api/admin/content`)

### Completed (Phase 4g)
- [x] Media library
  - [x] API routes (`app/api/admin/media/route.ts`)
    - [x] GET - List files from all storage buckets with search and pagination
    - [x] DELETE - Remove files from storage with activity logging
  - [x] Admin media page (`app/admin/media/page.tsx`)
    - [x] Bucket tabs (All, Artworks, Thumbnails, Exhibitions, Press)
    - [x] File grid with image previews
    - [x] Search by filename
    - [x] Copy URL to clipboard
    - [x] Delete with confirmation
    - [x] Upload modal with bucket selection and drag-drop
    - [x] Pagination
  - [x] Updated EntityType to include 'media' for activity logging

### Completed (Phase 4h)
- [x] Activity log view
  - [x] Validation schema (`lib/api/validation.ts` - `adminActivityFiltersSchema`)
  - [x] API routes (`app/api/admin/activity/`)
    - [x] GET - List activity logs with filters and pagination
    - [x] GET /users - Get unique user emails for filter dropdown
  - [x] Admin activity page (`app/admin/activity/page.tsx`)
    - [x] Filter by action type, entity type, user
    - [x] Search by entity title
    - [x] Activity cards with expandable changes
    - [x] Links to related entities
    - [x] Pagination
  - [x] StatusBadge updated for action types (create, update, delete, status_change, reorder)

---

## Phase 5: Polish & Optimization

### Completed
- [x] SEO meta tags
  - [x] Created `app/robots.ts` for robots.txt generation
  - [x] Created `app/sitemap.ts` for dynamic multi-locale sitemap
  - [x] Created `app/[locale]/works/layout.tsx` with metadata
  - [x] Created `app/[locale]/exhibitions/layout.tsx` with metadata
  - [x] Enhanced homepage metadata with OpenGraph, canonical, alternates
  - [x] Enhanced press, about, contact, archive pages with full metadata
  - [x] Added meta translation keys (metaTitle, metaDescription) to all locales
- [x] Schema.org structured data
  - [x] Created `components/seo/JsonLd.tsx` with reusable components
  - [x] Added Organization and WebSite schema to root layout
  - [x] Person and Breadcrumb schemas available for use
- [x] Sitemap generation
  - [x] Dynamic sitemap with all locales (en, fr, ja)
  - [x] Static pages and dynamic content (artworks, exhibitions)
  - [x] Proper hreflang alternates
- [x] Image optimization
  - [x] Installed Sharp for production optimization
  - [x] Configured AVIF and WebP formats in next.config.mjs
  - [x] Optimized device sizes and image sizes
- [x] Accessibility (WCAG AA)
  - [x] Added skip-to-main-content link with translations
  - [x] Added skip-link CSS styles
  - [x] Added `id="main-content"` to main element
- [x] Performance optimization
  - [x] Added preconnect hints for Google Fonts

### Completed (Navigation Styling Update)
- [x] Navigation typography update (11px, uppercase, 0.08em spacing)
- [x] Language switcher globe icon (lucide-react)
- [x] Language switcher dropdown styling (locale code + full name)
- [x] Mobile navigation typography (14px, uppercase, 44px touch targets)
- [x] Build verification passed

### Remaining (Manual Testing)
- [ ] Performance audit (Lighthouse 90+) - run manually
- [ ] Cross-browser testing (manual spot-check)

---

## Phase 6: Hero Slides Feature

### Completed (Hero Slides)
- [x] @hello-pangea/dnd package installed for drag-drop
- [x] TypeScript types for hero_slides table (`lib/supabase/types.ts`)
- [x] Validation schemas for hero API (`lib/api/validation.ts`)
- [x] Data fetching functions (`lib/hero.ts`)
- [x] Public API route `/api/hero`
- [x] Admin CRUD API routes `/api/admin/hero/*`
- [x] HeroRotator component (`components/HeroRotator.tsx`)
- [x] HeroSlideForm component (`components/admin/HeroSlideForm.tsx`)
- [x] HeroSlideList component with drag-drop (`components/admin/HeroSlideList.tsx`)
- [x] Admin hero pages (list, new, edit)
- [x] Admin sidebar updated with Hero Slides navigation
- [x] ImageUploader extended to support 'hero' bucket
- [x] Custom CSS for opacity slider (`app/globals.css`)
- [x] Homepage integration with HeroRotator
- [x] Hero rotator auto-rotation fix
  - [x] Added `hasInteracted` state to prevent pause on initial page load
  - [x] Auto-rotation now starts immediately regardless of mouse position
  - [x] Hover-to-pause still works after first user interaction

### Requires Manual Setup in Supabase
- [ ] Create `hero` storage bucket (public, with RLS policies)
- [ ] Run `hero_slides` table SQL (see `docs/HERO_SLIDES_FEATURE.md`)

---

## Phase 7: Artwork Detail Page Enhancement

### Completed (Agent 1 Work)
- [x] Updated Supabase types (`lib/supabase/types.ts`)
  - [x] Added `edition`, `archive_reference`, `dimensions_cm` fields to artworks
  - [x] Added `artwork_literature` table type for citations
- [x] Created adjacent artworks API (`app/api/artworks/[id]/adjacent/route.ts`)
  - [x] Returns previous/next artworks with filter context
- [x] Enhanced artwork detail page (`app/[locale]/works/[id]/page.tsx`)
  - [x] Now uses real Supabase data instead of sample data
  - [x] Fetches literature citations
  - [x] Fetches related artworks
  - [x] Full SEO metadata with OpenGraph and Twitter cards
  - [x] Schema.org VisualArtwork structured data
- [x] Created ShareButton component (`components/features/artworks/ShareButton.tsx`)
  - [x] Copy link to clipboard with toast feedback
  - [x] Email share via mailto:
  - [x] Social sharing (X/Twitter, Facebook)
  - [x] Dropdown menu with accessibility
- [x] Created ArtworkInquiryModal component (`components/features/artworks/ArtworkInquiryModal.tsx`)
  - [x] Artwork preview in header
  - [x] Form: name, email, phone, inquiry type, message
  - [x] react-hook-form + Zod validation
  - [x] Honeypot spam protection
  - [x] Success/error states
  - [x] Submits to existing /api/inquiries endpoint
- [x] Enhanced ArtworkDetail component (`components/features/artworks/ArtworkDetail.tsx`)
  - [x] 60/40 desktop layout per TYPOGRAPHY_SYSTEM.md
  - [x] Typography per TYPOGRAPHY_SYSTEM.md (11px labels, 14px values, 18px title)
  - [x] New metadata fields: edition, archive_reference, dimensions_cm
  - [x] Literature citations section
  - [x] ShareButton integration
  - [x] ArtworkInquiryModal integration (replaces link to contact page)
  - [x] "View on Wall" button placeholder (disabled, for Agent 2)
- [x] Updated gallery page (`app/[locale]/works/page.tsx`)
  - [x] Clicking artwork navigates to detail page (was opening lightbox)
  - [x] Removed lightbox code
- [x] Updated translation files
  - [x] Added new keys: edition, archiveReference, literature, viewOnWall, shareLink, shareLinkCopied, viewFullPage, inquiry.title/submit/success/error (en, fr, ja)
- [x] Updated component exports (`components/features/artworks/index.ts`)

### Requires Manual Setup in Supabase
- [ ] Run SQL to add new columns: `ALTER TABLE artworks ADD COLUMN edition VARCHAR(100), archive_reference VARCHAR(100), dimensions_cm VARCHAR(100)`
- [ ] Run SQL to create `artwork_literature` table (see `docs/ARTWORK_DETAIL_PAGE_BRIEF.md`)

### Integration Points
- [ ] Agent 2: View on Wall feature - button placeholder added, waiting for ViewOnWallModal implementation

---

## Phase 8: Featured Artworks Enhancement

### Completed
- [x] Home page dynamic featured artworks
  - [x] Removed hardcoded sample artworks array
  - [x] Created `lib/artworks.ts` with `getFeaturedArtworks()` helper
  - [x] Server-side fetching with `Promise.all()` for parallel data loading
  - [x] Conditional rendering (hides section if no featured artworks)
  - [x] Respects `display_order` field for sorting
- [x] Works page featured prioritization
  - [x] Updated `/api/artworks` to sort by `is_featured` first (descending)
  - [x] Featured artworks appear at top of Works page
  - [x] Secondary sort by `display_order`, then `created_at`
- [x] Admin artwork reordering
  - [x] Created `ArtworkReorderList` component (`components/admin/ArtworkReorderList.tsx`)
    - [x] Drag-and-drop reordering with `@hello-pangea/dnd`
    - [x] Filter tabs: "All" / "Featured Only"
    - [x] Inline featured toggle (star icon)
    - [x] Auto-save on reorder with loading indicator
    - [x] Error handling with automatic revert
  - [x] Created reorder page (`app/admin/artworks/reorder/page.tsx`)
  - [x] Added "Reorder" button to artworks list page header
  - [x] Exported component from `components/admin/index.ts`

### How Featured Artworks Work
1. **Featured star in admin** - Marks artworks to appear on home page AND at top of Works page
2. **Home page** - Shows up to 8 featured artworks from database (respects display order)
3. **Works page** - Shows all published artworks with featured ones appearing first
4. **Reorder page** - Drag-and-drop to set display order, filter to featured-only for easier management

---

## Phase 9: Dark Mode (Public Site)

### Completed
- [x] **Infrastructure**
  - [x] Installed `next-themes` package
  - [x] Updated `tailwind.config.ts` with `darkMode: 'class'`
  - [x] Updated `app/globals.css` with comprehensive dark mode:
    - CSS variables for dark palette (`#121212` bg, `#F0F0F0` text, `#C9A870` gold, etc.)
    - Dark variants on all ~15 component classes (btn-primary, btn-secondary, btn-text, btn-gold, btn-gold-outline, filter-pill, filter-pill-active, input, input-error, input-success, label, helper-text, card, card-bordered, card-elevated, card-featured, section-divider, exhibition-label)
    - Dark skeleton shimmer, grain overlay adjustment
  - [x] Created `components/ui/ThemeProvider.tsx` (wraps next-themes)
  - [x] Created `components/ui/ThemeToggle.tsx` (sun/moon icon, hydration-safe)
  - [x] Updated `app/layout.tsx` with ThemeProvider and `suppressHydrationWarning`
  - [x] Updated `components/ui/index.ts` with new exports
  - [x] Added theme translation keys to en.json, fr.json, ja.json

- [x] **Layout Components**
  - [x] `components/layout/Header.tsx` — ThemeToggle in desktop + mobile utility zones, dark classes on header/logo/nav/hamburger
  - [x] `components/layout/MobileMenu.tsx` — dark panel bg, borders, close button, nav links
  - [x] `components/layout/LanguageSwitcher.tsx` — dark button, dropdown, items

- [x] **High-Impact Pages & Components**
  - [x] `app/[locale]/page.tsx` — dark contrast on charcoal exhibition section
  - [x] `components/features/artworks/ArtworkCard.tsx` — dark ring for photo framing, image bg, title
  - [x] `components/features/artworks/ArtworkGrid.tsx` — dark skeleton placeholders
  - [x] `components/features/artworks/ArtworkDetail.tsx` — back link, image bg, buttons, title, all metadata labels/values, literature, archive reference
  - [x] `components/features/artworks/ArtworkInquiryModal.tsx` — modal bg, header, borders, artwork preview, title, close button
  - [x] `components/features/artworks/ShareButton.tsx` — button border/text, dropdown bg/border, menu items
  - [x] `components/features/exhibitions/ExhibitionCard.tsx` — status badges, image bg, title
  - [x] `components/features/exhibitions/ExhibitionDetail.tsx` — back link, status badges, title, metadata, prose

- [x] **Remaining Pages & UI Components**
  - [x] `components/ui/SearchBar.tsx` — dark bg, focus, text, placeholder
  - [x] `components/ui/ImagePlaceholder.tsx` — dark bg
  - [x] `components/features/press/PressCard.tsx` — image bg, gold accent, title, link text
  - [x] `components/features/timeline/Timeline.tsx` — timeline lines, dots, filter buttons, decade headers
  - [x] `components/features/timeline/TimelineItem.tsx` — dot borders, card bg, title, image bg
  - [x] `components/features/exhibitions/ExhibitionsListPanel.tsx` — panel bg, borders, text, skeletons
  - [x] `components/features/exhibitions/ExhibitionsMobileSheet.tsx` — sheet bg, drag handle, borders, text
  - [x] `components/features/exhibitions/ViewToggle.tsx` — inactive state dark colors
  - [x] `components/features/exhibitions/GeographicFilters.tsx` — inactive filter dark colors
  - [x] `components/features/exhibitions/ReminderModal.tsx` — modal bg, form inputs, error states
  - [x] `components/features/exhibitions/AddToCalendarButton.tsx` — button border/hover
  - [x] `components/features/exhibitions/ShareButton.tsx` — button border/hover
  - [x] `components/features/licensing/LicenseRequestForm.tsx` — step indicators, artwork selection, license cards
  - [x] `app/[locale]/about/page.tsx` — prose, timeline border, movement section
  - [x] `app/[locale]/press/page.tsx` — heading text
  - [x] `app/[locale]/archive/page.tsx` — skeleton dark bg
  - [x] `app/[locale]/privacy/page.tsx` — prose dark:prose-invert
  - [x] `app/[locale]/terms/page.tsx` — prose dark:prose-invert
  - [x] `app/[locale]/licensing/page.tsx` — step circles, license card borders
  - [x] `app/[locale]/works/page.tsx` — skeleton loading, clear filters
  - [x] `app/[locale]/exhibitions/[slug]/page.tsx` — featured works border

- [x] **Build verification passed** — `npm run build` successful

### Files Intentionally NOT Modified
| File | Reason |
|------|--------|
| `components/layout/Footer.tsx` | Already `bg-black text-white` by design |
| `components/HeroRotator.tsx` | Full-bleed images with dark overlays |
| `components/ui/Lightbox.tsx` | Already `bg-black/95` |
| `components/ui/ViewOnWallModal.tsx` | Already `bg-black/90` |
| `components/features/exhibitions/MarkerInfoPopup.tsx` | Google Maps controls styling |
| All `app/admin/**` files | Admin stays light-only |

### Dark Mode Color Palette
| Token | Value | Usage |
|-------|-------|-------|
| Background primary | `#121212` | Body bg |
| Background elevated | `#1A1A1A` | Modals, panels, cards |
| Background surface | `#2A2A2A` | Inputs, placeholders, image containers |
| Text primary | `#F0F0F0` | Headings, body text |
| Text secondary | `#A0A0A0` | Captions, labels |
| Border primary | `#333333` | Card borders, dividers |
| Gold adaptive | `#C9A870` | Accents, featured badges |

### WCAG Contrast Compliance
- `#F0F0F0` on `#121212` = 17.3:1 (AAA)
- `#A0A0A0` on `#121212` = 7.7:1 (AA)
- `#C9A870` on `#121212` = ~4.5:1 (AA)

---

## Feature Wishlist

Ideas for future enhancements (not yet planned for implementation):

### Admin Panel
- [ ] **Light/Dark Mode Toggle** - Add theme switching for admin panel
  - Complexity: Moderate-High (~7-11 hours)
  - Requires: Theme context already in place, ~40 admin file updates
  - Notes: TipTap editor needs separate dark mode CSS

### Public Site
- *(Add ideas here)*

### Performance & Infrastructure
- *(Add ideas here)*

---

## Blockers / Questions

*None currently*

---

## Environment Setup Required

Before running the project, create `.env.local` with:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

See `.env.example` for full list.

---

## Database Setup Required

Run the SQL in `/docs/DATABASE_SCHEMA.sql` in your Supabase project's SQL editor.

---

## Notes for Next Session

1. ~~Build UI components (ArtworkCard, etc.)~~ ✓ COMPLETED
2. ~~Implement API routes for data fetching~~ ✓ COMPLETED (Phase 3)
3. ~~Create artwork detail page (`works/[id]`)~~ ✓ COMPLETED
4. ~~Create exhibition detail page (`exhibitions/[id]`)~~ ✓ COMPLETED
5. ~~Wire up public pages to use API routes (replace sample data)~~ ✓ PARTIALLY COMPLETE (Homepage artworks done, exhibitions still sample)
6. ~~Set up admin authentication~~ ✓ COMPLETED (Phase 4a)
7. ~~Implement Artworks CRUD pages~~ ✓ COMPLETED (Phase 4a)
8. ~~Implement remaining Phase 4 items~~ ✓ PHASE 4 COMPLETE!
9. ~~Phase 5: Polish & Optimization~~ ✓ PHASE 5 COMPLETE!
   - SEO meta tags, sitemap, robots.txt
   - Schema.org structured data
   - Image optimization (Sharp, AVIF/WebP)
   - Accessibility improvements (skip links)
   - Performance optimizations (preconnect hints)
10. Run Lighthouse audit and cross-browser testing (manual)

---

## Project File Structure

```
components/
├── ui/
│   ├── ImagePlaceholder.tsx
│   ├── Lightbox.tsx
│   ├── SearchBar.tsx
│   ├── ThemeProvider.tsx
│   ├── ThemeToggle.tsx
│   └── index.ts
├── features/
│   ├── artworks/
│   │   ├── ArtworkCard.tsx
│   │   ├── ArtworkDetail.tsx
│   │   ├── ArtworkGrid.tsx
│   │   ├── ArtworkInquiryModal.tsx
│   │   ├── ShareButton.tsx
│   │   └── index.ts
│   ├── exhibitions/
│   │   ├── ExhibitionCard.tsx
│   │   ├── ExhibitionDetail.tsx
│   │   └── index.ts
│   ├── press/
│   │   ├── PressCard.tsx
│   │   └── index.ts
│   └── timeline/
│       ├── Timeline.tsx
│       ├── TimelineItem.tsx
│       └── index.ts
├── layout/
│   ├── Header.tsx
│   ├── Footer.tsx
│   ├── MobileMenu.tsx
│   └── LanguageSwitcher.tsx
├── seo/
│   ├── JsonLd.tsx
│   └── index.ts
└── admin/
    ├── index.ts
    ├── AuthGuard.tsx
    ├── AdminSidebar.tsx
    ├── AdminHeader.tsx
    ├── DataTable.tsx
    ├── StatusBadge.tsx
    ├── ConfirmDialog.tsx
    ├── ContentSectionCard.tsx
    ├── FormField.tsx
    ├── PageHeader.tsx
    ├── ImageUploader.tsx
    ├── RichTextEditor.tsx
    ├── ArtworkPicker.tsx
    ├── ArtworkForm.tsx
    ├── ArtworkReorderList.tsx
    └── ExhibitionForm.tsx

lib/
├── ai/
│   ├── index.ts
│   ├── description-generator.ts
│   ├── press-summarizer.ts
│   ├── prompts.ts
│   ├── translation-service.ts
│   └── types.ts
├── api/
│   ├── index.ts
│   ├── response.ts
│   ├── pagination.ts
│   ├── validation.ts
│   ├── rate-limit.ts
│   └── admin.ts
├── hooks/
│   ├── useDebounce.ts
│   └── index.ts
├── artworks.ts
├── hero.ts
└── supabase/
    ├── client.ts
    ├── server.ts
    ├── types.ts
    └── auth.ts

app/api/
├── artworks/
│   ├── route.ts
│   ├── featured/route.ts
│   └── [id]/
│       ├── route.ts
│       └── adjacent/route.ts
├── exhibitions/
│   ├── route.ts
│   ├── current/route.ts
│   └── [id]/route.ts
├── press/
│   ├── route.ts
│   └── [id]/route.ts
├── content/
│   └── [page]/
│       ├── route.ts
│       └── [section]/route.ts
├── inquiries/route.ts
├── newsletter/subscribe/route.ts
├── translate/route.ts
├── health/route.ts
└── admin/
    ├── auth/
    │   ├── login/route.ts
    │   ├── logout/route.ts
    │   └── session/route.ts
    ├── artworks/
    │   ├── route.ts
    │   ├── [id]/route.ts
    │   └── reorder/route.ts
    ├── exhibitions/
    │   ├── route.ts
    │   └── [id]/
    │       ├── route.ts
    │       └── artworks/route.ts
    ├── activity/
    │   ├── route.ts
    │   └── users/route.ts
    ├── inquiries/
    │   ├── route.ts
    │   └── [id]/route.ts
    ├── media/
    │   └── route.ts
    ├── newsletter/
    │   ├── route.ts
    │   ├── export/route.ts
    │   └── [id]/route.ts
    └── press/
        ├── route.ts
        ├── [id]/route.ts
        └── summarize-url/route.ts

app/admin/
├── layout.tsx
├── page.tsx
├── login/page.tsx
├── activity/
│   └── page.tsx
├── artworks/
│   ├── page.tsx
│   ├── new/page.tsx
│   ├── reorder/page.tsx
│   └── [id]/edit/page.tsx
├── content/
│   └── page.tsx
├── exhibitions/
│   ├── page.tsx
│   ├── new/page.tsx
│   └── [id]/edit/page.tsx
├── inquiries/
│   ├── page.tsx
│   └── [id]/page.tsx
├── media/
│   └── page.tsx
├── newsletter/
│   └── page.tsx
└── press/
    ├── page.tsx
    ├── new/page.tsx
    └── [id]/edit/page.tsx
```
