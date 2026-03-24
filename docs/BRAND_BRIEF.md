# Brand Design Brief — Kwame Brathwaite Archive

> This document is the creative and visual reference for maintaining consistency across all pages.
> It complements `DESIGN_SYSTEM.md` (technical specs) with artistic intent and visual direction.
> All new pages and components must follow these guidelines.

---

## Visual Philosophy

**"Museum gallery, not web application."**

The Kwame Brathwaite Archive is a digital extension of a physical gallery space. The photography is the primary content — the interface should recede. Every design decision should ask: *does this let the photographs speak, or does it compete with them?*

### Core Principles

1. **Photography First** — Images are the hero. UI elements exist to support, never to dominate.
2. **Quiet Reverence** — The aesthetic should feel like walking through a museum. Muted tones, generous whitespace, unhurried pacing.
3. **Sophisticated Minimalism** — Less chrome, fewer borders, no decorative flourish. Let typography, spacing, and composition create hierarchy.
4. **Timeless Over Trendy** — Avoid design trends that will date quickly. The work spans six decades; the presentation should feel equally enduring.

---

## Typography

### Hierarchy

| Element | Font | Weight | Case | Tracking | Color | Example |
|---------|------|--------|------|----------|-------|---------|
| **Logo** | Playfair Display | Regular (400) | Mixed | Normal | Black / White (dark) | Kwame Brathwaite |
| **Navigation** | Inter | Regular (400) | Uppercase | 0.08em | Black / White (dark) | HOME  WORKS  EXHIBITIONS |
| **Page Title (H1)** | Inter | Light (300) | Uppercase | 0.18em | Muted gray (#999) | WORKS |
| **Section Title (H2)** | Inter | Light (300) | Uppercase | 0.15em | Muted gray (#999) | LITERATURE |
| **Body Text** | Inter | Regular (400) | Sentence | Normal | Dark gray (#333) | Paragraph content... |
| **Metadata Labels** | Inter | Regular (400) | Uppercase | 0.08em | Light gray (#aaa) | MEDIUM, DIMENSIONS |
| **Metadata Values** | Inter | Regular (400) | Sentence | Normal | Medium gray (#555) | Archival pigment print |
| **Caption / Small** | Inter | Regular (400) | Sentence | Normal | Medium gray (#666) | Author, Publication, Date |
| **CTA Links** | Inter | Regular (400) | Uppercase | 0.12em | Muted gray (#666) | ENQUIRE |
| **Footer** | Inter | Regular (400) | Uppercase | 0.15em | White/40% opacity | COPYRIGHT 2026 |

### Key Rules

- **Page titles are light and muted.** Never use bold or black for H1 headings on public pages. The title should feel like a gallery wall label, not a newspaper headline.
- **Uppercase with wide tracking** is the signature typographic treatment for headings, navigation, CTAs, and metadata labels. This gives the site its gallery character.
- **Body text should breathe.** Use line-height of 1.8 for long-form content (about page, descriptions). The reading experience should feel like a well-set exhibition catalog.
- **No serif for headings.** Playfair Display is reserved exclusively for the logo. All other text uses Inter.

---

## Color Tone

### Public Pages

The palette on public pages skews **muted and restrained**:

- **Text**: Never pure black (#000) for body text. Use #333333 or similar warm dark gray.
- **Headings**: Use #999999 (muted gray) for page titles and section headers.
- **Metadata**: Use #AAAAAA for labels, #555555 for values.
- **CTAs**: Use #666666 for text-only action links. No filled/colored buttons on public pages.
- **Backgrounds**: White (#FFFFFF). Avoid colored section backgrounds unless displaying photographs.
- **Borders**: Minimal. Use #E5E5E5 sparingly for section dividers only.
- **Gold accent (#B8945F)**: Reserved for very subtle accents. Do not use as button fills or section backgrounds.

### Dark Mode

Dark mode follows the same principle — muted, not contrasty:
- Headings: #777777
- Body: #C0C0C0
- Background: #121212
- Borders: #333333

---

## Component Guidelines

### Buttons & CTAs (Public Pages)

**Do:** Use text-only uppercase links with wide tracking.
```
ENQUIRE
VIEW ON A WALL
REQUEST LICENSE
```

**Don't:** Use filled buttons, bordered buttons, or gold accent buttons on public-facing pages.

The only exception is form submit buttons (contact form, newsletter signup) which may use a subtle filled style.

### Cards

**Do:** Let content define the card. No borders, no shadows, no background color.
**Don't:** Use `card-bordered`, `card-elevated`, or `card-featured` classes on public pages.

Press cards and exhibition cards should be flat — image (if present) + text, nothing more.

### Page Titles

Page titles are **optional per page** (controlled via admin toggle). When shown:
- Use the `.page-title-museum` class
- Inter Light 300, uppercase, 0.18em tracking, muted gray
- Generous top margin, modest bottom margin

When hidden, the page content begins directly — no empty space where the title would have been.

### Metadata Display

For artwork details and similar structured data, present metadata as a **simple vertical stack** without explicit labels:

**Do:**
```
UNTITLED (MILES DAVIS AND PAUL CHAMBERS AT RIJF), N.D., PRINTED 2018
Archival pigment print, mounted and framed
AJASS_Loc_59_001
30 x 30 in
76.2 x 76.2 cm
#1/5 (Ed. 5 + 2AP)
```

**Don't:**
```
Year: N.D., Printed 2018
Medium: Archival pigment print
Archive Ref: AJASS_Loc_59_001
Dimensions: 30 x 30 in
```

The data should read like a museum wall label — compact, direct, no redundant labeling.

### Footer

Minimal. The footer should barely be noticed:
- Newsletter signup (simplified styling)
- Single copyright line: `COPYRIGHT 2026 KWAME BRATHWAITE ARCHIVE`
- Essential links (Privacy, Terms) as subtle inline text
- Uppercase, small (11px), wide tracking, low opacity

### Navigation

Approved as-is:
- Inter, 11px, uppercase, 0.08em tracking
- Active state: medium weight + bottom border
- Clean, unobtrusive, functional

### Images

- No borders or frames around photographs
- No rounded corners on photo containers
- Subtle hover zoom (1.02 scale) is acceptable
- Lightbox overlay should be near-black (rgba(0,0,0,0.95))

---

## Per-Page Directives

### Works (Gallery)
- Page title: Show (controlled by admin toggle)
- Grid layout: Tight gaps, clean cards, no borders
- Filter UI: Minimal, uppercase pills
- Card: Image + title + year only. No descriptions.

### Works Detail (Artwork)
- No page title — artwork title serves as the identifier
- Metadata: Stacked without labels (see Metadata Display above)
- CTAs: Text-only links ("ENQUIRE", "VIEW ON A WALL")
- Image: Large, dominant, zoom on click
- Literature section: Small, muted, italic citations

### Exhibitions
- Page title: Show (admin toggle)
- Cards: Image + exhibition title + venue + dates
- Minimal chrome

### Press
- Page title: Show (admin toggle)
- Grid: 4 columns on desktop, 2 on tablet, 1 on mobile
- Mixed layout: Cards with images show them; cards without are text-only
- Card content: Uppercase headline + publication/author + date
- No excerpts, no "Read article" links — entire card is clickable

### About
- Page title: Hidden by default (admin toggle set to false)
- Biography text flows directly with portrait image
- Body text: Generous line-height (1.8), muted color
- Section headers: `.section-title-museum` style
- Timeline: Clean, minimal markers

### Contact
- Page title: Show (admin toggle)
- Form: Clean inputs, minimal styling
- Submit button: Only filled button allowed on public pages

### Archive / Licensing / Shop
- Page title: Show (admin toggle)
- Follow general museum aesthetic guidelines

---

## Reference Comparison

| Element | Reference Site (kwamebrathwaite.com) | Our Target |
|---------|--------------------------------------|------------|
| Logo | Light geometric sans, uppercase, wide tracking | Playfair Display serif (approved by client) |
| Nav | Light sans, uppercase | Inter 11px uppercase (approved) |
| Page H1 | Light sans, uppercase, wide tracking, muted | Inter Light 300, uppercase, 0.18em, #999 |
| Body text | Regular weight, generous line-height, muted | Inter 400, leading-[1.8], #333 |
| Artwork metadata | Stacked text, no labels | Stacked text, no labels |
| CTAs | Text-only, uppercase | Text-only, uppercase, tracking-wide |
| Press cards | Mixed image/text-only, uppercase titles, no excerpts | Mixed, 4-col, uppercase, no excerpts |
| Footer | Minimal copyright line | Newsletter + minimal copyright |
| Overall feel | Museum exhibition catalog | Museum exhibition catalog |

---

## Do's and Don'ts

### Do
- Let photographs dominate every page
- Use generous whitespace between sections
- Keep typography light and muted
- Make the interface feel like air around the artwork
- Use uppercase + tracking as the signature typographic device
- Test in both light and dark modes

### Don't
- Use bold or heavy headings on public pages
- Use pure black (#000) for text (except logo)
- Add borders, shadows, or backgrounds to photo cards
- Use filled/colored buttons for navigation or CTAs
- Add decorative elements (gradients, patterns, icons) near photographs
- Use serif fonts for anything other than the logo
- Show unnecessary UI chrome (badges, tags, labels) when content is self-explanatory
