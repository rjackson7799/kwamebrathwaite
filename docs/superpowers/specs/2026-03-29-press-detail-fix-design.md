# Press Detail Page Fix + Admin Article Summary Enhancement

## Context

The press detail page at `/press/[id]` returns a 500 Internal Server Error on production (Vercel) for all press items. The build succeeds locally, indicating a runtime issue. Additionally, the admin press form's "Excerpt" field needs to be renamed to "Article Summary" and upgraded from a plain textarea to the existing TipTap-based `RichTextEditor` with HTML toggle support.

## Scope

### 1. Fix 500 Error on Press Detail Page

**File:** `app/[locale]/press/[id]/page.tsx`

The page calls `createClient()` (which uses `cookies()`) and `translatePageContent()` for non-English locales. A runtime failure in either path causes an unhandled 500.

**Changes:**
- Wrap the `getPressItem()` function's Supabase call in more robust error handling -- ensure any connection or query failure returns `null` cleanly (the existing `try/catch` may not be catching all failure modes)
- Wrap the translation calls in the `PressDetailPage` component with individual `try/catch` blocks so a translation failure falls back to the original English content rather than crashing the page
- Ensure the page calls `notFound()` for any data fetch failure rather than throwing a 500

### 2. Admin: Rename "Excerpt" to "Article Summary" with RichTextEditor

**File:** `components/admin/PressForm.tsx`

**Changes:**
- Change label from "Excerpt" to "Article Summary"
- Change helper text to "Article summary or quote - supports rich text formatting"
- Replace the `<Textarea>` (registered via `register('excerpt')`) with `<RichTextEditor>` wrapped in a `<Controller>` from react-hook-form
- Follow the same pattern used in `ArtworkForm.tsx` and `ExhibitionForm.tsx` for the Controller + RichTextEditor integration

**AI Summary feature preserved:**
- The existing AI summary generation (`POST /api/admin/press/summarize-url`) calls `setValue('excerpt', summary)` after generating
- `RichTextEditor` reacts to external value changes via its `useEffect` that calls `editor.commands.setContent(value)` when the value prop changes
- No changes needed to the summarizer API, the `generatePressSummary()` function, or the `setValue` call

### 3. No Database Changes

- The `excerpt` column is already `TEXT` type -- stores HTML content fine
- The `PressDetail` component already renders excerpt with `dangerouslySetInnerHTML`
- No schema migration needed

## Files to Modify

| File | Change |
|------|--------|
| `app/[locale]/press/[id]/page.tsx` | Add resilient error handling around data fetch and translation |
| `components/admin/PressForm.tsx` | Rename "Excerpt" to "Article Summary", swap Textarea for RichTextEditor |

## Files Referenced (no changes)

| File | Why |
|------|-----|
| `components/admin/RichTextEditor.tsx` | Existing component to reuse -- TipTap with HTML toggle |
| `components/features/press/PressDetail.tsx` | Already renders excerpt as HTML -- no changes needed |
| `lib/ai/press-summarizer.ts` | AI summary generation -- no changes needed |
| `app/api/admin/press/summarize-url/route.ts` | Summarize API route -- no changes needed |

## Verification

1. **500 fix:** Deploy to Vercel preview and verify press detail pages load without 500 errors. Test with at least 2 different press items across English and French locales.
2. **Admin form:** Navigate to admin press edit page, verify:
   - Label shows "Article Summary" (not "Excerpt")
   - RichTextEditor renders with formatting toolbar and HTML toggle (`</>` button)
   - Enter a URL, click "Generate Summary" -- AI summary populates into the RichTextEditor
   - Save the press item and verify the HTML content persists
3. **Public display:** View the saved press item on the public detail page -- verify rich HTML renders correctly (paragraphs, bold, links, etc.)
