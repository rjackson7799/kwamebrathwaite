# CLAUDE.md - Kwame Brathwaite Archive Website

## Project Overview

Official archive website for legendary photographer Kwame Brathwaite, founder of the Black is Beautiful movement. This is a modern, multi-lingual photography archive serving collectors, museums, educators, and the general public.

## Documentation (Source of Truth)

All project documentation is in `/docs`:

| File | Purpose | Priority |
|------|---------|----------|
| **TECHNICAL_SPEC_v2.md** | Technical architecture, API endpoints, database schema, admin panel spec | **PRIMARY REFERENCE** |
| DATABASE_SCHEMA.sql | Complete SQL schema ready to run in Supabase | Database setup |
| PRD.md | Business requirements, user personas, features | Requirements |
| DESIGN_SYSTEM.md | Visual specs, colors, typography, components | Design reference |

**Always consult TECHNICAL_SPEC_v2.md first** for any architectural decisions.

## Tech Stack

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript
- **Styling:** Tailwind CSS
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth (admin only)
- **Storage:** Supabase Storage
- **Hosting:** Vercel
- **Email:** Resend API + React Email
- **i18n:** next-intl + DeepL API
- **Maps:** Google Maps API
- **State:** React Query (TanStack Query)
- **Rich Text:** TipTap

## Project Structure

```
app/
├── [locale]/                 # Public routes (en, fr, ja)
│   ├── page.tsx             # Homepage
│   ├── works/               # Gallery
│   ├── exhibitions/         # Exhibitions
│   ├── press/               # Press coverage
│   ├── about/               # Biography
│   ├── archive/             # Archive info
│   ├── contact/             # Inquiry form
│   ├── privacy/             # Privacy policy
│   └── terms/               # Terms of use
├── admin/                    # Admin panel (no locale)
│   ├── artworks/
│   ├── exhibitions/
│   ├── press/
│   ├── inquiries/
│   ├── content/
│   ├── newsletter/
│   ├── media/
│   └── activity/
└── api/                      # API routes
```

## Coding Conventions

### General
- Use TypeScript for all files
- Use functional components with hooks
- Prefer named exports
- Use absolute imports with `@/` prefix

### Naming
- Components: PascalCase (`ArtworkCard.tsx`)
- Utilities/hooks: camelCase (`useArtworks.ts`)
- API routes: kebab-case folders, `route.ts` files
- Database fields: snake_case (matches Supabase)

### File Organization
```
components/
├── ui/                 # Reusable UI components
├── layout/             # Header, Footer, etc.
├── features/           # Feature-specific components
└── admin/              # Admin-only components

lib/
├── supabase/           # Supabase client & queries
├── api/                # API helpers
├── utils/              # Utility functions
└── hooks/              # Custom hooks
```

## Multi-Agent Development Strategy

### Parallel-Safe Features (Can be developed simultaneously)
- **Agent A:** Public pages (`app/[locale]/*`)
- **Agent B:** Admin panel (`app/admin/*`)
- **Agent C:** API routes (`app/api/*`)
- **Agent D:** Components (`components/*`)

### Sequential Features (Must be coordinated)
- Database schema changes
- Shared components used by multiple features
- Global state/context
- Environment variables

### Coordination Rules
1. Update PROGRESS.md before ending any session
2. Note any shared dependencies in PROGRESS.md
3. Don't modify files another agent is working on
4. Create feature branches for major work

## Context Window Management

**IMPORTANT:** Alert the user when approximately 30% of the context window has been used.

When alerting:
1. Summarize what was accomplished
2. Update PROGRESS.md with current state
3. Note any pending work
4. Suggest starting a fresh conversation if needed

## Progress Tracking

Always check and update `PROGRESS.md` in the project root:
- Mark completed items
- Update "in progress" section
- Add any blockers or questions
- Prioritize next steps

## Key Implementation Notes

### Localization
- Default locale `en` has no URL prefix
- French (`/fr`) and Japanese (`/ja`) have prefixes
- Use next-intl for static UI strings
- Use DeepL API + translation_cache table for dynamic content

### Authentication
- Admin only (no public user accounts)
- Supabase Auth with email/password
- Protect all `/admin` routes and `/api/admin/*` endpoints

### Forms
- Use honeypot field for spam protection (not CAPTCHA)
- Server-side validation on all inputs
- Rate limiting on public form submissions

### Images
- Use Next.js Image component
- Store in Supabase Storage buckets
- Generate thumbnails on upload
- Lazy load below fold

### Status Fields
- Content: `draft`, `published`, `archived`
- Artworks availability: `available`, `sold`, `on_loan`, `not_for_sale`, `inquiry_only`
- Inquiries: `new`, `read`, `responded`, `archived`

## Commands Reference

```bash
# Development
npm run dev

# Build
npm run build

# Database (run in Supabase SQL editor)
# See /docs/DATABASE_SCHEMA.sql
```

## Questions?

If unclear about any architectural decision, consult:
1. TECHNICAL_SPEC_v2.md (primary)
2. PRD.md (business context)
3. DESIGN_SYSTEM.md (visual specs)
4. Ask the user for clarification
