# Development Guide
## Kwame Brathwaite Archive Website

This guide outlines the development strategy, conventions, and patterns for the project.

---

## Table of Contents

1. [Multi-Agent Development Strategy](#multi-agent-development-strategy)
2. [Development Phases](#development-phases)
3. [Project Structure](#project-structure)
4. [Naming Conventions](#naming-conventions)
5. [Component Patterns](#component-patterns)
6. [API Route Patterns](#api-route-patterns)
7. [Database Access Patterns](#database-access-patterns)
8. [Internationalization](#internationalization)
9. [Styling Guidelines](#styling-guidelines)
10. [Git Workflow](#git-workflow)

---

## Multi-Agent Development Strategy

### Parallel-Safe Boundaries

Multiple agents can work simultaneously on these areas without conflicts:

| Agent | Ownership | Files/Folders |
|-------|-----------|---------------|
| **Agent A** | Public pages | `app/[locale]/*` |
| **Agent B** | Admin panel | `app/admin/*` |
| **Agent C** | API routes | `app/api/*` |
| **Agent D** | Components | `components/*` |

### Sequential/Coordinated Work

These require coordination (one agent at a time):

- **Database schema changes** - Modify `docs/DATABASE_SCHEMA.sql`
- **Shared types** - `lib/supabase/types.ts`
- **Global state/context** - `lib/hooks/*`, `lib/utils/*`
- **Environment variables** - Update `.env.example`
- **Tailwind config** - `tailwind.config.ts`

### Coordination Protocol

1. **Before starting:** Check `PROGRESS.md` for current work
2. **Claim work:** Mark items as "In Progress" in `PROGRESS.md`
3. **After completing:** Update checklist and add notes
4. **Dependencies:** Document any new shared code created

---

## Development Phases

### Phase 1: Foundation (Current)
- Project setup, configuration
- Base layouts and styling
- Supabase client setup

### Phase 2: Public Pages
- All `app/[locale]/*` pages
- Reusable components
- Data fetching hooks

### Phase 3: API Routes
- All `app/api/*` endpoints
- Form handling
- Translation integration

### Phase 4: Admin Panel
- Authentication
- CRUD interfaces
- Media management

### Phase 5: Polish
- SEO optimization
- Performance tuning
- Accessibility audit

---

## Project Structure

```
kwame-brathwaite-archive/
├── app/
│   ├── [locale]/           # Public routes with i18n
│   │   ├── layout.tsx      # Locale wrapper
│   │   ├── page.tsx        # Homepage
│   │   ├── works/
│   │   ├── exhibitions/
│   │   ├── press/
│   │   ├── about/
│   │   ├── archive/
│   │   ├── contact/
│   │   ├── privacy/
│   │   └── terms/
│   ├── admin/              # Admin routes (no i18n)
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── [resource]/
│   ├── api/                # API routes
│   │   ├── artworks/
│   │   ├── exhibitions/
│   │   └── ...
│   ├── globals.css
│   └── layout.tsx          # Root layout
├── components/
│   ├── ui/                 # Reusable UI (Button, Input, etc.)
│   ├── layout/             # Header, Footer, Navigation
│   ├── features/           # Feature components (ArtworkCard, etc.)
│   └── admin/              # Admin-specific components
├── lib/
│   ├── supabase/           # Database client & types
│   ├── api/                # API helpers
│   ├── utils/              # Utility functions
│   └── hooks/              # Custom React hooks
├── messages/               # i18n translation files
│   ├── en.json
│   ├── fr.json
│   └── ja.json
├── docs/                   # Documentation
└── public/                 # Static assets
```

---

## Naming Conventions

### Files & Folders

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `ArtworkCard.tsx` |
| Pages | lowercase | `page.tsx` |
| API routes | lowercase folders | `app/api/artworks/route.ts` |
| Utilities | camelCase | `formatDate.ts` |
| Hooks | camelCase with `use` | `useArtworks.ts` |
| Types | PascalCase | `Artwork`, `Exhibition` |

### Database Fields

Use snake_case (matches Supabase):
- `created_at`
- `image_url`
- `display_order`

### CSS Classes

Use Tailwind utilities or component classes defined in `globals.css`:
- `.btn-primary`
- `.btn-secondary`
- `.input`
- `.card`

---

## Component Patterns

### Server Components (Default)

```tsx
// app/[locale]/works/page.tsx
import { createClient } from '@/lib/supabase/server'

export default async function WorksPage() {
  const supabase = await createClient()
  const { data: artworks } = await supabase
    .from('artworks')
    .select('*')
    .eq('status', 'published')

  return <ArtworkGrid artworks={artworks} />
}
```

### Client Components

```tsx
// components/features/LightBox.tsx
'use client'

import { useState } from 'react'

export function Lightbox({ images }: { images: string[] }) {
  const [isOpen, setIsOpen] = useState(false)
  // ...
}
```

### Component File Structure

```tsx
// components/features/ArtworkCard.tsx

import Image from 'next/image'
import Link from 'next/link'
import type { Artwork } from '@/lib/supabase/types'

type ArtworkCardProps = {
  artwork: Artwork
  priority?: boolean
}

export function ArtworkCard({ artwork, priority = false }: ArtworkCardProps) {
  return (
    <Link href={`/works/${artwork.id}`} className="card">
      {/* ... */}
    </Link>
  )
}
```

---

## API Route Patterns

### Standard Response Format

```typescript
// Success
{
  success: true,
  data: T | T[],
  metadata?: { page, pageSize, total, totalPages }
}

// Error
{
  success: false,
  error: { code: string, message: string, details?: any }
}
```

### Route Handler Template

```typescript
// app/api/artworks/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const { data, error, count } = await supabase
      .from('artworks')
      .select('*', { count: 'exact' })
      .eq('status', 'published')
      .range((page - 1) * limit, page * limit - 1)

    if (error) throw error

    return NextResponse.json({
      success: true,
      data,
      metadata: {
        page,
        pageSize: limit,
        total: count,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch artworks' } },
      { status: 500 }
    )
  }
}
```

---

## Database Access Patterns

### Client-Side (Browser)

```typescript
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()
const { data } = await supabase.from('artworks').select('*')
```

### Server-Side (Server Components, Route Handlers)

```typescript
import { createClient } from '@/lib/supabase/server'

const supabase = await createClient()
const { data } = await supabase.from('artworks').select('*')
```

### Admin Operations (Service Role)

```typescript
import { createAdminClient } from '@/lib/supabase/server'

const supabase = await createAdminClient()
// Has full access, bypasses RLS
```

---

## Internationalization

### Static Strings

Use `next-intl` with translation files in `/messages`:

```tsx
import { useTranslations } from 'next-intl'

export function Header() {
  const t = useTranslations('navigation')
  return <nav>{t('works')}</nav>
}
```

### Dynamic Content

Database content is translated via DeepL API with caching:

1. Content stored in English in database
2. On request for fr/ja, check `translation_cache`
3. If miss, call DeepL API and cache result
4. Return translated content

### URL Structure

- English (default): `/works`, `/exhibitions`
- French: `/fr/works`, `/fr/exhibitions`
- Japanese: `/ja/works`, `/ja/exhibitions`

---

## Styling Guidelines

### Design Tokens

All design tokens from `DESIGN_SYSTEM.md` are in `tailwind.config.ts`:

```tsx
// Colors
<div className="bg-black text-white" />
<div className="bg-charcoal" />
<div className="text-gray-warm" />

// Typography
<h1 className="text-display-1" />
<p className="text-body-lg" />

// Spacing
<section className="section-spacing" />
<div className="p-md" />
```

### Component Classes

Defined in `globals.css`:

```tsx
<button className="btn-primary">Primary</button>
<button className="btn-secondary">Secondary</button>
<input className="input" />
<div className="card">Card content</div>
```

### Responsive Design

Mobile-first approach:
```tsx
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4" />
```

---

## Git Workflow

### Branch Strategy

```
main (production)
└── staging (preview)
    └── feature/* (development)
```

### Commit Messages

Use conventional commits:
- `feat: add artwork detail page`
- `fix: correct image aspect ratio`
- `docs: update PROGRESS.md`
- `refactor: simplify API response handling`

### Before Committing

1. Run `npm run build` to check for errors
2. Update `PROGRESS.md` with changes
3. Test all affected functionality

---

## Quick Reference

### Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run lint     # Run ESLint
```

### Key Files

| File | Purpose |
|------|---------|
| `PROGRESS.md` | Track development progress |
| `CLAUDE.md` | AI assistant instructions |
| `docs/TECHNICAL_SPEC_v2.md` | Primary architecture reference |
| `docs/DESIGN_SYSTEM.md` | Visual design specs |
| `docs/DATABASE_SCHEMA.sql` | Database schema |

### Environment Variables

Required for development:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

See `.env.example` for full list.
