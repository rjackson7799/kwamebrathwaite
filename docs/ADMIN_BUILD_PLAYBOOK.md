# Admin Portal Build Playbook

Battle-tested patterns from production admin portals built with **Next.js 14 (App Router) + Supabase + Vercel + Resend**. Use this as a reference when spinning up admin panels for new sites.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Auth & Route Protection](#auth--route-protection)
3. [Supabase Client Factories](#supabase-client-factories)
4. [Admin Shell (Layout & Nav)](#admin-shell)
5. [Leads / Inquiries System](#leads--inquiries-system)
6. [Spam Protection](#spam-protection)
7. [Generic CRUD Pattern](#generic-crud-pattern)
8. [Email Infrastructure](#email-infrastructure)
9. [Activity Log (Audit Trail)](#activity-log)
10. [Cron Jobs (Weekly Digest)](#cron-jobs)
11. [Database Conventions](#database-conventions)
12. [Folder Structure Template](#folder-structure-template)
13. [Environment Variables Checklist](#environment-variables-checklist)

---

## Architecture Overview

```
Browser ─► Middleware (auth check + session refresh)
              │
              ├── /admin/* pages ─► AuthGuard wrapper ─► Admin UI
              │
              ├── /api/admin/* ─► requireAuth() ─► Business logic ─► Supabase
              │
              └── /api/public/* ─► Rate limit ─► Honeypot ─► Spam score ─► Supabase
```

**Key decisions:**
- Supabase Auth (email/password), not NextAuth — simpler, same DB
- Honeypot + server-side scoring, not CAPTCHA — better UX, no third-party dependency
- Dual-layer auth (middleware + per-route) — defense in depth
- Activity log from day 1 — cheap to add early, expensive to retrofit
- In-memory rate limiting (swap to Upstash Redis for multi-instance)

---

## Auth & Route Protection

### Middleware (First Layer)

Intercepts all `/admin/*` and `/api/admin/*` requests. Redirects unauthenticated page requests to login; returns 401 JSON for API requests.

```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Protect admin API routes
  if (pathname.startsWith('/api/admin')) {
    if (pathname.startsWith('/api/admin/auth/')) return NextResponse.next()

    const response = NextResponse.next({ request: { headers: request.headers } })
    const supabase = createSupabaseMiddlewareClient(request, response)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }
    return response
  }

  // Protect admin pages
  if (pathname.startsWith('/admin')) {
    if (pathname === '/admin/login') return NextResponse.next()

    const response = NextResponse.next({ request: { headers: request.headers } })
    const supabase = createSupabaseMiddlewareClient(request, response)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
    return response
  }

  // Public routes
  return intlMiddleware(request)
}

export const config = {
  matcher: [
    '/((?!api|_next|_vercel|.*\\..*).*)',
    '/api/admin/:path*',
  ],
}
```

### Per-Route Auth (Second Layer)

Every admin API route also calls `requireAuth()` — defense in depth.

```typescript
// lib/api/admin.ts
export async function requireAuth(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      user: null,
      errorResponse: errorResponse('UNAUTHORIZED', 'Authentication required', 401),
    }
  }
  return { user, errorResponse: null }
}

// Usage in any admin API route:
export async function GET(request: NextRequest) {
  const { user, errorResponse: authError } = await requireAuth(request)
  if (authError) return authError
  // ... business logic
}
```

### Login Flow

1. **Login page** (`app/admin/login/page.tsx`) — form with email + password
2. **API route** (`app/api/admin/auth/login/route.ts`) — calls `supabase.auth.signInWithPassword()`
3. **AuthGuard** (`components/admin/AuthGuard.tsx`) — client component wrapping admin layout, listens to `onAuthStateChange`

---

## Supabase Client Factories

Three factories for different contexts:

```typescript
// lib/supabase/server.ts

// SSR — for server components & API routes (respects RLS + cookies)
export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll(c) { ... } } }
  )
}

// Admin — bypasses RLS via service role key (for inserts from public forms, logging)
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Public — anon key for ISR/SSG where cookies() unavailable
export function createPublicClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**When to use each:**
| Context | Factory | Why |
|---------|---------|-----|
| Admin API routes | `createClient()` | Respects RLS, has user session |
| Public form submissions | `createAdminClient()` | Public users can't auth; service role inserts |
| Activity logging | `createAdminClient()` | Don't want logging to fail due to RLS |
| ISR/SSG pages | `createPublicClient()` | No cookie store during revalidation |
| Client components | `createBrowserClient()` | From `lib/supabase/client.ts` |

---

## Admin Shell

### Layout

```typescript
// app/admin/layout.tsx
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex h-screen">
        <AdminSidebar />
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {children}
        </main>
      </div>
    </AuthGuard>
  )
}
```

### Reusable Admin Components

| Component | Purpose |
|-----------|---------|
| `AdminSidebar` | Fixed left nav with icons, active highlight, logout |
| `DataTable` | Paginated list with filters, sorting, action buttons |
| `PageHeader` | Breadcrumbs + title + description |
| `StatusBadge` | Color-coded status indicators |
| `ConfirmDialog` | Delete/destructive action confirmation modal |

---

## Leads / Inquiries System

This is the primary cross-site pattern. Every site needs a way for visitors to reach out, and admins need to manage those inquiries.

### Public Contact Form

```typescript
// components/features/contact/ContactForm.tsx
// Key elements:
// 1. Zod schema validation (name, email, phone?, inquiry_type, subject, message)
// 2. Hidden honeypot field (<input name="website" hidden />)
// 3. renderedAt timestamp (tracks how fast the form was submitted)
// 4. POST to /api/inquiries
```

### Inquiry API Route (Public)

```
POST /api/inquiries
  │
  ├── Rate limit (5/min per IP)
  ├── Honeypot check (website field filled → fake 200)
  ├── Zod validation
  ├── Spam scoring (see Spam Protection section)
  │     ├── score >= 3 → status='archived', admin_notes='SPAM (score N): reasons'
  │     └── score < 3  → status='new'
  ├── Insert via createAdminClient() (bypasses RLS)
  ├── Send user confirmation email
  └── Send admin notification (only if not spam)
```

### Admin Inquiry Management

**List page** (`/admin/inquiries`):
- Filters: status (new/read/responded/archived), type (general/purchase/exhibition/press), search
- Sortable columns: contact, subject, type, status, date
- Click row → detail page

**Detail page** (`/admin/inquiries/[id]`):
- Full contact info + message
- Status dropdown + admin notes textarea
- "Mark as Responded" button → sets status + `responded_at` + `responded_by`
- Delete with confirmation

### Database Schema

```sql
CREATE TABLE inquiries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  subject VARCHAR(255),
  message TEXT NOT NULL,
  inquiry_type VARCHAR(50),        -- 'general', 'purchase', 'press', etc.
  status VARCHAR(50) DEFAULT 'new', -- 'new', 'read', 'responded', 'archived'
  locale VARCHAR(5) DEFAULT 'en',
  admin_notes TEXT,
  responded_at TIMESTAMP WITH TIME ZONE,
  responded_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_inquiries_status ON inquiries(status);
CREATE INDEX idx_inquiries_type ON inquiries(inquiry_type);
CREATE INDEX idx_inquiries_created ON inquiries(created_at DESC);
```

### Status Workflow

```
new → read → responded → archived
         └──────────────► archived (spam or dismissed)
```

---

## Spam Protection

Multi-layer, no CAPTCHA required:

### Layer 1: Honeypot

Hidden `website` field. If filled (bots auto-fill), return fake success (200) without inserting.

### Layer 2: Rate Limiting

```typescript
// lib/api/rate-limit.ts
const result = rateLimit(getClientIP(request), 5, 60000) // 5 per minute per IP
if (!result.success) return errorResponse('RATE_LIMIT_EXCEEDED', 'Too many requests', 429)
```

### Layer 3: Spam Scoring

Combinatorial heuristic scoring — each signal adds weight:

| Signal | Weight | Detection |
|--------|--------|-----------|
| Gibberish name (consonant/vowel ratio > 3) | +3 | `looksLikeGibberish()` |
| URL in name | +3 | Regex match |
| Gibberish subject | +2 | Same ratio check |
| Message too short (< 20 chars) | +2 | Length check |
| Multiple URLs in message (>= 2) | +2 | URL regex count |
| Submitted in < 3 seconds | +2 | `renderedAt` timestamp comparison |
| Disposable email domain | +3 | Set lookup (mailinator, tempmail, etc.) |
| Gmail dot-abuse repeat (30 days) | +3 | Normalize + DB lookup |
| Duplicate email (10 min window) | +2 | Normalized email DB lookup |

**Threshold:** Score >= 3 → auto-archive as spam with reasons in `admin_notes`.

**Gmail normalization:** Strips dots and `+tag` suffixes (`j.o.h.n+spam@gmail.com` → `john@gmail.com`).

---

## Generic CRUD Pattern

### Standardized API Response

```typescript
// lib/api/response.ts
// Success: { success: true, data: T, metadata?: { page, pageSize, total, totalPages } }
// Error:   { success: false, error: { code, message, details? } }

export function successResponse<T>(data: T, metadata?: ResponseMetadata, status = 200)
export function errorResponse(code: string, message: string, status = 400, details?: unknown)
```

### Standard Admin API Route Shape

```typescript
// app/api/admin/[resource]/route.ts
export async function GET(request: NextRequest) {
  const { user, errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const status = searchParams.get('status')
  const search = searchParams.get('search')

  let query = supabase.from('resource').select('*', { count: 'exact' })
  if (status) query = query.eq('status', status)
  if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  return successResponse(data, { page, pageSize: limit, total: count, totalPages: Math.ceil(count / limit) })
}
```

---

## Email Infrastructure

### Setup

```typescript
// lib/email/client.ts — Resend client + config
// lib/email/send.ts — Three helpers:

sendEmail(options)       // Generic: to, subject, react component, replyTo
sendAdminEmail(subject, react)  // To admin + CC list, prefixed "[Admin]"
sendUserEmail(to, subject, react)  // To user, replyTo admin
```

### Email Templates

React Email components in `lib/email/templates/`:
- `InquiryUserEmail` — confirmation to the person who submitted
- `InquiryAdminEmail` — notification to admin with contact details
- `LeadDigestEmail` — weekly summary of new leads

### Pattern

```typescript
// After inserting inquiry:
await sendUserEmail(email, 'We received your inquiry', InquiryUserEmail({ name, subject }))
if (!isSpam) {
  await sendAdminEmail(`New inquiry from ${name}`, InquiryAdminEmail({ name, email, subject, message }))
}
```

---

## Activity Log

Track every admin action for audit trail.

### Helper

```typescript
// lib/api/admin.ts
export async function logActivity(
  userEmail: string,
  action: ActivityAction,   // 'create' | 'update' | 'delete' | 'status_change' | 'reorder'
  entityType: EntityType,   // 'inquiry' | 'content' | 'media' | etc.
  entityId?: string,
  entityTitle?: string,
  changes?: Record<string, unknown>  // { field: { from: old, to: new } }
)
```

### Usage

```typescript
await logActivity(user.email!, 'status_change', 'inquiry', id, inquiry.subject, {
  status: { from: oldStatus, to: newStatus }
})
```

### Database

```sql
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email VARCHAR(255),
  action VARCHAR(50),
  entity_type VARCHAR(50),
  entity_id UUID,
  entity_title VARCHAR(255),
  changes JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## Cron Jobs

### Weekly Lead Digest (Vercel Cron)

```typescript
// app/api/cron/leads-weekly/route.ts
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  // Run digest logic
  await sendLeadDigest({ runId })
  return NextResponse.json({ success: true })
}
```

```json
// vercel.json
{ "crons": [{ "path": "/api/cron/leads-weekly", "schedule": "0 22 * * 0" }] }
```

---

## Database Conventions

| Convention | Example |
|------------|---------|
| Primary keys | UUID with `uuid_generate_v4()` |
| Column naming | `snake_case` (matches Supabase) |
| Status fields | `VARCHAR(50)` with app-level enums, not DB enums |
| Timestamps | `TIMESTAMP WITH TIME ZONE DEFAULT NOW()` |
| Soft delete | Status → 'archived', not actual deletion |
| Indexes | On status, type, and `created_at DESC` for filtered lists |
| RLS | Public INSERT (validated server-side); authenticated SELECT/UPDATE/DELETE |
| Foreign keys | `ON DELETE SET NULL` for optional refs, `CASCADE` for required |

---

## Folder Structure Template

```
app/
  admin/
    login/page.tsx              # Login form
    layout.tsx                  # AuthGuard + sidebar wrapper
    [resource]/
      page.tsx                  # List view
      [id]/page.tsx             # Detail / edit view
  api/
    [public-endpoint]/route.ts  # Public submissions (rate limited)
    admin/
      auth/
        login/route.ts          # POST: sign in
        logout/route.ts         # POST: sign out
      [resource]/
        route.ts                # GET (list), POST (create)
        [id]/route.ts           # GET, PUT, DELETE
    cron/
      [job-name]/route.ts       # Vercel Cron endpoints

components/
  admin/
    AdminSidebar.tsx
    AuthGuard.tsx
    DataTable.tsx
    PageHeader.tsx
    StatusBadge.tsx
    ConfirmDialog.tsx
  features/
    contact/ContactForm.tsx     # Public form with honeypot

lib/
  supabase/
    server.ts                   # createClient, createAdminClient, createPublicClient
    client.ts                   # Browser client
    types.ts                    # Generated DB types
  api/
    admin.ts                    # requireAuth, logActivity, getCurrentUserEmail
    response.ts                 # successResponse, errorResponse
    rate-limit.ts               # rateLimit, getClientIP
    spam.ts                     # scoreInquiry, normalizeEmail
    validation.ts               # Zod schemas
    pagination.ts               # getPagination helper
  email/
    client.ts                   # Resend client + EMAIL_CONFIG
    send.ts                     # sendEmail, sendAdminEmail, sendUserEmail
    templates/                  # React Email components

middleware.ts                   # Auth + i18n routing
```

---

## Environment Variables Checklist

```bash
# Required for all admin portals
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=

# Email (required for notifications)
RESEND_API_KEY=
ADMIN_EMAIL=
EMAIL_FROM=

# Cron jobs (required for digests)
CRON_SECRET=

# Optional
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
GOOGLE_GEOCODING_API_KEY=
OPENAI_API_KEY=               # For AI draft messages
```

---

## Quick Start for New Sites

1. **Scaffold** — Copy folder structure template above
2. **Database** — Create inquiries + activity_log tables, enable RLS
3. **Auth** — Set up Supabase Auth, create admin user, wire middleware
4. **Shell** — Admin layout with AuthGuard + sidebar nav
5. **Leads** — Public form → API route (honeypot + spam scoring) → admin list/detail
6. **Email** — Resend setup, user confirmation + admin notification templates
7. **Activity log** — Wire `logActivity()` into all create/update/delete operations
8. **Cron** — Weekly digest if needed, secure with CRON_SECRET
