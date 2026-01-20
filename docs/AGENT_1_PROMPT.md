# Agent 1 Development Prompt - Artwork Detail Page

## Context
You are working on the Kwame Brathwaite Archive website (kwamebrathwaite.com), a high-end photography archive built with Next.js 14, TypeScript, Tailwind CSS, and Supabase. Your task is to implement the **Artwork Detail Page** feature.

## Your Mission
Build a sophisticated artwork detail viewing experience with both a **lightbox modal** (for quick browsing) and a **dedicated page** (for sharing/SEO). The design should be refined, editorial, and gallery-quality - letting the photography be the hero.

## What You're Building
1. **Lightbox Modal** - Full-screen overlay with next/prev navigation
2. **Dedicated Detail Page** - Shareable URL at `/works/[id]`
3. **Enhanced Inquiry Form** - Modal with artwork context pre-filled
4. **Share Functionality** - Copy link, social sharing
5. **Related Works Section** - Display 3-4 related artworks
6. **Navigation System** - Smart next/prev arrows that respect filters

## Essential Reading (In This Order)
1. **TYPOGRAPHY_SYSTEM.md** - Read this FIRST for all text styling
2. **ARTWORK_DETAIL_PAGE_BRIEF.md** - Your implementation guide
3. **TECHNICAL_SPEC_v2.md** - Database schema, API patterns
4. **DESIGN_SYSTEM.md** - Colors, spacing, components

## Critical Design Principles

### Typography (From TYPOGRAPHY_SYSTEM.md)
**MOST IMPORTANT**: Use these exact styles - do NOT improvise

```typescript
// Import the typography system
import { typography, textColors } from '@/lib/typography';

// Artwork Title
<h1 className={typography.artworkTitle}>
  {artwork.title}
</h1>

// Metadata Labels (YEAR, MEDIUM, etc.)
<p className={typography.artworkMetadataLabel}>
  YEAR
</p>

// Metadata Values (1966, Gelatin silver print, etc.)
<p className={typography.artworkMetadataValue}>
  {artwork.year}
</p>

// Description
<p className={typography.artworkDescription}>
  {artwork.description}
</p>

// Archive Reference (monospace)
<p className={typography.artworkArchiveRef}>
  {artwork.archive_reference}
</p>
```

**Typography Rules:**
- Title: 18px, regular weight (400), #1A1A1A - NOT bold, NOT pure black
- Labels: 11px, uppercase, wide tracking (0.08em), #999999 (light gray)
- Values: 14px, regular weight, #333333 (dark gray)
- NEVER use pure black (#000000) for text - only for buttons/CTAs
- NEVER use bold weights for metadata - keep it refined

### Color Palette
```
Titles: #1A1A1A (very dark gray)
Body/Values: #333333 (dark gray)
Labels/Supporting: #666666 (mid gray)
Eyebrow/Labels: #999999 (light gray)
Buttons ONLY: #000000 (pure black)
```

## Database Schema Updates

### Step 1: Update artworks table
```sql
-- Add these columns to artworks table
ALTER TABLE artworks ADD COLUMN edition VARCHAR(100);
ALTER TABLE artworks ADD COLUMN archive_reference VARCHAR(100);
ALTER TABLE artworks ADD COLUMN dimensions_cm VARCHAR(100);

-- Example data:
-- edition: "#1/5 (Ed. 5 + 2AP)"
-- archive_reference: "AJASS_Loc_59_001"
-- dimensions_cm: "50.8 × 61 cm"
```

### Step 2: Create artwork_literature table
```sql
CREATE TABLE artwork_literature (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artwork_id UUID REFERENCES artworks(id) ON DELETE CASCADE,
  citation TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_artwork_literature_artwork ON artwork_literature(artwork_id);
```

## Implementation Checklist

### Phase 1: API & Data Layer (Hour 1)
- [ ] Run database migrations (add columns, create literature table)
- [ ] Create `GET /api/artworks/:id` endpoint (returns full artwork with literature)
- [ ] Create `GET /api/artworks/:id/adjacent` endpoint (returns prev/next artworks)
- [ ] Create `lib/artworks.ts` with data fetching functions
- [ ] Test API endpoints with Postman/Thunder Client

### Phase 2: Lightbox Component (Hour 2)
- [ ] Create `components/ArtworkLightbox.tsx`
- [ ] Full-screen overlay with close button (X)
- [ ] Left/right navigation arrows
- [ ] Keyboard support (arrows navigate, Esc closes)
- [ ] Click outside to close
- [ ] Preload adjacent images
- [ ] Display metadata panel on right side
- [ ] "View Full Page" link
- [ ] Use exact typography from TYPOGRAPHY_SYSTEM.md
- [ ] Test: Opens, closes, navigates smoothly

### Phase 3: Dedicated Page (Hour 3)
- [ ] Create `app/[locale]/works/[id]/page.tsx`
- [ ] Two-column layout (60/40 split on desktop)
- [ ] Left: Large image with "View on Wall" and "Share" buttons
- [ ] Right: Metadata panel with all fields
- [ ] Include: title, year, medium, dimensions (both in/cm), series, edition, archive ref, description
- [ ] Add Literature section if citations exist
- [ ] Add Related Works grid (3-4 artworks)
- [ ] Back to Gallery link
- [ ] Language switcher integration
- [ ] SEO: Meta tags, Open Graph, structured data
- [ ] Use exact typography from TYPOGRAPHY_SYSTEM.md
- [ ] Test: Page loads, all data displays, responsive

### Phase 4: Inquiry Form (Hour 4)
- [ ] Create `components/ArtworkInquiryForm.tsx`
- [ ] Modal overlay with close button
- [ ] Show artwork thumbnail + basic info at top
- [ ] Form fields: Name*, Email*, Phone, Inquiry Type*, Message*
- [ ] Inquiry Type dropdown: Purchase, Exhibition, Press, General
- [ ] Pre-populate artwork_id and locale
- [ ] Client-side validation (required fields, email format)
- [ ] POST to `/api/inquiries`
- [ ] Success: Show confirmation, close modal
- [ ] Error: Display error message
- [ ] Send email to admin with artwork link
- [ ] Test: Form validates, submits, emails sent

### Phase 5: Share & Navigation (Hour 5)
- [ ] Create `components/ShareButton.tsx`
- [ ] Copy link to clipboard functionality
- [ ] Social share options (optional: email, Twitter, Instagram)
- [ ] Success toast/notification
- [ ] Implement smart navigation (respects gallery filters)
- [ ] Preload adjacent images for smooth transitions
- [ ] Add "View on Wall" button placeholder (Agent 2 will implement modal)
- [ ] Cross-browser testing
- [ ] Mobile responsive testing
- [ ] Typography verification (matches TYPOGRAPHY_SYSTEM.md exactly)

## Integration with Agent 2 (View on Wall)

Agent 2 is building the "View on Wall" feature. You need to:

### 1. Add the button in your metadata display:
```tsx
<button 
  onClick={() => setIsViewOnWallOpen(true)}
  className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest 
             text-black hover:text-gray-600 transition-colors"
>
  <EyeIcon className="w-4 h-4" />
  VIEW ON A WALL
</button>
```

### 2. Import and use their modal:
```tsx
import { ViewOnWallModal } from '@/components/ViewOnWallModal';

// In your component
const [isViewOnWallOpen, setIsViewOnWallOpen] = useState(false);

<ViewOnWallModal 
  artwork={artwork}
  isOpen={isViewOnWallOpen}
  onClose={() => setIsViewOnWallOpen(false)}
/>
```

### 3. Shared Artwork interface:
```typescript
interface Artwork {
  id: string;
  title: string;
  image_url: string;
  dimensions: string;  // "20 × 24 inches"
  year: number;
  medium: string;
  // ... other fields
}
```

## Code Quality Standards

### TypeScript
- Use strict types, no `any`
- Define interfaces for all data structures
- Use proper type annotations

### Components
- Use functional components with hooks
- Keep components focused (single responsibility)
- Extract reusable logic into custom hooks

### Styling
- Use Tailwind CSS utility classes
- Reference typography system constants
- Mobile-first responsive design
- No hardcoded colors/sizes - use design system

### Performance
- Use Next.js Image component for all images
- Implement proper loading states
- Preload adjacent images
- Lazy load modal content

### Accessibility
- Keyboard navigation (Tab, Arrow keys, Esc)
- Proper ARIA labels
- Focus management in modals
- Alt text for all images
- Color contrast meets WCAG AA

## Testing Requirements

### Before Marking Complete
- [ ] Lightbox opens/closes smoothly
- [ ] Next/Previous navigation works correctly
- [ ] Keyboard shortcuts functional (arrows, Esc)
- [ ] Dedicated page loads at correct URL `/works/[id]`
- [ ] All metadata displays correctly (title, year, medium, dimensions, series, edition, archive ref)
- [ ] Dimensions show BOTH inches and cm
- [ ] Inquiry form pre-populates artwork info
- [ ] Form validation works (required fields, email format)
- [ ] Form submission creates database record and sends email
- [ ] Share button copies link to clipboard
- [ ] Related works section displays 3-4 artworks
- [ ] Typography EXACTLY matches TYPOGRAPHY_SYSTEM.md
- [ ] Colors match design system (no pure black for text!)
- [ ] Responsive on mobile (320px - 1920px)
- [ ] Cross-browser: Chrome, Firefox, Safari, Edge
- [ ] No console errors or warnings
- [ ] Images load with proper optimization
- [ ] SEO meta tags present
- [ ] Accessible via keyboard only

## Common Pitfalls to Avoid

### ❌ Don't Do This:
```tsx
// WRONG: Pure black for text
<h1 className="text-black font-bold text-5xl">

// WRONG: Made-up font sizes
<p className="text-[22px]">

// WRONG: Hardcoded colors
<div style={{ color: '#222222' }}>

// WRONG: Inline styles for typography
<h1 style={{ fontSize: '24px', fontWeight: 600 }}>
```

### ✅ Do This:
```tsx
// CORRECT: Use typography system
<h1 className={typography.artworkTitle}>

// CORRECT: Use predefined text colors
<p className={textColors.secondary}>

// CORRECT: Reference design system
<div className="text-gray-700">
```

## File Structure

Your work will create/modify these files:
```
app/
├── [locale]/
│   └── works/
│       └── [id]/
│           └── page.tsx           # Dedicated page

components/
├── ArtworkLightbox.tsx            # Lightbox modal
├── ArtworkMetadata.tsx            # Reusable metadata display
├── ArtworkInquiryForm.tsx         # Inquiry form modal
└── ShareButton.tsx                # Share functionality

lib/
├── artworks.ts                    # Data fetching functions
└── typography.ts                  # Typography system (already exists)

app/api/
├── artworks/
│   └── [id]/
│       ├── route.ts               # GET single artwork
│       └── adjacent/
│           └── route.ts           # GET prev/next artworks
└── inquiries/
    └── route.ts                   # POST inquiry
```

## Success Criteria

Your implementation is complete when:
1. ✅ All typography matches TYPOGRAPHY_SYSTEM.md EXACTLY
2. ✅ Lightbox and dedicated page both work flawlessly
3. ✅ Navigation arrows work with smart filtering
4. ✅ Inquiry form pre-populates and submits successfully
5. ✅ All metadata fields display correctly
6. ✅ Responsive on all screen sizes
7. ✅ No console errors
8. ✅ Accessible via keyboard
9. ✅ Integration point ready for Agent 2's View on Wall modal
10. ✅ All testing checklist items pass

## Questions?

If anything is unclear:
1. Check TYPOGRAPHY_SYSTEM.md first
2. Reference ARTWORK_DETAIL_PAGE_BRIEF.md
3. Look at TECHNICAL_SPEC_v2.md for patterns
4. Ask for clarification before proceeding

## Ready to Start?

1. Read TYPOGRAPHY_SYSTEM.md (15 min)
2. Read ARTWORK_DETAIL_PAGE_BRIEF.md (10 min)
3. Run database migrations (5 min)
4. Start building! (4-5 hours)

Good luck! Remember: **Photography first, typography refined, let the work be the hero.** 🎨
