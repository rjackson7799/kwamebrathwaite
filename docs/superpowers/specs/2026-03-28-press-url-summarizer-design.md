# Press URL Summarizer - Design Spec

## Context

The admin press form (`/admin/press/new` and `/admin/press/[id]/edit`) requires manual entry of all fields including the article excerpt/summary. When adding press coverage, admins typically have the URL to the original article and must read it, then write a summary manually.

This feature adds AI-powered article summarization: the admin pastes a URL, clicks "Generate Summary", and the system fetches the article, extracts metadata, and generates a configurable-length summary (default 100 words, range 50-600) using GPT-4o. The summary and extracted metadata auto-fill the form fields.

## Architecture

### Data Flow

1. Admin enters URL in the "External URL" field of PressForm
2. Admin optionally adjusts word count (default: 100, range: 50-600)
3. Admin clicks "Generate Summary" button
4. Client calls `POST /api/admin/press/summarize-url` with `{ url, wordCount }`
5. Server (authenticated via `requireAuth()`) fetches the URL HTML with `fetch()`
6. Server parses HTML with `cheerio` to extract:
   - **Article text**: from `<article>`, `<main>`, or falling back to `<p>` tags
   - **OG metadata**: `og:title`, `og:site_name`, `article:author`, `article:published_time`, `og:description`
   - **Meta tags**: `<meta name="author">`, `<title>`, `<time>` elements
7. Server sends cleaned article text to GPT-4o with a prompt requesting a summary at the specified word count
8. Server returns summary + extracted metadata to client
9. Client populates form fields using `setValue()` from react-hook-form:
   - `excerpt` <- generated summary
   - `title` <- extracted article title (only if field is currently empty)
   - `publication` <- extracted publication/site name (only if empty)
   - `author` <- extracted author (only if empty)
   - `publish_date` <- extracted publish date (only if empty)

### Only-if-empty rule

Metadata auto-fill (title, publication, author, publish_date) only populates fields that are currently empty. If the admin has already typed a title, it won't be overwritten. The excerpt field is always overwritten since that's the primary output.

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `lib/ai/press-summarizer.ts` | **Create** | URL fetching, cheerio HTML parsing, article text extraction, GPT-4o summarization |
| `lib/ai/prompts.ts` | **Modify** | Add `PRESS_SUMMARY_SYSTEM_PROMPT` and `buildPressSummaryPrompt(articleText, wordCount)` |
| `lib/ai/types.ts` | **Modify** | Add `PressSummaryResult` interface |
| `lib/ai/index.ts` | **Modify** | Export new press summarizer function |
| `app/api/admin/press/summarize-url/route.ts` | **Create** | POST endpoint with auth, validation, error handling |
| `lib/api/validation.ts` | **Modify** | Add `pressSummarizeUrlSchema` Zod schema |
| `components/admin/PressForm.tsx` | **Modify** | Add URL summarization UI (button, word count input, loading states) |

### New Dependency

- `cheerio` - lightweight HTML parser (~200KB), jQuery-like API for server-side HTML manipulation

## API Endpoint

### `POST /api/admin/press/summarize-url`

**Authentication:** `requireAuth()` (admin only, consistent with all `/api/admin/*` routes)

**Request body:**
```json
{
  "url": "https://nytimes.com/article-about-brathwaite",
  "wordCount": 100
}
```

**Validation (Zod):**
```typescript
export const pressSummarizeUrlSchema = z.object({
  url: z.string().url('Invalid URL'),
  wordCount: z.coerce.number().int().min(50).max(600).default(100),
})
```

**Success response:**
```json
{
  "success": true,
  "data": {
    "summary": "Generated summary text...",
    "title": "Article Title from OG/meta",
    "author": "Author Name",
    "publication": "The New York Times",
    "publish_date": "2026-01-15",
    "tokens_used": 2100,
    "cost_usd": 0.032
  }
}
```

**Error responses:**
- `400` - Invalid URL format (Zod validation)
- `401` - Not authenticated
- `422` - Could not fetch URL (unreachable, timeout, non-HTML response)
- `422` - Could not extract article content (paywalled, empty, JS-rendered SPA)
- `500` - GPT-4o API failure

## Article Extraction Logic (`lib/ai/press-summarizer.ts`)

### URL Fetching
- Use native `fetch()` with a 10-second timeout
- Set a browser-like `User-Agent` header to avoid bot blocking
- Validate response is HTML (check `Content-Type` header)
- Limit response body to 500KB to prevent memory issues

### HTML Parsing with Cheerio
1. **Metadata extraction** (OG tags + meta tags + HTML elements):
   - Title: `og:title` -> `<meta name="title">` -> `<title>` -> `<h1>`
   - Author: `article:author` -> `<meta name="author">` -> byline patterns
   - Publication: `og:site_name` -> domain name fallback
   - Publish date: `article:published_time` -> `<time datetime>` -> `<meta name="date">`

2. **Article text extraction** (priority order):
   - `<article>` tag content
   - `<main>` tag content
   - `[role="main"]` content
   - Fallback: all `<p>` tags from `<body>`

3. **Text cleaning**:
   - Strip `<script>`, `<style>`, `<nav>`, `<header>`, `<footer>`, `<aside>` tags
   - Remove ads, social share buttons (common class patterns)
   - Collapse whitespace
   - Truncate to ~4000 words (to stay within GPT-4o token limits)

## GPT-4o Prompt

### System Prompt (`PRESS_SUMMARY_SYSTEM_PROMPT`)
```
You are a press summary writer for the Kwame Brathwaite Archive, the official archive
of legendary photographer Kwame Brathwaite, founder of the Black is Beautiful movement.

Your task is to summarize press articles about Kwame Brathwaite or related topics into
a compelling teaser summary. The summary should:

- Capture the key points and narrative of the article
- Highlight the cultural and historical significance of Brathwaite's work when relevant
- Be written in a professional, archival tone suitable for a museum/gallery website
- End with a compelling hook that makes readers want to read the full article
- Be exactly the requested word count (within 10% tolerance)

Return ONLY the summary text, no headers or formatting.
```

### User Prompt
```
Summarize the following article in approximately {wordCount} words:

---
{articleText}
---
```

### GPT-4o Configuration
- Model: `gpt-4o-2024-08-06` (same as existing artwork generation)
- Temperature: 0.7
- Max tokens: 1500 (sufficient for 600 words)
- No JSON response format needed (plain text output)

## UI Changes to PressForm

### New UI Section

A new "AI Summary" bar appears **between the URL field and the Excerpt field** inside the Content card. It is only visible when the URL field has a valid URL.

**Layout:**
```
Content Card
  |- External URL field (existing)
  |- AI Summary bar (NEW)
  |    |- Word count input (number, default 100, min 50, max 600)
  |    |- "Generate Summary" button with Wand2 icon
  |- Excerpt textarea (existing)
```

### States

1. **Hidden** - No URL entered, or URL is invalid
2. **Ready** - Valid URL present, button enabled
3. **Loading** - Button shows spinner + "Fetching article..." then "Generating summary..."
4. **Error** - Red inline message with retry button
5. **Complete** - Fields populated, brief success indicator that fades after 2 seconds

### Styling
- Matches the existing admin form aesthetic (white bg, gray borders, black buttons)
- Compact horizontal bar layout (word count input + button on one line)
- Uses Lucide icons: `Wand2` for button, `Loader2` for spinner, `AlertCircle` for errors, `Check` for success
- All icons already imported/available in the project

### Form Field Population
```typescript
// Using existing setValue from react-hook-form
const currentValues = getValues()
setValue('excerpt', data.summary)
if (!currentValues.title && data.title) setValue('title', data.title)
if (!currentValues.publication && data.publication) setValue('publication', data.publication)
if (!currentValues.author && data.author) setValue('author', data.author)
if (!currentValues.publish_date && data.publish_date) setValue('publish_date', data.publish_date)
```

Note: `getValues` needs to be destructured from `useForm` alongside the existing `setValue`.

## Cost Estimate

- GPT-4o input: ~2-3K tokens (article text) = ~$0.005-0.0075
- GPT-4o output: ~150-800 tokens (50-600 word summary) = ~$0.0015-0.008
- Total: ~$0.01-0.03 per summarization
- No translation cost (summaries are in English only)

## Error Handling

| Scenario | User-facing message |
|----------|-------------------|
| URL unreachable / timeout | "Could not reach this URL. Please check the link and try again." |
| Non-HTML response (PDF, image) | "This URL does not point to a web article." |
| No article content extracted | "Could not extract article content from this URL. The site may require a login or use JavaScript rendering." |
| GPT-4o API error | "Summary generation failed. Please try again." |
| OpenAI API key missing | "AI features are not configured. Please set the OPENAI_API_KEY environment variable." |

## Verification Plan

1. **Unit test the extraction**: Fetch a known article URL, verify metadata and text extraction
2. **Manual test on admin form**:
   - Paste a real press article URL about Kwame Brathwaite
   - Click Generate Summary with default 100 words
   - Verify excerpt field is populated with ~100 word summary
   - Verify title, author, publication, date fields are auto-filled
   - Change word count to 500, regenerate, verify longer summary
   - Test with empty/invalid URL -> verify error states
   - Test with paywalled article -> verify graceful error
3. **Test only-if-empty rule**: Pre-fill title, generate summary, verify title is not overwritten
4. **Build verification**: `npm run build` passes with no TypeScript errors
