# Catalog sorting + pagination

**Date:** 2026-07-21
**Status:** Approved

## Problem

The catalog page (`/catalog`) heading already reads "Compounds, A–Z," but the actual list was
never sorted — `CatalogBrowser.tsx`'s `filtered` list preserves whatever order the compounds
happen to appear in `content/compounds.ts` (not alphabetical). There's also no pagination —
all matching compounds (currently 32, growing over time per prior scoping notes) render in one
long list.

## Goals

- Sort the catalog list alphabetically by compound name.
- Paginate at 10 compounds per page, with a "← Prev / Page X of Y / Next →" control.
- Reset to page 1 whenever the search text, category filter, or goal filter changes.

## Non-goals

- No change to search, category-filter, or goal-filter logic — purely adding sort +
  pagination on top of the existing filtered result set.
- No numbered page buttons — Prev/Next + a page-count label is enough at this catalog size
  (currently max 4 pages at 10/page).
- No URL/query-string sync for the current page — consistent with search/filters, which are
  already local component state, not URL-synced.
- No change to the catalog detail pages (`/catalog/[id]`).

## Design

All changes are in `components/CatalogBrowser.tsx`:

1. **Sort:** after the existing `.filter(...)` in the `filtered` `useMemo`, add
   `.sort((a, b) => a.name.localeCompare(b.name))`.
2. **Pagination state:** a new `PAGE_SIZE = 10` constant and `const [page, setPage] =
   useState(1)`.
3. **Reset on filter change:** `useEffect(() => setPage(1), [q, cat, goal])` — otherwise
   narrowing a filter could strand the view on a now-out-of-range page.
4. **Paginated slice:** `const paginated = filtered.slice((page - 1) * PAGE_SIZE, page *
   PAGE_SIZE)` — the `<ul>` renders `paginated`, not `filtered`. The `{filtered.length}
   compounds` count label above the list keeps counting the full filtered set (that's a
   "how many total match" label, not a "how many shown," and shouldn't change).
5. **Controls:** below the `<ul>` (and only rendered when `filtered.length > PAGE_SIZE`, i.e.
   more than one page exists), a row with a `.btn-secondary` "← Prev" button (disabled at page
   1), a centered "Page X of Y" label, and a `.btn-secondary` "Next →" button (disabled at the
   last page) — matching the button style already used elsewhere in this component's filter
   chips and the app's `.btn-secondary` convention.

## Testing

No test framework exists in this project — verification is `npm run build` plus a manual
browser check: confirm the list renders alphabetically, confirm exactly 10 items show on page
1 (32 compounds → pages of 10/10/10/2), confirm Prev/Next navigate correctly and disable at the
boundaries, and confirm changing a filter/search resets back to page 1.
