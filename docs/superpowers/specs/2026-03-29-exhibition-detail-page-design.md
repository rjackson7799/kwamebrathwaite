# Exhibition Detail Page — Design Spec

**Date:** 2026-03-29
**Status:** Draft

## Context

The current exhibition detail page (`/exhibitions/[slug]`) is minimal — it shows a hero image, status badge, title, dates/venue in a definition list, description, and linked artworks. It lacks venue context, maps, press links, and actionable CTAs. The page needs to serve general public users discovering exhibitions they want to attend, providing rich informational content that is SEO-friendly and consistent with the site's museum-gallery aesthetic.

The live production site (kwamebrathwaite.com) has an even simpler version that only shows venue name, exhibition title, dates, and a few artwork thumbnails with no description or venue details.

## Design: 2-Column Editorial Layout

Matches the existing About / Archive page pattern: **62% content left column, 38% sticky right column**. No hero image — the exhibition metadata leads the page directly.

### Page Structure (Top to Bottom)

#### Back Navigation
- `← Exhibitions` link back to `/exhibitions`
- Gold gradient divider below (`.section-divider`)

#### Left Column (62%) — Content

1. **Exhibition Header**
   - Status badge (Current/Upcoming/Past) — gold/charcoal/gray, matching existing `ExhibitionDetail.tsx` styling
   - Venue name — `.section-title-museum` style (20px, light, uppercase, #999, 0.15em tracking)
   - Exhibition title — Playfair Display serif, 28px, font-weight 300
   - Date range — 13px, gold (#B8945F), uppercase, 0.08em tracking

2. **Exhibition Description**
   - Rich HTML from admin (parsed with `dangerouslySetInnerHTML`)
   - Prose styling: 15px, line-height 1.8, color `#C0C0C0` / `text-gray-body`
   - Gold gradient divider after

3. **Featured Works**
   - Section label: `.section-title-museum` — "Featured Works"
   - 3-column grid of artworks from `exhibition_artworks` junction table, sorted by `display_order`
   - Each artwork links to its detail page (`/works/[id]`)
   - Uses existing `ArtworkGrid` or individual artwork card components
   - Shows artwork title and year below each image
   - Gold gradient divider after

4. **Press Coverage**
   - Section label: `.section-title-museum` — "Press Coverage"
   - List of linked press articles, each showing:
     - Article title (white, 14px)
     - Publication name + date (gray, 12px)
     - Gold arrow `→` on right
   - Each links to the press detail page (`/press/[slug]`)
   - Only shows if exhibition has linked press articles

#### Right Column (38%) — Venue Card (Sticky, `top-24`)

1. **Embedded Google Map**
   - Interactive map centered on venue coordinates (`location_lat`, `location_lng`)
   - ~220px height
   - Grayscale styling matching existing map view
   - Reuses Google Maps API integration from `ExhibitionsMapView.tsx`

2. **Venue Details**
   - Section label: "Venue" (uppercase, 11px, #999)
   - Venue name (15px, white, medium weight)
   - AI-generated venue description (13px, #999, 1.6 line-height) — stored in new `venue_description` field
   - Full address (12px, #666)

3. **Action Buttons**
   - "Visit Venue Website →" — gold outline button (links to `venue_url`)
   - "Get Directions" — gray outline button (links to Google Maps directions URL)

4. **Quick Actions Row**
   - Calendar / Share / Remind buttons in a row
   - Reuses existing `AddToCalendarButton`, `ShareButton`, `ReminderModal` components

5. **Newsletter CTA**
   - Below the sticky card (within right column but outside sticky container so it scrolls naturally)
   - "Stay Updated" heading + "Subscribe to Newsletter" gold button
   - Scrolls to the existing newsletter form in the footer (avoids duplicating subscription logic)

#### Mobile Behavior
- Right column stacks below left column (same as About/Archive)
- Map goes full-width
- Action buttons go full-width
- Vertical order: exhibition header + description → featured works → press → venue card with map → newsletter CTA
- This keeps the content-first flow on mobile, with the venue/planning info as a natural follow-up

### SEO Enhancements
- Existing Schema.org `ExhibitionEvent` structured data is retained and enhanced with venue address
- Meta title: `{exhibition_title} at {venue} | Kwame Brathwaite`
- Meta description: Auto-generated from exhibition description (first 160 chars) or `meta_description` field
- All content visible in DOM (no tabs hiding content)
- Semantic HTML: `<article>`, `<aside>`, `<section>`, proper heading hierarchy

---

## Backend Changes

### Database: New Fields

**`exhibitions` table:**
- `venue_description TEXT` — AI-generated or manually written venue description

**New junction table: `exhibition_press`**
```sql
CREATE TABLE exhibition_press (
  exhibition_id UUID REFERENCES exhibitions(id) ON DELETE CASCADE,
  press_id UUID REFERENCES press(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  PRIMARY KEY (exhibition_id, press_id)
);

CREATE INDEX idx_exhibition_press_exhibition ON exhibition_press(exhibition_id);
CREATE INDEX idx_exhibition_press_press ON exhibition_press(press_id);

-- RLS policies matching exhibition_artworks pattern
ALTER TABLE exhibition_press ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view exhibition press links"
  ON exhibition_press FOR SELECT USING (true);
CREATE POLICY "Admin full access to exhibition press"
  ON exhibition_press FOR ALL USING (auth.role() = 'authenticated');
```

### API Changes

**`GET /api/exhibitions/[slug]`** — Add to the existing query:
- Include `venue_description` in the returned exhibition object
- Join `exhibition_press` → `press` table to return linked press articles (id, title, slug, publication, published_date)

**`POST /api/admin/exhibitions/[id]/press`** — New endpoint:
- Links press articles to an exhibition (same pattern as `/artworks` endpoint)
- Body: `{ pressIds: string[] }`

**`GET /api/admin/exhibitions/[id]/press`** — New endpoint:
- Returns press articles linked to an exhibition

**`POST /api/admin/exhibitions/generate-venue-description`** — New endpoint:
- Input: `{ venue_url: string, venue_name: string }`
- Fetches the venue URL, extracts relevant content
- Uses AI (via existing AI setup or a simple prompt) to generate a 2-3 sentence venue description
- Returns: `{ description: string }`
- Admin reviews and edits before saving

### Admin Form Changes

**`ExhibitionForm.tsx`** modifications:
- Add `venue_description` textarea field below venue name, with a "Generate from URL" button
- Add press article picker (same pattern as existing artwork picker) in the sidebar under "Featured Artworks"
- "Generate" button is disabled when `venue_url` is empty
- Loading state on generate button while AI processes

### Validation Schema Update

Add to `adminExhibitionSchema`:
- `venue_description: z.string().nullable().optional()`

---

## Files to Create/Modify

### Create
- `app/api/admin/exhibitions/[id]/press/route.ts` — CRUD for exhibition-press links
- `app/api/admin/exhibitions/generate-venue-description/route.ts` — AI venue description endpoint
- `components/features/exhibitions/VenueCard.tsx` — Sticky venue card with map
- `components/features/exhibitions/ExhibitionPressLinks.tsx` — Press coverage list

### Modify
- `app/[locale]/exhibitions/[slug]/page.tsx` — Rebuild with 2-column layout, add press data fetching
- `components/features/exhibitions/ExhibitionDetail.tsx` — Refactor to 2-column, remove hero, add new sections
- `components/features/exhibitions/types.ts` — Add `venue_description`, press article types
- `components/admin/ExhibitionForm.tsx` — Add venue description field + generate button, press picker
- `lib/api/validation.ts` — Add `venue_description` to schema
- `app/api/exhibitions/[slug]/route.ts` — Include venue_description and press in response
- `app/api/admin/exhibitions/route.ts` — Handle venue_description in create/update

### Database Migration
- Add `venue_description` column to `exhibitions` table
- Create `exhibition_press` junction table with RLS policies

---

## Verification

1. **Admin:** Create/edit exhibition with venue description (manual and AI-generated), link press articles
2. **Frontend:** Visit `/exhibitions/[slug]` — verify 2-column layout, venue card with map, artworks grid, press links
3. **Mobile:** Verify responsive stacking matches About/Archive behavior
4. **SEO:** Check Schema.org structured data, meta tags, semantic HTML
5. **Dark mode:** Verify all sections render correctly in both themes
6. **Edge cases:** Exhibition with no description, no artworks, no press, no venue URL, no coordinates
