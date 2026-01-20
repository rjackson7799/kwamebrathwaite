# Navigation Styling Update - Complete Specification

**Project:** Kwame Brathwaite Archive Website  
**Date:** January 18, 2026  
**Priority:** High  
**Estimated Time:** 30-45 minutes

---

## Overview

We're refining the navigation for the Kwame Brathwaite Archive website to match a more sophisticated, editorial aesthetic. The navigation needs to be updated to a lighter, smaller, all-caps treatment that's more appropriate for a high-end photography archive.

---

## Current State

- Navigation is in sentence case
- Medium font weight
- Standard size (~16px)
- Located in Header component
- Language switcher exists but **does NOT have a globe icon**

---

## Design Goals

This navigation style should evoke:
- High-end gallery websites (Gagosian, Pace Gallery)
- Editorial magazines (The New York Times Magazine)
- Museum archives (MoMA, Getty)

The lighter, smaller, all-caps treatment creates better visual hierarchy and doesn't compete with the bold serif headings used throughout the site.

---

## Typography Specifications

### Main Navigation Links

```
Font Family: Inter (already in use)
Font Weight: 400 (Regular)
Font Size: 11px (0.688rem)
Letter Spacing: 0.08em
Text Transform: UPPERCASE
Line Height: 1.5
Color: #000000 (black)

Hover State:
  Color: #6B6B6B (warm gray)
  Transition: color 0.2s ease

Active/Current Page:
  Font Weight: 500 (Medium)
  Optional: 2px bottom border in #000000
```

### Tailwind Classes (Main Nav)

```jsx
className="text-[11px] font-normal tracking-[0.08em] uppercase 
           text-black hover:text-gray-600 transition-colors duration-200"
```

---

## Navigation Structure

### Navigation Items

The navigation should include these items **in this exact order**:

1. HOME
2. WORKS
3. EXHIBITIONS
4. PRESS
5. ABOUT
6. THE ARCHIVE
7. CONTACT

### Layout & Spacing

- **Layout:** Horizontal (desktop)
- **Alignment:** Right-aligned within the header
- **Item Spacing:** 16px horizontal spacing between items
- **Vertical Alignment:** Center
- **Header Height:** 80px (maintain current)

---

## Language Switcher - Complete Implementation

### Current State
Language switcher exists but **does NOT have a globe icon**.

### Visual Structure

**Desktop Closed State:**
```
[🌐 Globe Icon] EN ▼
```

**Desktop Open State (Dropdown):**
```
┌─────────────┐
│ EN English  │
│ FR Français │
│ JA 日本語    │
└─────────────┘
```

### Typography & Styling

```
Font Size: 11px (0.688rem)
Font Weight: 400 (Regular)
Letter Spacing: 0.08em
Text Transform: UPPERCASE
Color: #000000

Layout:
  Display: Flex
  Gap: 8px (gap-2)
  Align Items: Center
  Padding: 8px 12px (px-3 py-2)
  
Button States:
  Default: transparent background
  Hover: #F5F5F5 (bg-gray-100)
  Border Radius: 4px (rounded-md)
  Transition: background-color 0.2s ease
```

### Globe Icon Implementation

**Option 1: Heroicons (if already in project)**
```bash
# Check if already installed
npm list @heroicons/react
```
```jsx
import { GlobeAltIcon } from '@heroicons/react/24/outline'

<GlobeAltIcon className="w-5 h-5" />
```

**Option 2: Lucide React (Recommended - lightweight)**
```bash
npm install lucide-react
```
```jsx
import { Globe } from 'lucide-react'

<Globe className="w-5 h-5" />
```

**Option 3: Custom SVG (for full control)**
```jsx
function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className}
      fill="none" 
      viewBox="0 0 24 24" 
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        d="M12 21a9 9 0 100-18 9 9 0 000 18z" 
      />
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        d="M3.6 9h16.8M3.6 15h16.8" 
      />
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        d="M12 3a15.3 15.3 0 014 9 15.3 15.3 0 01-4 9 15.3 15.3 0 01-4-9 15.3 15.3 0 014-9z" 
      />
    </svg>
  );
}

<GlobeIcon className="w-5 h-5" />
```

### Icon Specifications

```
Size: 20px × 20px (w-5 h-5 in Tailwind)
Stroke Width: 1.5px
Color: Inherit from parent (currentColor)
Style: Outlined/stroke (not filled)
```

### Chevron Icon (Dropdown Indicator)

```jsx
import { ChevronDownIcon } from '@heroicons/react/24/outline'
// OR
import { ChevronDown } from 'lucide-react'

<ChevronDownIcon className="w-4 h-4 transition-transform duration-200" />
```

**State:**
- Closed: No rotation
- Open: Rotate 180deg

### Complete Component Structure

```jsx
<div className="relative" ref={dropdownRef}>
  {/* Trigger Button */}
  <button
    onClick={() => setIsOpen(!isOpen)}
    className="flex items-center gap-2 px-3 py-2 text-[11px] font-normal 
               tracking-[0.08em] uppercase hover:bg-gray-100 rounded-md 
               transition-colors"
    aria-label="Language"
    aria-expanded={isOpen}
    aria-haspopup="listbox"
  >
    <GlobeIcon className="w-5 h-5" />
    <span className="uppercase">EN</span>
    <ChevronDownIcon 
      className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
    />
  </button>

  {/* Dropdown Menu */}
  {isOpen && (
    <div 
      className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 
                 rounded-md shadow-lg py-1 z-50"
      role="listbox"
      aria-label="Language"
    >
      {locales.map((locale) => (
        <button
          key={locale}
          onClick={() => switchLocale(locale)}
          className="w-full px-4 py-2 text-left text-sm flex items-center gap-3
                     hover:bg-gray-50 transition-colors"
          role="option"
          aria-selected={locale === currentLocale}
        >
          <span className="text-xs text-gray-500 uppercase w-6">
            {localeFlags[locale]}
          </span>
          <span>{localeNames[locale]}</span>
        </button>
      ))}
    </div>
  )}
</div>
```

### Dropdown Menu Item Styling

```
Each language option:
  Padding: 8px 16px (py-2 px-4)
  Font Size: 14px (text-sm)
  Display: Flex
  Gap: 12px (gap-3)
  Text Align: Left
  
  Hover State:
    Background: #FAFAFA (bg-gray-50)
    
  Active/Selected:
    Font Weight: 500 (font-medium)
    Background: #F5F5F5 (bg-gray-50)

Language Code:
  Size: 12px (text-xs)
  Color: #6B6B6B (text-gray-500)
  Width: 24px (w-6)
  Transform: UPPERCASE
```

### Language Data Reference

```typescript
export const locales = ['en', 'fr', 'ja'] as const;
export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
  en: 'English',
  fr: 'Français',
  ja: '日本語'
};

export const localeFlags: Record<Locale, string> = {
  en: 'EN',
  fr: 'FR',
  ja: 'JA'
};
```

---

## Mobile Navigation

### Typography (Mobile Menu)

```
Font Size: 14px (text-sm) - slightly larger for touch targets
Font Weight: 400 (Regular)
Letter Spacing: 0.08em
Text Transform: UPPERCASE
Color: #000000

Menu Item Padding: 16px 24px (py-4 px-6)
Touch Target: Minimum 44px height
```

### Mobile Language Switcher

```
Same styling as desktop but:
  - Full width within mobile menu
  - Larger touch targets (min 44px height)
  - Position at bottom of mobile menu
  - Globe icon remains visible (20px)
```

---

## Active Link Indicator

Use Next.js `usePathname()` to detect active route:

```jsx
'use client';

import { usePathname } from 'next/navigation';

export function Navigation() {
  const pathname = usePathname();
  
  return (
    <nav>
      {navItems.map((item) => {
        const isActive = pathname === item.href || 
                        pathname.startsWith(item.href + '/');
        
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`
              text-[11px] font-normal tracking-[0.08em] uppercase 
              transition-colors duration-200
              ${isActive 
                ? 'font-medium text-black border-b-2 border-black' 
                : 'text-black hover:text-gray-600'
              }
            `}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
```

---

## Files to Update

Based on the Next.js 14 App Router structure:

### Primary Files
- `components/Header.tsx` - Main header component
- `components/Navigation.tsx` - Navigation links (if separated)
- `components/LanguageSwitcher.tsx` - Language selector
- `components/MobileMenu.tsx` - Mobile navigation

### Supporting Files
- `i18n/config.ts` - Locale configuration (already exists)
- `app/[locale]/layout.tsx` - May need header updates

---

## Implementation Steps

### Step 1: Install Icon Library (if needed)
```bash
# Choose ONE of these options:

# Option A: Heroicons (if not already installed)
npm install @heroicons/react

# Option B: Lucide React (recommended)
npm install lucide-react
```

### Step 2: Update Navigation Typography
- Update all navigation link classes to use 11px, uppercase, 0.08em spacing
- Apply font-normal (400 weight)
- Add hover states with gray-600 color
- Implement active state detection

### Step 3: Add Globe Icon to Language Switcher
- Import chosen icon library
- Add globe icon (20px) to left of language code
- Add chevron-down icon (16px) to right
- Ensure proper gap spacing (8px)

### Step 4: Style Dropdown Menu
- Apply white background with border
- Add shadow for depth
- Style menu items with hover states
- Ensure proper spacing and alignment

### Step 5: Update Mobile Navigation
- Apply same typography treatment (14px for mobile)
- Ensure touch targets meet 44px minimum
- Position language switcher at bottom of mobile menu

### Step 6: Test Thoroughly
- See testing checklist below

---

## Testing Checklist

### Desktop Navigation
- [ ] All navigation links are uppercase
- [ ] Font size is 11px
- [ ] Letter spacing creates proper visual rhythm (0.08em)
- [ ] Hover states transition smoothly to gray-600
- [ ] Active page indicator is visible (font-medium + border)
- [ ] Navigation is right-aligned in header
- [ ] 16px spacing between navigation items
- [ ] No layout shifts when hovering

### Language Switcher - Desktop
- [ ] Globe icon displays at 20px × 20px
- [ ] Icon and text are vertically centered
- [ ] 8px gap between icon and language code
- [ ] Chevron down icon shows dropdown state
- [ ] Chevron rotates 180deg when dropdown opens
- [ ] Icon color matches text color (black)
- [ ] Hover state works on entire button (gray-100 bg)
- [ ] Button has 8px padding vertical, 12px horizontal
- [ ] Dropdown menu appears below button
- [ ] Dropdown has white background with border and shadow
- [ ] Dropdown width is 160px (w-40)
- [ ] Menu items show language code (left) and full name (right)
- [ ] Menu items have hover state (gray-50 bg)
- [ ] Active language is visually indicated (font-medium)
- [ ] Clicking outside dropdown closes it

### Mobile Navigation
- [ ] Hamburger menu opens/closes properly
- [ ] Navigation items use 14px font size
- [ ] All items are uppercase with 0.08em spacing
- [ ] Touch targets are minimum 44px height
- [ ] Language switcher appears at bottom of menu
- [ ] Language switcher is full width
- [ ] Globe icon remains visible at 20px
- [ ] Mobile menu closes after language selection

### Accessibility
- [ ] All navigation items are keyboard accessible (Tab key)
- [ ] Enter/Space activates links
- [ ] Focus states are visible (browser default or custom)
- [ ] Language switcher has proper ARIA labels
- [ ] aria-expanded reflects dropdown state
- [ ] aria-selected indicates current language
- [ ] Screen reader announces current page
- [ ] Color contrast meets WCAG AA (4.5:1 minimum)

### Cross-Browser
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

### Responsive Breakpoints
- [ ] Desktop (1024px+): Full navigation visible
- [ ] Tablet (768px-1023px): Full navigation or hamburger
- [ ] Mobile (<768px): Hamburger menu

---

## Reference Materials

### Color Palette (from Design System)
```
Primary Black: #000000
Warm Gray: #6B6B6B
Light Gray: #E5E5E5
Gray 50: #FAFAFA
Gray 100: #F5F5F5
White: #FFFFFF
```

### Typography Scale (from Design System)
```
11px = 0.688rem (Overline/Navigation)
12px = 0.75rem (Caption)
14px = 0.875rem (Body Small)
16px = 1rem (Body Regular)
```

### Spacing System (from Design System)
```
4px = 0.25rem (xs) = gap-1
8px = 0.5rem (sm) = gap-2
12px = 0.75rem = gap-3
16px = 1rem (md) = gap-4
24px = 1.5rem (lg) = gap-6
```

---

## Questions for Clarification

If any of these are unclear during implementation:

1. **Logo:** Should the logo size remain the same or adjust proportionally with smaller nav?
2. **Header Background:** Should it remain pure white (#FFFFFF)?
3. **Header Border:** Should there be a subtle bottom border (1px #E5E5E5)?
4. **Icon Library:** Which icon library is preferred (Heroicons, Lucide, or custom SVG)?
5. **Language Switcher Position:** Should it be immediately after navigation or have additional spacing?

---

## Success Criteria

Implementation is complete when:

✅ All navigation links use 11px, uppercase, 0.08em letter-spacing  
✅ Navigation has proper hover and active states  
✅ Globe icon is visible in language switcher (20px)  
✅ Language dropdown opens/closes smoothly  
✅ Mobile navigation uses appropriate sizing (14px)  
✅ All accessibility requirements are met  
✅ Cross-browser testing passes  
✅ No console errors or warnings  

---

## Additional Notes

- This navigation style is consistent with high-end photography archive websites
- The lighter treatment allows the bold serif headings on pages to be the primary hierarchy
- The all-caps style is more formal and archival, appropriate for the content
- Globe icon should be outlined/stroke style, not filled
- Maintain existing i18n functionality (next-intl routing)

---

**Document Version:** 1.0  
**Last Updated:** January 18, 2026  
**Status:** Ready for Implementation
