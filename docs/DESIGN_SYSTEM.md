# Design System Guide
## Kwame Brathwaite Archive Website

**Version:** 1.0  
**Date:** January 9, 2026  
**Status:** Planning Phase

---

## 1. Design Principles

### Core Principles

**1. Photography First**
- The work is the hero; design serves the photography
- Maximum contrast and clarity for image presentation
- Generous white space to let images breathe
- Minimal visual competition with the artwork

**2. Reverence for History**
- Timeless, sophisticated aesthetic
- Respectful treatment of historical significance
- Authentic representation of the Black is Beautiful movement
- Balance between modern web standards and archival gravitas

**3. Clarity & Accessibility**
- Clear visual hierarchy
- High contrast for readability
- Accessible to all users regardless of ability
- Intuitive navigation and interaction patterns

**4. Sophisticated Minimalism**
- Clean, uncluttered layouts
- Purposeful use of typography and space
- Restrained color palette
- Quality over decoration

---

## 2. Color Palette

### Primary Colors

```
Black (Primary)
HEX: #000000
RGB: 0, 0, 0
Usage: Primary text, navigation, headers, footer

White (Background)
HEX: #FFFFFF
RGB: 255, 255, 255
Usage: Primary background, card backgrounds

Charcoal (Secondary)
HEX: #1A1A1A
RGB: 26, 26, 26
Usage: Secondary backgrounds, hover states
```

### Accent Colors

```
Warm Gray (Neutral)
HEX: #6B6B6B
RGB: 107, 107, 107
Usage: Secondary text, metadata, timestamps

Light Gray (Borders)
HEX: #E5E5E5
RGB: 229, 229, 229
Usage: Dividers, borders, subtle backgrounds

Gold (Accent - Optional)
HEX: #B8945F
RGB: 184, 148, 95
Usage: Sparingly for CTAs, highlights, special emphasis
Note: Use only if brand-appropriate
```

### Semantic Colors

```
Success Green
HEX: #2D5016
RGB: 45, 80, 22
Usage: Form success states, confirmations

Error Red
HEX: #8B0000
RGB: 139, 0, 0
Usage: Error messages, validation failures

Warning Amber
HEX: #8B6914
RGB: 139, 105, 20
Usage: Warning states, alerts

Info Blue
HEX: #1A4D7A
RGB: 26, 77, 122
Usage: Informational messages
```

### Color Usage Guidelines

- **Backgrounds:** Primarily white (#FFFFFF)
- **Text:** Black (#000000) on white for maximum readability
- **Interactive Elements:** Black with hover to Charcoal (#1A1A1A)
- **Disabled States:** Warm Gray (#6B6B6B) at 40% opacity
- **Contrast Ratio:** Minimum 4.5:1 for normal text, 3:1 for large text (WCAG AA)

---

## 3. Typography

### Font Families

**Primary Typeface: Helvetica Neue / Inter**
```
Font Stack: 'Inter', 'Helvetica Neue', 'Helvetica', 'Arial', sans-serif
Usage: All UI elements, body text, navigation
Weights: 300 (Light), 400 (Regular), 500 (Medium), 600 (Semibold), 700 (Bold)
```

**Display Typeface: Freight Display / Playfair Display (Optional)**
```
Font Stack: 'Playfair Display', 'Georgia', serif
Usage: Large headings, hero text (if brand-appropriate)
Weights: 400 (Regular), 600 (Semibold), 700 (Bold)
```

**Monospace (Metadata):**
```
Font Stack: 'SF Mono', 'Monaco', 'Inconsolata', monospace
Usage: Dates, dimensions, technical specifications
Weight: 400 (Regular)
```

### Type Scale

```
Display 1 (Hero)
Size: 72px / 4.5rem
Line Height: 80px / 1.11
Weight: 600 (Semibold)
Letter Spacing: -0.02em
Usage: Homepage hero, major section headers

Display 2
Size: 56px / 3.5rem
Line Height: 64px / 1.14
Weight: 600 (Semibold)
Letter Spacing: -0.01em
Usage: Page titles

H1 (Heading 1)
Size: 48px / 3rem
Line Height: 56px / 1.17
Weight: 600 (Semibold)
Letter Spacing: -0.01em
Usage: Primary page headings

H2 (Heading 2)
Size: 36px / 2.25rem
Line Height: 44px / 1.22
Weight: 600 (Semibold)
Letter Spacing: -0.005em
Usage: Section headings

H3 (Heading 3)
Size: 28px / 1.75rem
Line Height: 36px / 1.29
Weight: 500 (Medium)
Letter Spacing: 0
Usage: Subsection headings

H4 (Heading 4)
Size: 20px / 1.25rem
Line Height: 28px / 1.4
Weight: 500 (Medium)
Letter Spacing: 0
Usage: Card titles, minor headings

Body Large
Size: 18px / 1.125rem
Line Height: 28px / 1.56
Weight: 400 (Regular)
Letter Spacing: 0
Usage: Intro paragraphs, featured text

Body Regular
Size: 16px / 1rem
Line Height: 24px / 1.5
Weight: 400 (Regular)
Letter Spacing: 0
Usage: Standard body text

Body Small
Size: 14px / 0.875rem
Line Height: 20px / 1.43
Weight: 400 (Regular)
Letter Spacing: 0
Usage: Captions, metadata, secondary information

Caption
Size: 12px / 0.75rem
Line Height: 16px / 1.33
Weight: 400 (Regular)
Letter Spacing: 0.01em
Usage: Image captions, fine print

Overline
Size: 11px / 0.688rem
Line Height: 16px / 1.45
Weight: 600 (Semibold)
Letter Spacing: 0.08em
Text Transform: UPPERCASE
Usage: Category labels, eyebrow text
```

### Typography Guidelines

- **Hierarchy:** Use size, weight, and spacing to create clear hierarchy
- **Line Length:** 60-75 characters optimal for readability
- **Paragraph Spacing:** 1.5x line height between paragraphs
- **Alignment:** Left-aligned for body text, centered for hero elements
- **Widows/Orphans:** Avoid single words on final lines

---

## 4. Spacing System

### Base Unit: 8px

```
4px   (0.25rem)  - xs   - Tight spacing, icon padding
8px   (0.5rem)   - sm   - Small gaps, button padding
16px  (1rem)     - md   - Standard spacing, card padding
24px  (1.5rem)   - lg   - Section spacing
32px  (2rem)     - xl   - Large section spacing
48px  (3rem)     - 2xl  - Major section breaks
64px  (4rem)     - 3xl  - Hero spacing
96px  (6rem)     - 4xl  - Page section dividers
128px (8rem)     - 5xl  - Maximum spacing
```

### Spacing Application

**Component Internal Spacing:**
- Buttons: 12px vertical, 24px horizontal
- Cards: 24px padding
- Forms: 16px between fields
- Navigation: 16px between items

**Layout Spacing:**
- Container padding: 24px mobile, 48px tablet, 64px desktop
- Section margins: 48px mobile, 64px tablet, 96px desktop
- Grid gaps: 16px mobile, 24px tablet, 32px desktop

---

## 5. Grid System

### Layout Grid

```
Mobile (320px - 767px)
- Columns: 4
- Gutter: 16px
- Margin: 16px
- Max Width: 100%

Tablet (768px - 1023px)
- Columns: 8
- Gutter: 24px
- Margin: 32px
- Max Width: 100%

Desktop (1024px - 1439px)
- Columns: 12
- Gutter: 32px
- Margin: 48px
- Max Width: 1280px

Large Desktop (1440px+)
- Columns: 12
- Gutter: 32px
- Margin: 64px
- Max Width: 1440px
```

### Breakpoints

```
xs: 320px   - Small mobile
sm: 640px   - Mobile
md: 768px   - Tablet
lg: 1024px  - Desktop
xl: 1280px  - Large desktop
2xl: 1440px - Extra large desktop
```

---

## 6. Components

### 6.1 Buttons

**Primary Button**
```
Background: #000000
Text Color: #FFFFFF
Font: 16px, 500 weight
Padding: 12px 24px
Border Radius: 2px
Transition: 0.2s ease

Hover State:
Background: #1A1A1A
Transform: translateY(-1px)
Box Shadow: 0 4px 8px rgba(0,0,0,0.15)

Active State:
Background: #000000
Transform: translateY(0)

Disabled State:
Background: #E5E5E5
Text Color: #6B6B6B
Cursor: not-allowed
```

**Secondary Button**
```
Background: transparent
Border: 1px solid #000000
Text Color: #000000
Font: 16px, 500 weight
Padding: 12px 24px
Border Radius: 2px

Hover State:
Background: #000000
Text Color: #FFFFFF

Active State:
Background: #1A1A1A
```

**Text Button**
```
Background: transparent
Border: none
Text Color: #000000
Font: 16px, 500 weight
Padding: 8px 0
Text Decoration: underline on hover

Hover State:
Text Color: #6B6B6B
```

### 6.2 Form Elements

**Input Fields**
```
Border: 1px solid #E5E5E5
Background: #FFFFFF
Padding: 12px 16px
Font: 16px, 400 weight
Border Radius: 2px

Focus State:
Border: 1px solid #000000
Outline: none

Error State:
Border: 1px solid #8B0000
Background: #FFF5F5

Success State:
Border: 1px solid #2D5016
```

**Labels**
```
Font: 14px, 500 weight
Color: #000000
Margin Bottom: 8px
```

**Helper Text**
```
Font: 12px, 400 weight
Color: #6B6B6B
Margin Top: 4px
```

**Select Dropdowns**
```
Same styling as input fields
Add dropdown icon (chevron-down)
```

**Checkboxes/Radio Buttons**
```
Size: 20px Ã— 20px
Border: 1px solid #E5E5E5
Border Radius: 2px (checkbox), 50% (radio)

Checked State:
Background: #000000
Border: 1px solid #000000
```

### 6.3 Cards

**Image Card**
```
Background: #FFFFFF
Border: 1px solid #E5E5E5
Border Radius: 0px (clean edges)
Padding: 0
Overflow: hidden

Hover State:
Box Shadow: 0 8px 24px rgba(0,0,0,0.1)
Transform: translateY(-2px)
Transition: 0.3s ease

Card Content:
Padding: 16px
```

**Content Card**
```
Background: #FFFFFF
Border: none
Padding: 24px

Image Container:
Aspect Ratio: 4:3 or 3:4 (consistent per section)
Object Fit: cover

Title:
Font: 20px, 500 weight
Margin Bottom: 8px

Metadata:
Font: 12px, 400 weight
Color: #6B6B6B
Letter Spacing: 0.05em
Text Transform: uppercase
```

### 6.4 Navigation

**Main Navigation**
```
Background: #FFFFFF
Border Bottom: 1px solid #E5E5E5
Height: 80px
Padding: 0 48px

Logo:
Height: 40px

Navigation Links:
Font: 16px, 400 weight
Color: #000000
Padding: 0 16px

Hover State:
Color: #6B6B6B

Active State:
Font Weight: 500
Border Bottom: 2px solid #000000
```

**Mobile Navigation**
```
Hamburger Menu:
Size: 24px Ã— 24px
Color: #000000

Mobile Menu:
Background: #FFFFFF
Full width
Slide in from right
Transition: 0.3s ease

Menu Items:
Font: 20px, 400 weight
Padding: 16px 24px
Border Bottom: 1px solid #E5E5E5
```

### 6.5 Gallery/Grid

**Masonry Grid**
```
Columns: 2 (mobile), 3 (tablet), 4 (desktop)
Gap: 16px (mobile), 24px (tablet), 32px (desktop)

Image Container:
Aspect Ratio: Maintain original (masonry)
Border Radius: 0

Hover Overlay:
Background: rgba(0,0,0,0.5)
Opacity: 0 â†’ 1
Transition: 0.3s ease

Overlay Content:
Title: 16px, 500 weight, #FFFFFF
Metadata: 12px, 400 weight, rgba(255,255,255,0.8)
```

**Lightbox**
```
Background: rgba(0,0,0,0.95)
Backdrop Filter: blur(20px)

Image:
Max Width: 90vw
Max Height: 90vh
Object Fit: contain

Navigation Arrows:
Size: 48px
Color: #FFFFFF
Position: Fixed left/right edges

Close Button:
Size: 40px
Position: Fixed top-right
Color: #FFFFFF

Image Info:
Position: Bottom
Background: rgba(0,0,0,0.8)
Padding: 24px
Color: #FFFFFF
```

### 6.6 Filters & Search

**Filter Bar**
```
Background: #FFFFFF
Border Bottom: 1px solid #E5E5E5
Padding: 16px 24px

Filter Buttons:
Background: transparent
Border: 1px solid #E5E5E5
Padding: 8px 16px
Font: 14px, 400 weight
Border Radius: 20px
Margin: 0 8px 8px 0

Active Filter:
Background: #000000
Color: #FFFFFF
Border: 1px solid #000000
```

**Search Bar**
```
Width: 100% (mobile), 400px (desktop)
Background: #F5F5F5
Border: 1px solid transparent
Padding: 12px 16px 12px 48px
Border Radius: 24px

Search Icon:
Position: Absolute left
Size: 20px
Color: #6B6B6B

Focus State:
Background: #FFFFFF
Border: 1px solid #000000
```

### 6.7 Footer

```
Background: #000000
Color: #FFFFFF
Padding: 64px 48px 32px

Layout:
Grid: 3 columns (desktop), 1 column (mobile)

Links:
Color: #FFFFFF
Font: 14px, 400 weight
Opacity: 0.8

Hover State:
Opacity: 1

Social Icons:
Size: 24px
Color: #FFFFFF
Spacing: 16px between icons

Copyright:
Font: 12px, 400 weight
Color: rgba(255,255,255,0.6)
Text Align: center
Margin Top: 48px
```

---

## 7. Imagery

### Photography Treatment

**Image Aspect Ratios**
- Portrait Works: 3:4
- Landscape Works: 4:3
- Square Works: 1:1
- Maintain original aspect ratio when possible

**Image Quality**
- Thumbnail: 800px wide, 80% quality JPG
- Detail View: 2000px wide, 90% quality JPG
- Lightbox: 3000px wide, 95% quality JPG
- WebP format with JPG fallback

**Image Optimization**
- Lazy loading for all images
- Responsive images with srcset
- Blur-up loading placeholder
- Alt text for all images (descriptive, 100-150 characters)

**Gallery Presentation**
- Consistent spacing between images
- No filters or color adjustments to original photography
- High contrast presentation on white background
- Zoom capability in lightbox

---

## 8. Iconography

### Icon System

**Style:** Outlined, minimal, geometric
**Stroke Width:** 1.5px
**Size:** 24px default, scale to 16px, 32px, 48px as needed
**Color:** Inherit from parent element

**Required Icons:**
- Menu (hamburger)
- Close (X)
- Search (magnifying glass)
- Filter (funnel)
- Arrow Right
- Arrow Left
- Arrow Up
- Arrow Down
- Chevron Down
- External Link
- Share
- Download
- Zoom In
- Zoom Out
- Instagram
- Twitter/X
- Email
- Link
- Calendar
- Location Pin

**Icon Usage:**
- Always paired with labels when possible
- Minimum touch target: 44px Ã— 44px
- Consistent stroke width across all icons
- Center-aligned within containers

---

## 9. Animations & Transitions

### Timing Functions

```
Ease Out: cubic-bezier(0.0, 0.0, 0.2, 1) - Decelerating
Ease In: cubic-bezier(0.4, 0.0, 1, 1) - Accelerating
Ease In Out: cubic-bezier(0.4, 0.0, 0.2, 1) - Standard
Linear: cubic-bezier(0.0, 0.0, 1, 1) - No acceleration
```

### Duration

```
Instant: 0ms - Immediate feedback
Fast: 100ms - Small UI changes
Normal: 200ms - Standard interactions
Slow: 300ms - Page transitions
Very Slow: 500ms - Large movements
```

### Common Transitions

**Hover Effects**
```
Property: transform, box-shadow, color
Duration: 200ms
Timing: ease-out
```

**Page Transitions**
```
Property: opacity, transform
Duration: 300ms
Timing: ease-in-out
```

**Modal/Overlay**
```
Property: opacity
Duration: 200ms
Timing: ease-out
```

**Image Loading**
```
Property: opacity
Duration: 300ms
Timing: ease-in
```

### Animation Principles

- **Purposeful:** Only animate when it aids understanding
- **Subtle:** Avoid distracting movements
- **Performant:** Use transform and opacity for best performance
- **Accessible:** Respect prefers-reduced-motion
- **Consistent:** Same timing for same interactions

---

## 10. Responsive Behavior

### Mobile (320px - 767px)

**Navigation:**
- Hamburger menu
- Full-screen overlay navigation
- Sticky header on scroll

**Gallery:**
- 2-column grid
- Stack filters vertically
- Full-width search

**Typography:**
- Scale down by 20-30%
- Reduce line heights slightly
- Increase touch targets

**Spacing:**
- Reduce margins and padding
- Tighter grid gaps
- Less generous white space

### Tablet (768px - 1023px)

**Navigation:**
- Full navigation visible
- Condensed spacing

**Gallery:**
- 3-column grid
- Horizontal filter bar
- Side-by-side content

**Typography:**
- 90% of desktop sizes
- Maintain readability

### Desktop (1024px+)

**Navigation:**
- Full navigation
- Generous spacing

**Gallery:**
- 4-column grid (or more)
- Advanced filtering
- Hover interactions

**Typography:**
- Full type scale
- Optimal line lengths

---

## 11. Accessibility

### WCAG 2.1 AA Compliance

**Color Contrast**
- Minimum 4.5:1 for normal text
- Minimum 3:1 for large text (18px+)
- Minimum 3:1 for UI components

**Keyboard Navigation**
- All interactive elements focusable
- Visible focus indicators (2px outline)
- Logical tab order
- Skip to content link

**Screen Readers**
- Semantic HTML structure
- ARIA labels where needed
- Alt text for all images
- Form labels associated with inputs

**Focus Management**
- Clear focus indicators
- Focus trap in modals
- Return focus after modal close

**Motion & Animation**
- Respect prefers-reduced-motion
- Provide alternative interactions
- No auto-playing content

---

## 12. Design Tokens (CSS Variables)

```css
:root {
  /* Colors */
  --color-black: #000000;
  --color-white: #FFFFFF;
  --color-charcoal: #1A1A1A;
  --color-gray-warm: #6B6B6B;
  --color-gray-light: #E5E5E5;
  --color-gold: #B8945F;
  
  /* Semantic Colors */
  --color-success: #2D5016;
  --color-error: #8B0000;
  --color-warning: #8B6914;
  --color-info: #1A4D7A;
  
  /* Typography */
  --font-sans: 'Inter', 'Helvetica Neue', sans-serif;
  --font-serif: 'Playfair Display', 'Georgia', serif;
  --font-mono: 'SF Mono', 'Monaco', monospace;
  
  /* Font Sizes */
  --text-xs: 0.75rem;    /* 12px */
  --text-sm: 0.875rem;   /* 14px */
  --text-base: 1rem;     /* 16px */
  --text-lg: 1.125rem;   /* 18px */
  --text-xl: 1.25rem;    /* 20px */
  --text-2xl: 1.75rem;   /* 28px */
  --text-3xl: 2.25rem;   /* 36px */
  --text-4xl: 3rem;      /* 48px */
  --text-5xl: 3.5rem;    /* 56px */
  --text-6xl: 4.5rem;    /* 72px */
  
  /* Spacing */
  --space-xs: 0.25rem;   /* 4px */
  --space-sm: 0.5rem;    /* 8px */
  --space-md: 1rem;      /* 16px */
  --space-lg: 1.5rem;    /* 24px */
  --space-xl: 2rem;      /* 32px */
  --space-2xl: 3rem;     /* 48px */
  --space-3xl: 4rem;     /* 64px */
  --space-4xl: 6rem;     /* 96px */
  --space-5xl: 8rem;     /* 128px */
  
  /* Border Radius */
  --radius-none: 0;
  --radius-sm: 2px;
  --radius-md: 4px;
  --radius-lg: 8px;
  --radius-xl: 16px;
  --radius-full: 9999px;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 8px rgba(0,0,0,0.1);
  --shadow-lg: 0 8px 24px rgba(0,0,0,0.15);
  --shadow-xl: 0 16px 48px rgba(0,0,0,0.2);
  
  /* Transitions */
  --transition-fast: 100ms;
  --transition-normal: 200ms;
  --transition-slow: 300ms;
  --transition-very-slow: 500ms;
  
  /* Z-Index */
  --z-base: 1;
  --z-dropdown: 100;
  --z-sticky: 200;
  --z-modal: 300;
  --z-tooltip: 400;
}
```

---

## 13. Implementation Guidelines

### Component Development

**React Component Structure:**
```
- Use functional components with hooks
- Implement responsive design with Tailwind/styled-components
- Follow accessibility best practices
- Include prop types/TypeScript definitions
- Write unit tests for complex components
```

**CSS Methodology:**
```
- Use CSS-in-JS or Tailwind CSS
- Follow BEM naming if using vanilla CSS
- Mobile-first approach
- Use CSS variables for theming
```

### Performance Considerations

- Lazy load images below the fold
- Use WebP format with fallbacks
- Optimize SVG icons
- Minimize animation/transition overhead
- Use will-change sparingly
- Implement code splitting

---

## 14. Design Deliverables Checklist

- [ ] Homepage design (desktop, tablet, mobile)
- [ ] Works/Gallery page design
- [ ] Individual work detail page
- [ ] Exhibitions page
- [ ] About page
- [ ] Press page
- [ ] Contact/inquiry form
- [ ] Search results page
- [ ] 404 error page
- [ ] Lightbox/modal states
- [ ] Navigation (desktop and mobile)
- [ ] Footer design
- [ ] Loading states
- [ ] Empty states
- [ ] Error states
- [ ] Component library/style guide
- [ ] Design tokens documentation

---

## 15. Brand Assets Required

### From Stakeholders

- [ ] Logo files (SVG, PNG)
- [ ] High-resolution photography samples
- [ ] Existing brand guidelines (if any)
- [ ] Preferred color palette (if specific)
- [ ] Font licenses or preferences
- [ ] Exhibition/press materials for reference

---

## 16. Testing & Quality Assurance

### Design QA Checklist

**Visual Testing:**
- [ ] All breakpoints render correctly
- [ ] Images display properly across devices
- [ ] Typography is legible and hierarchy is clear
- [ ] Colors meet contrast requirements
- [ ] Spacing is consistent

**Interaction Testing:**
- [ ] All hover states work
- [ ] Transitions are smooth
- [ ] Animations respect reduced motion
- [ ] Touch targets are adequate (44px minimum)
- [ ] Forms validate properly

**Accessibility Testing:**
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Focus indicators visible
- [ ] Color contrast passes WCAG AA
- [ ] All images have alt text

**Cross-browser Testing:**
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge
- [ ] Mobile browsers (iOS Safari, Chrome)

---

## 17. Maintenance & Updates

### Design System Evolution

**Regular Reviews:**
- Quarterly review of design patterns
- Update based on user feedback
- Add new components as needed
- Deprecate unused patterns

**Documentation:**
- Keep component examples updated
- Document new patterns immediately
- Maintain changelog of design updates
- Version control for design files

---

**Document Control**  
Last Updated: January 9, 2026  
Next Review: After stakeholder feedback  
Owner: Design Team  
Version History: 1.0 (Initial Draft)
