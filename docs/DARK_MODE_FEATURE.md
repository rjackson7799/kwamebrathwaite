# Dark Mode Feature - Implementation Roadmap
**Priority:** Roadmap (post-launch enhancement)
**Status:** Planning
**Date:** February 10, 2026

---

## Feature Overview

Add a user-togglable dark mode to the public-facing archive website. Dark backgrounds make photographs the focal point — the same principle museums use when hanging work on dark walls. This is especially relevant for Kwame Brathwaite's black-and-white photography, where tonal range reads differently against dark vs. light surrounds.

### Why This Matters for a Photography Archive

- **Images pop on dark backgrounds.** A white page competes with the photograph; a dark one frames it.
- **Mobile sharing in varied environments.** The archive owners regularly show works on their phones to collectors, curators, and collaborators — in galleries, on planes, in restaurants. Dark mode makes this comfortable everywhere.
- **Low-light browsing comfort.** Reduces eye strain for extended archive browsing in dimly lit settings.
- **Industry standard.** Major photography platforms (Adobe Portfolio, SmugMug, gallery sites) default to dark presentation for this reason.

### User Flow

1. User clicks a theme toggle (sun/moon icon) in the site header
2. Site transitions to dark mode with a smooth color change
3. Preference is saved to localStorage and persists across sessions
4. On first visit, the site respects the user's OS-level preference (`prefers-color-scheme`)
5. User can override OS preference at any time via the toggle

### Toggle Placement

The theme toggle lives in the **header utility area**, grouped with the language switcher — to the right of the main navigation. This follows the existing pattern in `components/layout/Header.tsx`.

**Desktop layout** (line 64-83 of Header.tsx):
```
┌──────────────────────────────────────────────────────────────────────┐
│ Kwame Brathwaite    HOME  WORKS  EXHIBITIONS  PRESS  ...  │ EN  🌙  │
└──────────────────────────────────────────────────────────────────────┘
                      ← nav links →                          ↑ utility zone
                                                               (border-l divider)
```

The toggle sits after the `LanguageSwitcher`, inside the existing `border-l border-gray-light` divider section (line 80). It becomes another item in the utility cluster:

```tsx
{/* Language Switcher + Theme Toggle */}
<div className="ml-4 pl-4 border-l border-gray-light flex items-center gap-3">
  <LanguageSwitcher variant="light" />
  <ThemeToggle />
</div>
```

**Mobile layout** (line 86-106 of Header.tsx):
```
┌──────────────────────────────────────────────────────────────────────┐
│ Kwame Brathwaite                                    EN   🌙   ☰     │
└──────────────────────────────────────────────────────────────────────┘
                                                      ↑ utility cluster
```

The toggle slots into the existing `flex items-center gap-1` row alongside the language switcher and hamburger button:

```tsx
<div className="flex items-center gap-1 md:hidden">
  <LanguageSwitcher variant="light" />
  <ThemeToggle />
  <button> {/* hamburger menu */} </button>
</div>
```

**Toggle component spec** (`components/ui/ThemeToggle.tsx`):
- Small icon button (~36x36px touch target, matching existing header button sizing)
- Sun icon in dark mode, moon icon in light mode
- `aria-label="Switch to dark mode"` / `"Switch to light mode"`
- Matches the visual weight of the language switcher — unobtrusive, utility-level

---

## Current State Assessment

### What's in Our Favor

| Asset | Status | Notes |
|-------|--------|-------|
| Tailwind CSS | Ready | Just needs `darkMode: 'class'` added to config |
| Centralized colors | Ready | All colors defined in `tailwind.config.ts` (lines 11-24) |
| CSS custom properties | Partial | `:root` variables exist in `globals.css` (lines 5-18), but no dark variant block |
| Component classes | Partial | `globals.css` defines ~15 reusable classes (`.btn-primary`, `.card`, `.input`, etc.) — dark variants can be added centrally |

### What Needs Work

| Gap | Scope | Notes |
|-----|-------|-------|
| No `dark:` classes anywhere | ~70 component/page files | Zero dark mode prefixes exist in the codebase |
| No theme provider | New file | Need React context + provider for theme state |
| No toggle UI | New component | Sun/moon toggle for the header |
| No dark color palette | Design decision | Must define dark equivalents for all colors |
| Hardcoded colors in CSS | `globals.css` | Hero slider, opacity slider, grain overlay use inline hex values |
| ~588 color declarations in components | Systematic | Most are straightforward Tailwind class additions |

---

## Proposed Dark Color Palette

Mapped from the existing light palette defined in `DESIGN_SYSTEM.md` and `tailwind.config.ts`.

### Core Colors

| Token | Light Mode | Dark Mode | Usage |
|-------|-----------|-----------|-------|
| Background (primary) | `#FFFFFF` (white) | `#121212` | Page backgrounds |
| Background (elevated) | `#FFFFFF` (white) | `#1A1A1A` (charcoal) | Cards, modals, dropdowns |
| Background (surface) | `#E5E5E5` (gray-light) | `#2A2A2A` | Subtle background areas, hover states |
| Text (primary) | `#000000` (black) | `#F0F0F0` | Headings, body text |
| Text (secondary) | `#6B6B6B` (gray-warm) | `#A0A0A0` | Metadata, captions, timestamps |
| Borders | `#E5E5E5` (gray-light) | `#333333` | Dividers, card borders |
| Gold accent | `#B8945F` | `#C9A870` | Slightly lightened for visibility on dark bg |

### Semantic Colors (Dark Mode)

| Token | Light Mode | Dark Mode | Notes |
|-------|-----------|-----------|-------|
| Success | `#2D5016` | `#4CAF50` | Brighter green for dark bg contrast |
| Error | `#8B0000` | `#EF5350` | Brighter red for readability |
| Warning | `#8B6914` | `#FFB74D` | Warmer amber for dark bg |
| Info | `#1A4D7A` | `#42A5F5` | Brighter blue for dark bg |

> **Note:** All dark mode colors must pass WCAG AA contrast (4.5:1 for text, 3:1 for large text/UI elements). Verify with a contrast checker before finalizing.

---

## Phased Implementation Plan

### Phase 1: Infrastructure
**Scope:** Config + theme system + toggle
**Files affected:** 4-5 files

1. **Add dark mode to Tailwind config**
   - File: `tailwind.config.ts`
   - Add `darkMode: 'class'` to the config object
   - Add dark color tokens to `theme.extend.colors` if using semantic naming

2. **Add dark CSS variables**
   - File: `app/globals.css`
   - Add a `.dark` or `[data-theme="dark"]` block under `:root` with dark color values
   - Update the ~15 component classes (`.btn-primary`, `.card`, `.input`, etc.) with dark variants

3. **Create theme context and hook**
   - New file: `lib/hooks/useTheme.ts`
   - Manages theme state (light/dark/system)
   - Reads/writes localStorage
   - Detects `prefers-color-scheme` on first visit
   - Applies `dark` class to `<html>` element

4. **Create ThemeProvider**
   - New file: `components/ui/ThemeProvider.tsx`
   - Wraps the app in theme context
   - Handles SSR (avoids flash of wrong theme)

5. **Create theme toggle component**
   - New file: `components/ui/ThemeToggle.tsx`
   - Sun/moon icon button
   - Placed in the site header

6. **Wire up the layout**
   - File: `app/layout.tsx`
   - Wrap children with ThemeProvider
   - Add script to prevent flash of unstyled content (FOUC)

### Phase 2: Public Gallery & Exhibition Pages (Highest Impact)
**Scope:** The pages where dark mode matters most
**Files affected:** ~15-20 files

Priority pages and components:
- `app/[locale]/works/` — gallery grid, artwork cards
- `app/[locale]/exhibitions/` — exhibition listings, detail pages
- `components/features/exhibitions/` — ExhibitionCard, ExhibitionDetail, map views
- `components/features/artworks/` — ArtworkCard, ArtworkDetail, ArtworkGrid
- `components/layout/Header.tsx` — must adapt for both modes
- `components/layout/Footer.tsx` — currently bg-black (may already work well)

**Pattern for component updates:**
```
Before:  bg-white text-black border-gray-light
After:   bg-white dark:bg-[#121212] text-black dark:text-[#F0F0F0] border-gray-light dark:border-[#333333]
```

### Phase 3: Remaining Public Pages
**Scope:** All other public-facing routes
**Files affected:** ~15-20 files

- `app/[locale]/about/` — biography page
- `app/[locale]/press/` — press/timeline
- `app/[locale]/contact/` — inquiry form
- `app/[locale]/archive/` — archive info
- `app/[locale]/privacy/` and `app/[locale]/terms/`
- Shared components: modals, forms, search, navigation

### Phase 4 (Optional): Admin Panel
**Scope:** Internal tooling — lowest priority
**Files affected:** ~18 files

The admin panel (`app/admin/*`, `components/admin/*`) could remain light-only since it's internal. If desired later:
- `AdminSidebar.tsx` is already dark (bg-black) — may need minimal changes
- Admin forms, tables, and cards would need systematic updates

---

## Key Files Reference

| File | Role | Change Type |
|------|------|-------------|
| `tailwind.config.ts` | Tailwind configuration | Add `darkMode: 'class'` |
| `app/globals.css` | Global styles, CSS variables, component classes | Add dark variable block + dark class variants |
| `app/layout.tsx` | Root layout | Add ThemeProvider, FOUC prevention script |
| `components/layout/Header.tsx` | Site header | Add ThemeToggle, update colors |
| `components/layout/Footer.tsx` | Site footer | Review (already dark-ish) |
| `lib/hooks/useTheme.ts` | **New** — Theme state management | Create |
| `components/ui/ThemeProvider.tsx` | **New** — React context provider | Create |
| `components/ui/ThemeToggle.tsx` | **New** — Toggle button UI | Create |

---

## Scope Estimate

| Phase | Files | Color Declarations | Effort |
|-------|-------|-------------------|--------|
| Phase 1: Infrastructure | 4-5 | ~20 (globals.css classes) | Low-Medium |
| Phase 2: Gallery & Exhibitions | 15-20 | ~200 | Medium |
| Phase 3: Remaining Public Pages | 15-20 | ~150 | Medium |
| Phase 4: Admin (optional) | ~18 | ~200 | Medium |
| **Total (without admin)** | **~40** | **~370** | **Medium** |

---

## Things to Watch For

- **Flash of unstyled content (FOUC):** Must add an inline script in `<head>` that reads localStorage and applies the `dark` class before React hydrates. Otherwise users see a white flash on dark mode page loads.
- **Image presentation:** Photographs should have consistent framing. Consider a subtle dark border or shadow on images in dark mode so they don't bleed into the background.
- **Gold accent contrast:** The current gold (`#B8945F`) has a 3.4:1 ratio against `#121212` — borderline for WCAG AA. The proposed lighter gold (`#C9A870`) improves this to ~4.5:1.
- **Map components:** Google Maps has its own dark theme that would need to be toggled separately via the Maps API styling options.
- **Grain overlay:** The SVG grain texture in `globals.css` uses `mix-blend-mode: overlay` — test that this still looks right on dark backgrounds.
- **Hero slider:** Contains hardcoded hex values (`#f3f4f6`, `#000000`) in CSS that won't respond to Tailwind dark prefixes — these need manual CSS updates.
- **Transitions:** Add a smooth `transition-colors` to the body/html so toggling doesn't feel jarring.

---

## Design System Update Required

When implementing, update `docs/DESIGN_SYSTEM.md` to include:
- Dark mode color palette (the table above)
- Dark mode component specifications
- Guidelines for image presentation in dark mode
- Contrast ratio requirements for both modes

---

## References

- Existing light palette: `docs/DESIGN_SYSTEM.md` (Section 2: Color Palette)
- Tailwind dark mode docs: https://tailwindcss.com/docs/dark-mode
- WCAG contrast requirements: 4.5:1 for normal text, 3:1 for large text
