# Catalog Sorting + Pagination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sort the catalog list alphabetically by compound name and paginate it at 10 compounds per page, with the page resetting to 1 whenever search or filters change.

**Architecture:** All changes live in one existing client component, `components/CatalogBrowser.tsx` — a `.sort()` added to the existing filtered-results `useMemo`, new `page` state with a `useEffect` reset on filter change, a sliced render, and a Prev/Next control below the list.

**Tech Stack:** React 18 client component, TypeScript, Tailwind CSS + the project's existing `.btn-secondary` primitive.

## Global Constraints

- No test framework exists in this project (no Jest/Vitest, no test script in `package.json`). Verification is `npm run build` (type-check) plus a manual browser check.
- Sort: alphabetical by `compound.name`, via `localeCompare`.
- Pagination: exactly 10 per page (`PAGE_SIZE = 10`). Page resets to 1 whenever the search text, category filter, or goal filter changes.
- The "N compounds" count label above the list continues to reflect the full filtered count, not the paginated-page count — that label means "how many match your filters," unchanged behavior.
- Pager controls (Prev/Next + "Page X of Y") render only when there's more than one page (`filtered.length > PAGE_SIZE`).
- No change to search/filter logic, no URL sync for page state, no numbered page buttons, no change to `/catalog/[id]`.

---

## Task 1: Sort + paginate the catalog list

**Files:**
- Modify: `components/CatalogBrowser.tsx`

**Interfaces:**
- Consumes: nothing new — same `compounds: Compound[]` and `goals: string[]` props this component already receives.
- Produces: nothing consumed elsewhere — this is a self-contained UI change with no exports other than the existing default export.

- [ ] **Step 1: Add the `useEffect` import**

Current top of `components/CatalogBrowser.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
```

Change to:

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
```

- [ ] **Step 2: Add the page-size constant**

Immediately after the existing `TYPE_CHIPS` constant declaration (before the `chipClass` function), add:

```tsx
const PAGE_SIZE = 10;
```

- [ ] **Step 3: Sort the filtered results and add pagination state**

The current `filtered` memo is:

```tsx
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return compounds.filter((c) => {
      if (cat !== "all" && c.category !== cat) return false;
      if (goal !== "all" && !c.goals.includes(goal)) return false;
      if (!needle) return true;
      const hay = [c.name, ...c.aka, c.summary].join(" ").toLowerCase();
      return hay.includes(needle);
    });
  }, [compounds, q, cat, goal]);
```

Replace it with (adds `.sort(...)` and the new pagination state/derived values directly below it):

```tsx
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return compounds
      .filter((c) => {
        if (cat !== "all" && c.category !== cat) return false;
        if (goal !== "all" && !c.goals.includes(goal)) return false;
        if (!needle) return true;
        const hay = [c.name, ...c.aka, c.summary].join(" ").toLowerCase();
        return hay.includes(needle);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [compounds, q, cat, goal]);

  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [q, cat, goal]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
```

- [ ] **Step 4: Render the paginated slice instead of the full filtered list**

Find:

```tsx
      <ul className="mt-2">
        {filtered.map((c) => (
```

Change `filtered.map` to `paginated.map`:

```tsx
      <ul className="mt-2">
        {paginated.map((c) => (
```

The rest of that `<li>` block (thumbnail, name, evidence badge, summary) is unchanged — do not modify anything inside the `.map()` callback.

- [ ] **Step 5: Add the pager controls**

The current end of the component is:

```tsx
      {filtered.length === 0 && (
        <p className="py-10 text-center font-sans text-sm text-muted">
          No compounds match your filters.
        </p>
      )}
    </div>
  );
}
```

Replace it with (adds the Prev/Next pager after the empty-state check):

```tsx
      {filtered.length === 0 && (
        <p className="py-10 text-center font-sans text-sm text-muted">
          No compounds match your filters.
        </p>
      )}

      {filtered.length > PAGE_SIZE && (
        <div className="mt-6 flex items-center justify-center gap-6 border-t border-rule-soft pt-6">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary disabled:cursor-not-allowed disabled:opacity-40"
          >
            ← Prev
          </button>
          <span className="font-sans text-[12px] text-muted">
            Page {page} of {pageCount}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            disabled={page === pageCount}
            className="btn-secondary disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Type-check and build**

Run: `npm run build`
Expected: build succeeds with no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add components/CatalogBrowser.tsx
git commit -m "Sort catalog alphabetically and paginate at 10 per page"
```

---

## Task 2: Manual verification

**Files:** none (verification only, no code changes).

**Interfaces:**
- Consumes: the running dev server's `/catalog` page, updated by Task 1.
- Produces: nothing (terminal task).

- [ ] **Step 1: Restart the dev server clean**

This project has a known gotcha: running `npm run build` while the dev server is also running against the same `.next` directory corrupts it. Stop the dev server, `rm -rf .next`, restart it before testing.

- [ ] **Step 2: Confirm sort order**

Open `/catalog` with no search or filters active. Confirm the first page's 10 compound names are in alphabetical order (case-insensitive), and that this is a real change from before (the catalog previously rendered in whatever order `content/compounds.ts` defines them, which is not alphabetical — e.g. "Creatine Monohydrate" used to appear before "Beta-Alanine").

- [ ] **Step 3: Confirm pagination**

With 32 total compounds and no filters active, confirm: page 1 shows exactly 10 compounds and the pager reads "Page 1 of 4"; the "← Prev" button is disabled on page 1; clicking "Next →" three times reaches "Page 4 of 4" showing the remaining 2 compounds, with "Next →" now disabled; clicking "← Prev" navigates back correctly.

- [ ] **Step 4: Confirm the "N compounds" count label is unaffected**

Confirm the count label above the list still reads "32 compounds" (the full filtered count) regardless of which page is showing — it should never read "10 compounds" just because only 10 are visible on the current page.

- [ ] **Step 5: Confirm filter-change resets to page 1**

Navigate to page 2 or later (e.g. via Next →). Then type into the search box, or click a different type/goal filter chip. Confirm the view jumps back to page 1 automatically (and if the new filtered result set has 10 or fewer matches, confirm the pager control disappears entirely, per the `filtered.length > PAGE_SIZE` guard).

- [ ] **Step 6: Report results**

Summarize what was checked and any visual issues found. If issues are found, fix them in `components/CatalogBrowser.tsx`, re-run `npm run build`, and re-check before considering this task done. No commit needed for this task unless a fix was made (in which case, commit the fix with a message describing what was wrong).
