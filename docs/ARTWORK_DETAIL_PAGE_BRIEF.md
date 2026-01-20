# Artwork Detail Page - Implementation Guide
**Agent 1 Task | Est. Time: 4-5 hours**

## Quick Reference
- **Typography:** See TYPOGRAPHY_SYSTEM.md for all text styles
- **Integrates With:** VIEW_ON_WALL_FEATURE.md (Agent 2's work)
- **Database Updates:** See schema sections below

---

## Feature Overview

Build both a **lightbox modal** (for quick browsing) and **dedicated page** (for sharing/SEO) for artwork details.

### User Flows
1. Click artwork in gallery → Lightbox opens
2. Use arrows to browse next/prev artworks  
3. Click "View Full Page" → Dedicated URL opens
4. Click "Inquire" → Form modal with artwork context
5. Click "View on Wall" → Agent 2's feature

---

## Database Schema Updates

### Update `artworks` table:
```sql
ALTER TABLE artworks ADD COLUMN edition VARCHAR(100);
ALTER TABLE artworks ADD COLUMN archive_reference VARCHAR(100);
ALTER TABLE artworks ADD COLUMN dimensions_cm VARCHAR(100);
```

### New `artwork_literature` table:
```sql
CREATE TABLE artwork_literature (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artwork_id UUID REFERENCES artworks(id) ON DELETE CASCADE,
  citation TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Component Structure

```
components/
├── ArtworkLightbox.tsx         // Modal with nav arrows
├── ArtworkDetailPage.tsx       // Full page view
├── ArtworkMetadata.tsx         // Reusable metadata display
├── ArtworkInquiryForm.tsx      // Form with artwork context
└── ShareButton.tsx             // Share functionality
```

---

## 1. Lightbox Component

**File:** `components/ArtworkLightbox.tsx`

**Key Features:**
- Full-screen overlay
- Close button (X) top-right
- Next/Previous arrows (left/right edges)
- Keyboard: Arrow keys navigate, Esc closes
- Click outside image to close
- Preload adjacent images
- "View Full Page" link

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ [X Close]                                       │
│                                                 │
│  [<]     [Large Image]           [Metadata]  [>]│
│                                   Panel        │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Typography Reference:**
- Title: `typography.artworkTitle`
- Labels: `typography.artworkMetadataLabel`
- Values: `typography.artworkMetadataValue`
- Description: `typography.artworkDescription`

---

## 2. Dedicated Page

**Route:** `/[locale]/works/[id]`

**Layout:** Two-column (60/40 split on desktop)

```
┌─────────────────────────────────────┐
│ [< Back to Gallery]    [Share] [🌐] │
├────────────────┬────────────────────┤
│                │  Available         │
│                │                    │
│  Large Image   │  Title             │
│                │  Year, Medium      │
│                │  Dimensions        │
│                │  Series            │
│  [View on Wall]│  Edition           │
│  [Share]       │  Archive Ref       │
│                │                    │
│                │  Description...    │
│                │                    │
│                │  Literature        │
│                │  • Citation 1      │
│                │                    │
│                │  [INQUIRE]         │
│                │                    │
│                │  Related Works     │
│                │  [Grid 3-4]        │
└────────────────┴────────────────────┘
```

---

## 3. Metadata Display Component

Reusable component for both lightbox and page:

```tsx
<ArtworkMetadata artwork={artwork}>
  <MetadataField label="Year" value={artwork.year} />
  <MetadataField label="Medium" value={artwork.medium} />
  <MetadataField label="Dimensions" 
    value={`${artwork.dimensions} (${artwork.dimensions_cm})`} />
  <MetadataField label="Series" value={artwork.series} />
  <MetadataField label="Edition" value={artwork.edition} />
  <MetadataField label="Archive Reference" 
    value={artwork.archive_reference} 
    mono />
</ArtworkMetadata>
```

---

## 4. Inquiry Form

**Trigger:** Click "Inquire About This Work" button

**Modal Layout:**
```
┌─────────────────────────────────────┐
│ ENQUIRY FORM              [X Close] │
├─────────────────────────────────────┤
│ [Thumb] Untitled (Grandassa Models) │
│         1966, Gelatin silver print  │
├─────────────────────────────────────┤
│ Name *                              │
│ [_____________________________]     │
│                                     │
│ Email *                             │
│ [_____________________________]     │
│                                     │
│ Phone                               │
│ [_____________________________]     │
│                                     │
│ Inquiry Type *                      │
│ [Purchase ▼]                        │
│                                     │
│ Message *                           │
│ [_____________________________]     │
│ [_____________________________]     │
│                                     │
│          [SEND ENQUIRY]             │
└─────────────────────────────────────┘
```

**Form Data Sent:**
```typescript
{
  name: string,
  email: string,
  phone?: string,
  inquiry_type: 'purchase' | 'exhibition' | 'press' | 'general',
  message: string,
  artwork_id: string,  // Auto-populated
  locale: string       // Auto-populated
}
```

**Email to Admin:**
```
Subject: Inquiry: Untitled (Grandassa Models) - 1966

From: [name] ([email])
Phone: [phone]
Type: [inquiry_type]

Artwork: https://kwamebrathwaite.com/works/[id]

Message:
[message]
```

---

## 5. Navigation (Next/Previous)

**Implementation:**
```tsx
// Get adjacent artworks from current context
const { prevArtwork, nextArtwork } = useAdjacentArtworks({
  currentId: artwork.id,
  filters: currentFilters  // Respect gallery filters
});

<button onClick={() => navigate(`/works/${prevArtwork.id}`)}>
  <LeftArrow />
</button>

<button onClick={() => navigate(`/works/${nextArtwork.id}`)}>
  <RightArrow />
</button>
```

**Smart Navigation:**
- If viewing "Grandassa Models" series, stay in series
- If no filters, use all artworks chronologically
- Preload images for smooth transitions

---

## 6. Share Functionality

**Share Options:**
- Copy link to clipboard
- Email (mailto: link)
- Social: Instagram, Twitter/X, Facebook (optional)

```tsx
<ShareButton 
  url={`https://kwamebrathwaite.com/works/${artwork.id}`}
  title={artwork.title}
  image={artwork.image_url}
/>
```

---

## API Endpoints

```typescript
// Get single artwork with all details
GET /api/artworks/:id
Response: {
  success: true,
  data: {
    id, title, year, medium, dimensions, dimensions_cm,
    description, image_url, image_thumbnail_url,
    category, series, availability_status,
    edition, archive_reference,
    literature: [...],
    related_artworks: [...]
  }
}

// Get adjacent artworks (for navigation)
GET /api/artworks/:id/adjacent?filters=...
Response: {
  success: true,
  data: {
    previous: {...} | null,
    next: {...} | null
  }
}
```

---

## Integration Points with Agent 2

Agent 2 is building VIEW_ON_WALL_FEATURE.md. You need to:

1. **Add button in metadata section:**
```tsx
<button onClick={() => openViewOnWall(artwork)}>
  <EyeIcon /> VIEW ON A WALL
</button>
```

2. **Pass artwork data:**
```tsx
<ViewOnWallModal 
  artwork={artwork}
  isOpen={isViewOnWallOpen}
  onClose={() => setIsViewOnWallOpen(false)}
/>
```

3. **Shared interface:**
```typescript
interface Artwork {
  id: string;
  title: string;
  image_url: string;
  dimensions: string;  // "20 × 24 inches"
  // ... other fields
}
```

---

## Testing Checklist

- [ ] Lightbox opens/closes smoothly
- [ ] Next/Previous navigation works
- [ ] Keyboard shortcuts functional (arrows, Esc)
- [ ] "View Full Page" link works
- [ ] Dedicated page loads at `/works/[id]`
- [ ] All metadata displays correctly
- [ ] Inquiry form pre-populates artwork info
- [ ] Form validation works
- [ ] Form submission sends email
- [ ] Share button copies link
- [ ] Related works grid displays
- [ ] Typography matches TYPOGRAPHY_SYSTEM.md
- [ ] Responsive on mobile
- [ ] Cross-browser tested

---

## Timeline

- **Hour 1:** Database schema updates + API endpoints
- **Hour 2:** Lightbox component with navigation
- **Hour 3:** Dedicated page layout
- **Hour 4:** Inquiry form + integration
- **Hour 5:** Testing, polish, responsive

---

**References:**
- TYPOGRAPHY_SYSTEM.md (all text styles)
- TECHNICAL_SPEC_v2.md (database, API patterns)
- DESIGN_SYSTEM.md (colors, spacing)
