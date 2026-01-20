# Typography System
## Kwame Brathwaite Archive Website

**Version:** 1.0  
**Date:** January 18, 2026  
**Status:** Design System Reference  
**Purpose:** Global typography standards for consistent, sophisticated design

---

## Overview

This document defines the complete typography system for the Kwame Brathwaite Archive website. The system prioritizes sophistication, readability, and a refined aesthetic appropriate for a high-end photography archive. 

**Design Philosophy:**
- **Photography First:** Typography should never compete with imagery
- **Editorial Quality:** Museum/gallery-level sophistication
- **Subtle Hierarchy:** Use size and color, not weight, for differentiation
- **Restraint:** Quiet confidence over loud statements

---

## Font Families

### Primary Typeface: Inter

```css
font-family: 'Inter', 'Helvetica Neue', 'Helvetica', 'Arial', sans-serif;
```

**Usage:** All UI elements, body text, navigation, metadata  
**Weights Available:**
- 300 (Light) - Special emphasis only
- 400 (Regular) - Primary weight for most text
- 500 (Medium) - Buttons, active states
- 600 (Semibold) - Large headings only
- 700 (Bold) - Rarely used, hero text only

**Loading:**
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

### Display Typeface: Playfair Display (Optional)

```css
font-family: 'Playfair Display', 'Georgia', serif;
```

**Usage:** Large hero headings only (optional)  
**Weights Available:**
- 400 (Regular)
- 600 (Semibold)
- 700 (Bold)

### Monospace: SF Mono

```css
font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Courier New', monospace;
```

**Usage:** Archive reference numbers, technical specifications  
**Weight:** 400 (Regular) only

### Japanese Typography

```css
font-family: 'Noto Sans JP', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', sans-serif;
```

**Usage:** Japanese language content only  
**Special Considerations:**
- Slightly larger base size (1.05em)
- Increased line height (1.8)
- Proper word-breaking for Japanese characters

---

## Color Palette

### Text Colors

```css
/* Primary Text Colors */
--text-black: #000000;           /* Pure black - CTAs and buttons ONLY */
--text-primary: #1A1A1A;         /* Very dark gray - main headings */
--text-secondary: #333333;       /* Dark gray - body text, metadata values */
--text-tertiary: #666666;        /* Mid gray - supporting info */
--text-quaternary: #999999;      /* Light gray - labels, eyebrow text */
--text-disabled: #CCCCCC;        /* Disabled state */

/* Semantic Colors */
--text-success: #2D5016;         /* Success messages */
--text-error: #8B0000;           /* Error messages */
--text-warning: #8B6914;         /* Warnings */
--text-info: #1A4D7A;            /* Info messages */

/* Inverted (on dark backgrounds) */
--text-white: #FFFFFF;           /* White text on black */
--text-white-secondary: rgba(255,255,255,0.8);  /* Secondary on black */
```

### Usage Guidelines

| Color | Usage | Examples |
|-------|-------|----------|
| `#000000` | CTAs, buttons only | "INQUIRE", "SUBSCRIBE" buttons |
| `#1A1A1A` | Large headings | Page titles, section headers |
| `#333333` | Body text, values | Descriptions, metadata values |
| `#666666` | Supporting info | Archive references, edition info |
| `#999999` | Labels, eyebrow | "YEAR:", "MEDIUM:", navigation |

**Critical Rule:** Never use pure black (#000000) for body text or metadata. It's too harsh and competes with imagery.

---

## Type Scale

### Display Sizes (Hero/Homepage)

```css
/* Display 1 - Hero Headings */
font-size: 72px;        /* 4.5rem */
line-height: 80px;      /* 1.11 */
font-weight: 600;
letter-spacing: -0.02em;
color: #1A1A1A;
/* Usage: Homepage hero, major section headers */

/* Display 2 - Page Hero */
font-size: 56px;        /* 3.5rem */
line-height: 64px;      /* 1.14 */
font-weight: 600;
letter-spacing: -0.01em;
color: #1A1A1A;
/* Usage: Page titles on landing pages */
```

### Heading Sizes

```css
/* H1 - Primary Page Heading */
font-size: 48px;        /* 3rem */
line-height: 56px;      /* 1.17 */
font-weight: 600;
letter-spacing: -0.01em;
color: #1A1A1A;
/* Usage: Main page headings (Works, Exhibitions, About) */

/* H2 - Section Heading */
font-size: 36px;        /* 2.25rem */
line-height: 44px;      /* 1.22 */
font-weight: 600;
letter-spacing: -0.005em;
color: #1A1A1A;
/* Usage: Section dividers within pages */

/* H3 - Subsection Heading */
font-size: 28px;        /* 1.75rem */
line-height: 36px;      /* 1.29 */
font-weight: 500;
letter-spacing: 0;
color: #1A1A1A;
/* Usage: Subsections, card titles in grids */

/* H4 - Minor Heading */
font-size: 20px;        /* 1.25rem */
line-height: 28px;      /* 1.4 */
font-weight: 500;
letter-spacing: 0;
color: #333333;
/* Usage: Small card titles, sidebar headings */
```

### Body Text Sizes

```css
/* Body Large */
font-size: 18px;        /* 1.125rem */
line-height: 28px;      /* 1.56 */
font-weight: 400;
letter-spacing: 0;
color: #333333;
/* Usage: Intro paragraphs, featured text, important descriptions */

/* Body Regular */
font-size: 16px;        /* 1rem */
line-height: 24px;      /* 1.5 */
font-weight: 400;
letter-spacing: 0;
color: #333333;
/* Usage: Standard body text, form labels */

/* Body Small */
font-size: 14px;        /* 0.875rem */
line-height: 20px;      /* 1.43 */
font-weight: 400;
letter-spacing: 0;
color: #333333;
/* Usage: Metadata values, descriptions, secondary info */
```

### Specialized Sizes

```css
/* Artwork Title (Special Case) */
font-size: 18px;        /* 1.125rem */
line-height: 25px;      /* 1.4 */
font-weight: 400;       /* Regular, not bold */
letter-spacing: 0.02em;
color: #1A1A1A;
/* Usage: Artwork titles on detail pages - subtle, refined */

/* Caption */
font-size: 12px;        /* 0.75rem */
line-height: 16px;      /* 1.33 */
font-weight: 400;
letter-spacing: 0.01em;
color: #666666;
/* Usage: Image captions, fine print, helper text */

/* Overline / Eyebrow */
font-size: 11px;        /* 0.688rem */
line-height: 16px;      /* 1.45 */
font-weight: 500;       /* Medium for emphasis */
letter-spacing: 0.08em; /* Wide tracking */
text-transform: uppercase;
color: #999999;
/* Usage: Category labels, section eyebrows, metadata labels */

/* Navigation */
font-size: 11px;        /* 0.688rem */
line-height: 16px;      /* 1.45 */
font-weight: 400;
letter-spacing: 0.08em; /* Wide tracking */
text-transform: uppercase;
color: #000000;
/* Usage: Main navigation links */

/* Archive Reference (Monospace) */
font-size: 12px;        /* 0.75rem */
line-height: 16px;      /* 1.33 */
font-weight: 400;
letter-spacing: 0.01em;
font-family: monospace;
color: #666666;
/* Usage: AJASS_Loc_59_001, technical IDs */
```

---

## Tailwind Utility Classes

### Pre-configured Typography Classes

For consistent application across components:

```typescript
// typography.ts - Export these for use in components

export const typography = {
  // Display
  displayHero: "text-[72px] leading-[80px] font-semibold tracking-tight text-gray-900",
  displayPage: "text-[56px] leading-[64px] font-semibold tracking-tight text-gray-900",
  
  // Headings
  h1: "text-5xl leading-tight font-semibold tracking-tight text-gray-900",
  h2: "text-4xl leading-snug font-semibold tracking-tight text-gray-900",
  h3: "text-3xl leading-normal font-medium text-gray-900",
  h4: "text-xl leading-relaxed font-medium text-gray-700",
  
  // Artwork Specific
  artworkTitle: "text-lg leading-snug font-normal tracking-wide text-gray-900",
  artworkMetadataLabel: "text-[11px] leading-normal font-normal uppercase tracking-[0.08em] text-gray-400",
  artworkMetadataValue: "text-sm leading-relaxed font-normal text-gray-700",
  artworkDescription: "text-sm leading-relaxed font-normal text-gray-700",
  artworkArchiveRef: "text-xs leading-normal font-normal tracking-wide font-mono text-gray-500",
  
  // Body
  bodyLarge: "text-lg leading-relaxed font-normal text-gray-700",
  bodyRegular: "text-base leading-normal font-normal text-gray-700",
  bodySmall: "text-sm leading-tight font-normal text-gray-700",
  
  // UI Elements
  navigation: "text-[11px] leading-normal font-normal uppercase tracking-[0.08em] text-black hover:text-gray-600",
  eyebrow: "text-[11px] leading-normal font-medium uppercase tracking-[0.08em] text-gray-400",
  caption: "text-xs leading-tight font-normal tracking-wide text-gray-500",
  
  // Buttons
  buttonPrimary: "text-xs leading-normal font-medium uppercase tracking-[0.1em] text-white",
  buttonSecondary: "text-xs leading-normal font-medium uppercase tracking-[0.1em] text-black",
  buttonText: "text-xs leading-normal font-medium uppercase tracking-[0.1em] text-black hover:text-gray-600",
  
  // Forms
  formLabel: "text-sm leading-normal font-medium text-gray-900",
  formInput: "text-base leading-normal font-normal text-gray-900",
  formHelper: "text-xs leading-tight font-normal text-gray-500",
  formError: "text-xs leading-tight font-normal text-red-800",
};
```

### Color Utility Classes

```typescript
export const textColors = {
  primary: "text-gray-900",      // #1A1A1A
  secondary: "text-gray-700",    // #333333
  tertiary: "text-gray-500",     // #666666
  quaternary: "text-gray-400",   // #999999
  disabled: "text-gray-300",     // #CCCCCC
  black: "text-black",           // #000000 - CTAs only
  white: "text-white",           // #FFFFFF - on dark backgrounds
};
```

---

## Responsive Typography

### Mobile Adjustments

On screens < 768px, scale down display and heading sizes:

```css
/* Mobile (< 768px) */
@media (max-width: 767px) {
  .display-hero { font-size: 48px; line-height: 56px; }
  .display-page { font-size: 40px; line-height: 48px; }
  .h1 { font-size: 36px; line-height: 44px; }
  .h2 { font-size: 28px; line-height: 36px; }
  .h3 { font-size: 24px; line-height: 32px; }
  .h4 { font-size: 18px; line-height: 26px; }
  
  /* Body text remains same size for readability */
  /* Navigation increases for touch targets */
  .navigation { font-size: 14px; }
}
```

### Japanese Typography Adjustments

```css
[lang="ja"] {
  font-size: 1.05em;        /* Slightly larger */
  line-height: 1.8;         /* More breathing room */
  font-family: 'Noto Sans JP', sans-serif;
  letter-spacing: 0.02em;   /* Tighter for Japanese */
}

[lang="ja"] h1,
[lang="ja"] h2,
[lang="ja"] h3 {
  line-height: 1.4;         /* Tighter for headings */
  letter-spacing: 0.02em;
}
```

---

## Context-Specific Applications

### Navigation (Header/Footer)

```css
/* Main Navigation */
font-size: 11px;
font-weight: 400;
letter-spacing: 0.08em;
text-transform: uppercase;
color: #000000;

/* Hover State */
color: #6B6B6B;
transition: color 0.2s ease;

/* Active State */
font-weight: 500;
border-bottom: 2px solid #000000;
```

### Artwork Cards (Grid View)

```css
/* Card Title */
font-size: 16px;
font-weight: 400;
line-height: 1.4;
color: #1A1A1A;
margin-bottom: 4px;

/* Card Metadata (Year, Medium) */
font-size: 12px;
font-weight: 400;
line-height: 1.33;
color: #999999;
letter-spacing: 0.05em;
text-transform: uppercase;
```

### Artwork Detail Page

```css
/* Artwork Title */
font-size: 18px;
font-weight: 400;
line-height: 1.4;
letter-spacing: 0.02em;
color: #1A1A1A;
margin-bottom: 16px;

/* Metadata Labels (YEAR, MEDIUM, etc.) */
font-size: 11px;
font-weight: 400;
line-height: 1.5;
letter-spacing: 0.08em;
text-transform: uppercase;
color: #999999;
margin-bottom: 4px;

/* Metadata Values (1966, Gelatin silver print) */
font-size: 14px;
font-weight: 400;
line-height: 1.5;
color: #333333;
margin-bottom: 16px;

/* Description Text */
font-size: 14px;
font-weight: 400;
line-height: 1.6;
color: #333333;
max-width: 500px;

/* Archive Reference */
font-size: 12px;
font-weight: 400;
line-height: 1.33;
letter-spacing: 0.01em;
font-family: monospace;
color: #666666;

/* Edition Info */
font-size: 12px;
font-weight: 400;
line-height: 1.33;
color: #666666;
```

### Forms

```css
/* Label */
font-size: 14px;
font-weight: 500;
line-height: 1.43;
color: #1A1A1A;
margin-bottom: 8px;

/* Input Text */
font-size: 16px;
font-weight: 400;
line-height: 1.5;
color: #1A1A1A;
padding: 12px 16px;

/* Helper Text */
font-size: 12px;
font-weight: 400;
line-height: 1.33;
color: #666666;
margin-top: 4px;

/* Error Message */
font-size: 12px;
font-weight: 400;
line-height: 1.33;
color: #8B0000;
margin-top: 4px;
```

### Buttons

```css
/* Primary Button (Black) */
font-size: 12px;
font-weight: 500;
line-height: 1;
letter-spacing: 0.1em;
text-transform: uppercase;
color: #FFFFFF;
background: #000000;
padding: 12px 24px;

/* Secondary Button (Outline) */
font-size: 12px;
font-weight: 500;
line-height: 1;
letter-spacing: 0.1em;
text-transform: uppercase;
color: #000000;
border: 1px solid #000000;
padding: 12px 24px;

/* Text Button (No background) */
font-size: 12px;
font-weight: 500;
line-height: 1;
letter-spacing: 0.1em;
text-transform: uppercase;
color: #000000;
```

### Footer

```css
/* Section Heading */
font-size: 11px;
font-weight: 500;
letter-spacing: 0.08em;
text-transform: uppercase;
color: #FFFFFF;
margin-bottom: 16px;

/* Links */
font-size: 14px;
font-weight: 400;
line-height: 1.8;
color: rgba(255,255,255,0.8);

/* Hover State */
color: rgba(255,255,255,1);

/* Copyright */
font-size: 12px;
font-weight: 400;
line-height: 1.33;
color: rgba(255,255,255,0.6);
text-align: center;
```

---

## Special Considerations

### Line Length for Readability

```css
/* Body text should never exceed 75 characters per line */
.body-text {
  max-width: 65ch;  /* Optimal: 60-75 characters */
}

/* Artwork descriptions */
.artwork-description {
  max-width: 500px;  /* Approximately 60-70 characters at 14px */
}
```

### Vertical Rhythm

Use consistent spacing multiples of 4px (0.25rem):

```css
/* Spacing between paragraphs */
margin-bottom: 16px;  /* 1rem */

/* Spacing between sections */
margin-bottom: 48px;  /* 3rem */

/* Spacing within components */
gap: 8px;  /* 0.5rem */
```

### Widow & Orphan Prevention

```css
p {
  orphans: 3;
  widows: 3;
}

h1, h2, h3, h4 {
  orphans: 4;
  widows: 4;
}
```

---

## Accessibility Requirements

### Contrast Ratios (WCAG AA)

All text must meet minimum contrast ratios:

| Size | Weight | Minimum Contrast | Actual Ratio |
|------|--------|-----------------|--------------|
| < 18px | Any | 4.5:1 | ✓ Pass |
| ≥ 18px | Any | 3:1 | ✓ Pass |
| Bold (<14px) | 700 | 3:1 | ✓ Pass |

**Test Your Combinations:**
- Text Primary (#1A1A1A) on White (#FFFFFF): 16.1:1 ✓
- Text Secondary (#333333) on White (#FFFFFF): 12.6:1 ✓
- Text Tertiary (#666666) on White (#FFFFFF): 5.7:1 ✓
- Text Quaternary (#999999) on White (#FFFFFF): 2.8:1 ⚠️ (Use for labels/decorative only)

### Focus States

```css
*:focus-visible {
  outline: 2px solid #000000;
  outline-offset: 2px;
}
```

### Screen Reader Considerations

```css
/* Visually hidden but accessible to screen readers */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

---

## Implementation Examples

### React Component with Typography

```tsx
import { typography, textColors } from '@/lib/typography';

export function ArtworkCard({ artwork }: { artwork: Artwork }) {
  return (
    <article className="space-y-2">
      <div className="relative aspect-[3/4]">
        <Image src={artwork.image_url} alt={artwork.title} fill />
      </div>
      
      <h3 className={typography.h4}>
        {artwork.title}
      </h3>
      
      <div className="space-y-1">
        <p className={typography.eyebrow}>
          {artwork.year}
        </p>
        <p className={`${typography.caption} ${textColors.tertiary}`}>
          {artwork.medium}
        </p>
      </div>
    </article>
  );
}
```

### CSS Module with Typography

```css
/* artwork-detail.module.css */

.title {
  font-size: 18px;
  line-height: 1.4;
  font-weight: 400;
  letter-spacing: 0.02em;
  color: var(--text-primary);
  margin-bottom: 16px;
}

.metadataLabel {
  font-size: 11px;
  line-height: 1.5;
  font-weight: 400;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-quaternary);
  margin-bottom: 4px;
}

.metadataValue {
  font-size: 14px;
  line-height: 1.5;
  font-weight: 400;
  color: var(--text-secondary);
  margin-bottom: 16px;
}
```

---

## Common Mistakes to Avoid

### ❌ Don't Do This:

```css
/* Using pure black for body text - too harsh */
color: #000000;

/* Using bold weights for subtle information */
font-weight: 700;

/* Not providing enough line height */
line-height: 1.2;

/* Inconsistent letter spacing */
letter-spacing: 0.03em; /* Not in our system */

/* Mixing font weights arbitrarily */
font-weight: 450; /* Not in our palette */
```

### ✅ Do This:

```css
/* Use appropriate gray for body text */
color: #333333;

/* Use weight 400 (regular) for most text */
font-weight: 400;

/* Generous line height for readability */
line-height: 1.5;

/* System-defined letter spacing */
letter-spacing: 0.08em; /* From our scale */

/* Only use defined weights */
font-weight: 500; /* Medium - in our system */
```

---

## Testing Checklist

When implementing typography:

- [ ] Font sizes match the system exactly
- [ ] Colors are from the defined palette
- [ ] Line heights provide adequate breathing room
- [ ] Letter spacing is consistent with system
- [ ] Contrast ratios meet WCAG AA minimum
- [ ] Text is readable on all screen sizes
- [ ] Japanese text uses proper font family and sizing
- [ ] Focus states are visible for keyboard navigation
- [ ] Text doesn't exceed 75 characters per line
- [ ] Hover states have smooth transitions

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | January 18, 2026 | Initial typography system documentation |

---

## Additional Resources

- [Inter Font Family](https://rsms.me/inter/)
- [Noto Sans JP](https://fonts.google.com/noto/specimen/Noto+Sans+JP)
- [WCAG 2.1 Contrast Requirements](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
- [Butterick's Practical Typography](https://practicaltypography.com/)

---

**Document Owner:** Design Team  
**Last Updated:** January 18, 2026  
**Status:** Approved for Implementation
