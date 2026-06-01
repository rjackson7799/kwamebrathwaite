# Plan: Add Search to Exhibitions Page

## Context

The public exhibitions page (`/exhibitions`) currently only supports filtering by tab (Current / Upcoming / Past) and toggling between List / Map views. There is no text search. The `SearchBar` component and `useDebounce` hook already exist and are used on the Works page (currently disabled there). This plan adds a search bar to the exhibitions page and wires it through the API.

---

## Files to Modify

| File | Change |
|------|--------|
| `app/api/exhibitions/route.ts` | Add `q` query param — search title, venue, city |
| `lib/api/validation.ts` | Add `q` to `exhibitionFiltersSchema` |
| `app/[locale]/exhibitions/page.tsx` | Add `SearchBar` UI + debounced search state + URL persistence |

---

## Step 1 — API: `app/api/exhibitions/route.ts`

Add `q` (optional string) to the query parsing. When present, filter with:

```ts
if (q) {
  query = query.or(`title.ilike.%${q}%,venue.ilike.%${q}%,city.ilike.%${q}%`)
}
```

Apply after the `type` date filter and before pagination.

---

## Step 2 — Validation: `lib/api/validation.ts`

Add `q: z.string().optional()` to `exhibitionFiltersSchema` (mirrors `artworkFiltersSchema` pattern).

---

## Step 3 — Page: `app/[locale]/exhibitions/page.tsx`

### State
```ts
const [searchQuery, setSearchQuery] = useState(searchParams.get('q') ?? '')
const debouncedQuery = useDebounce(searchQuery, 400)  // reuse lib/hooks/useDebounce.ts
```

### URL persistence
Push `q` into the URL alongside `view` and `filter` when `debouncedQuery` changes (useEffect).

### API fetch
Pass `q={debouncedQuery}` in the fetch call to `/api/exhibitions`.

### UI placement
Place `SearchBar` (from `components/ui/SearchBar.tsx`) between the page header and the filter tabs. Full-width on mobile, max-400px right-aligned on desktop — matching the Works page pattern.

---

## Verification

1. Run `npm run dev`
2. Navigate to `/exhibitions`
3. Type in the search bar — results should filter after ~400ms debounce
4. Confirm the `q=` param appears in the URL
5. Confirm search works independently across all three tabs (Current / Upcoming / Past)
6. Confirm clearing the search restores the full list
7. Confirm Map view also respects the search query
