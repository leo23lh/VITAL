# VitalPeps — Editorial UI Overhaul (Subagent-Driven Plan)

## Context

The app (Next.js 14 + TS + Tailwind + Dexie PWA, 32-compound catalog, protocol builder, dose tracker) currently wears a half-applied **Swiss Deco** theme (cream/ink/rust, Oswald condensed, dark sidebar). The user has chosen a different, fully-resolved direction: **VitalPeps Editorial** — a printed-magazine aesthetic (serif prose, masthead, rules, drop caps, pull-quotes, hatch photo placeholders).

**This overhaul supersedes Swiss Deco entirely.** Task #8 ("finish Swiss Deco retheme") is obsolete — the tokens, nav, and every surface are replaced here. The product is also **renamed to VitalPeps**.

**This is a presentation-only overhaul.** No data model, business logic, or safety behavior changes. Every guardrail must survive intact: the acknowledgment gate, evidence grading, auto-disclaimers on limited/anecdotal compounds, "anecdotal — not evidence" labeling, COA/third-party vendor framing, and the info-only (no-buy-link) treatment of high-risk entries.

---

## Global Constraints

These bind every task. Reviewers use this section verbatim as the attention lens.

### Palette (exact values)

| Token | Value | Use |
|---|---|---|
| `paper` | `#eeece6` | page canvas |
| `surface` | `#ffffff` | article/card surfaces |
| `ink` | `#161311` | primary text, 2px masthead rule, bars |
| `rust` | `#a3311c` | accent: eyebrows, active nav, links, callout rules |
| `muted` | `#8a8378` | meta/caption text **only** — never body copy |
| `body` | `#3a352f` | body prose |
| `rule` | `rgba(22,19,17,.15)` | hairline rules |
| `rule-soft` | `rgba(22,19,17,.12)` | list-row separators |
| `ev-strong` | `#1a4d2e` | Strong evidence |
| `ev-moderate` | `#8a6d1a` | Moderate evidence |
| `ev-limited` / `ev-anecdotal` | `#a3311c` | Limited / Anecdotal |

**Accessibility:** `muted` (~3:1 on paper) is for non-essential meta only. All body copy uses `body` or `ink`. Never encode meaning in color alone — evidence pills always carry their text label.

### Typography

- **Serif** (headlines + body prose): `Georgia, 'Times New Roman', serif`
- **Sans** (UI chrome: nav, eyebrows, section headers, buttons, meta): `-apple-system, 'Helvetica Neue', Arial, sans-serif`
- **Mono** (photo-placeholder captions): `ui-monospace, Menlo, monospace`

Scale: cover h1 `52px/1.05` w700 · section h1 `38px` · detail h1 `46px` · dek italic serif `19px/1.55` in `body` · card h2 `22px` · prose `16px/1.75` · list copy `14px/1.5`.

**Eyebrow:** sans, `11px`, `letter-spacing:1.5px`, uppercase, `rust` (or `muted` for numbered features).
**Section header:** sans, `13px`, `letter-spacing:1.5px`, uppercase, `border-bottom:2px solid rule`, `padding-bottom:8px`.

### Signature elements (reusable)

- **Hatch placeholder:** `repeating-linear-gradient(135deg, rgba(22,19,17,.07) 0 9px, transparent 9px 18px)` (thumbnails: `.08`, `0 7px, 7px 14px`).
- **Masthead strip:** sans `11px` uppercase `letter-spacing:1px` `muted`; left `VitalPeps · Vol. I`, right `An educational reference — not medical advice`; `1px solid rule` bottom.
- **Masthead:** serif `30px` w700 wordmark + uppercase sans nav; `border-bottom:2px solid ink`. Active nav = `rust` + `border-bottom:2px solid rust`.
- **Button (primary):** `1px solid ink`, `padding:9px 18px`, sans `13px`. **Secondary:** `rust` text + `1px solid rust` bottom border.
- **Evidence pill:** outlined, sans `10.5px`, `letter-spacing:.5px`, uppercase, `padding:2px 7px`, border+text = semantic color.
- **Safety callout:** `surface` bg, `border-top:3px solid rust`, `border-bottom:1px solid rule`, `padding:14px 20px`; label "A note on safety" in sans `11px` uppercase w700 `rust`.
- **Pull-quote:** `border-left:4px solid rust`, `background:rgba(163,49,28,.05)`, `padding:16px 20px`, italic serif `17px/1.6`.
- **Drop cap:** `float:left; font-size:56px; line-height:.8; padding:6px 8px 0 0; font-weight:700` on the first paragraph of "How it works".
- **Stat box:** `2px solid ink`, `padding:10px 18px`; rust uppercase sans label + `14px` w700 value.

### Layout

- Article/detail column: `max-width:900px`, centered, `64px` side padding (collapse to `20px` under `768px`).
- Index pages: `1200px` max, `40px` side padding.
- **Desktop nav:** top masthead — Catalog / Protocols / Tracker. Wordmark links home. **Settings** lives in the footer (not the primary nav).
- **Mobile (<768px):** masthead compacts; **bottom tab bar** with 3 tabs (Catalog / Protocols / Tracker), active = `rust` + `2px` top border. Add `padding-bottom` to main so the bar never covers content.
- Sharp corners throughout — **no `border-radius`** anywhere (strip existing `rounded-*`).

### Non-negotiables

1. **No behavior changes.** Same routes, props, state, data flow, Dexie calls, notification logic.
2. **All safety UI preserved** (gate, auto-disclaimers, anecdotal labels, COA/third-party framing, no buy links on high-risk entries).
3. **Responsive** at 375 / 768 / 1280 — no horizontal scroll on the page body.
4. **Build clean:** `npm run build` passes, no type/lint errors, no new console errors.
5. Delete Swiss Deco remnants (`oswald`, `cream`, `sage`, `brand-*` remap) rather than layering over them.

---

## Pre-Flight (controller, before Task 1)

1. `git init` in `/Users/admin/peptide-companion`, add a Next.js `.gitignore`, commit the current state as the baseline. **The SDD loop requires this** — per-task commits and `review-package BASE HEAD` diffs cannot work otherwise.
2. Create branch `editorial-overhaul`.
3. Record the merge-base commit for the final whole-branch review.

---

## Tasks

Each task is independently reviewable. **Task 1 is the dependency root** — everything else consumes its tokens. Tasks 4–9 touch disjoint files and may run in any order (dispatch sequentially — never parallel implementers).

### Task 1 — Design foundation *(model: standard)*
**Files:** `app/globals.css`, `tailwind.config.ts`

Replace the Swiss Deco system with the editorial one. Define every palette token above as CSS variables + Tailwind colors; register `font-serif` / `font-sans` / `font-mono` families; remove `oswald`/`cream`/`sage` and the `brand-*` rust remap; keep `darkMode: "class"` (never applied — single committed light theme).

Provide reusable utility classes so later tasks don't re-implement primitives: `.eyebrow`, `.section-head`, `.hatch`, `.hatch-thumb`, `.dropcap`, `.pull-quote`, `.safety-callout`, `.btn`, `.btn-secondary`, `.stat-box`, `.masthead-strip`, `.rule`. Set base `body` to serif prose on `paper`; global `border-radius: 0`.

**Done when:** classes exist and are documented with a comment block; `npm run build` passes.

### Task 2 — Masthead, shell & rebrand *(model: standard)*
**Files:** `app/layout.tsx`, `components/Nav.tsx`, `public/manifest.json`, `app/globals.css` (only if a shell class is missing)

Build the masthead strip + wordmark + uppercase nav (Catalog/Protocols/Tracker, active = rust underline), the mobile bottom tab bar, and an editorial footer carrying the standing "not medical advice" line **plus the Settings link**. Rebrand everything to **VitalPeps** (metadata title/description, manifest `name`/`short_name`, `themeColor: "#161311"`, wordmark). Replace the Swiss Deco sidebar entirely.

**Done when:** nav highlights the current route on desktop and mobile; Settings reachable from the footer; no route regressions.

### Task 3 — Shared primitives *(model: cheap)*
**Files:** `components/EvidenceBadge.tsx`, `lib/evidence.ts`, `components/Disclaimer.tsx`, `components/DisclaimerGate.tsx`

Convert evidence badges to outlined semantic pills (strong `#1a4d2e`, moderate `#8a6d1a`, limited/anecdotal `#a3311c`) — swap the Tailwind `bg-*-100` classes in `EVIDENCE_META.classes` for the outlined treatment. Restyle `Disclaimer`/`AutoEvidenceDisclaimer` as the **safety callout**, and the gate as a centered editorial modal on `surface`.

**Preserve exactly:** `showAutoDisclaimer` logic, all label/blurb strings, gate acknowledgment flow.

### Task 4 — Home / cover *(model: cheap)*
**File:** `app/page.tsx`

Rebuild as the magazine cover (mockup `1a`): "Cover Story" eyebrow → 52px serif headline → italic dek → outlined + secondary CTAs → hatch photograph band with mono caption → three numbered features (`01 — Reference` / `02 — Build` / `03 — Track`) separated by left hairline rules. Keep the existing `DueDoses compact` today's-doses section, restyled.

### Task 5 — Catalog index *(model: standard)*
**Files:** `app/catalog/page.tsx`, `components/CatalogBrowser.tsx`

Convert the card grid to **editorial list rows** (mockup `1b`): 64px hatch thumb · `CATEGORY · GOAL` eyebrow · 22px serif name + evidence pill · 14px description · hairline separator. Search becomes an underlined input; type/goal filters become outlined **chips** (active = filled ink) replacing the `<select>`s. Page header: "Catalog" eyebrow, "Compounds, A–Z" h1, italic dek.

**Preserve:** all filtering logic (search across name/aka/summary, category + goal filters), the result count, and the empty state. All 32 compounds and 4 categories (supplement/peptide/sarm/hormone) remain filterable.

### Task 6 — Compound detail *(model: most capable)*
**Files:** `app/catalog/[id]/page.tsx`, `components/VendorTable.tsx`

The flagship template (mockup `1c`), 900px centered column: back link → `CATEGORY · GOAL` eyebrow → 46px name → aka line → italic dek → **safety callout** → **"On this page"** anchor chips → sections with underlined sans headers. "How it works" opens with a **drop cap**. Onset/duration render as **stat boxes**. Benefits/side effects two-column (stack on mobile). **Community reports** render as rust **pull-quotes** with sentiment attribution. Citations as a numbered editorial list with rust links.

**Preserve exactly:** section order and the Catalog-v2 content (`effects`, `reportedExperiences`, vendor pricing incl. the "checked Jul 2026" stamp and clinician-gated Enhanced row), the "no studies cited" state, and **no buy links/pricing on high-risk entries**.

### Task 7 — Protocols *(model: standard)*
**Files:** `components/ProtocolBuilder.tsx`, `app/protocols/page.tsx`, `app/protocols/new/page.tsx`, `app/protocols/[id]/page.tsx`

Two-column builder (mockup `1d`): `1fr 340px`, numbered section headers ("1 · Choose a goal", "2 · Add compounds"), goal **chips**, compound rows with **square** checkboxes + dose meta, and a right summary rail (left hairline border) with the protocol name, count, line items, and an outlined "Save protocol". Index/detail pages get matching editorial treatment.

**Preserve:** all builder state, validation, Dexie persistence, and activate/delete behavior.

### Task 8 — Tracker *(model: standard)*
**Files:** `app/tracker/page.tsx`, `components/DueDoses.tsx`, `components/AdherenceChart.tsx`

Mockup `1e`: "Tracker" eyebrow + "Today's Doses" h1; dose rows with square checkboxes, serif names, sans meta; adherence block with large serif numerals (streak / average) split by a hairline rule, and the bar chart in `ink` (partial days at 25% opacity).

**Preserve:** take/skip/undo flows, `ensureDayLogs`, notification scheduling, streak/average math.

### Task 9 — Settings *(model: cheap)*
**File:** `app/settings/page.tsx`

Editorial forms: section headers, hairline-separated rows, outlined controls/buttons. **Preserve** notification permission flow, quiet hours, and the re-read-disclaimer action.

### Task 10 — Consistency & responsive polish *(model: standard)*
**Files:** any needing touch-ups

Cross-page sweep: verify no `border-radius`, no orphan Swiss Deco tokens, no `muted` used for body copy, consistent spacing rhythm; test 375/768/1280 for horizontal overflow and bottom-nav overlap; confirm focus states are visible on the new outlined controls.

---

## Execution Protocol (subagent-driven)

Per `superpowers:subagent-driven-development`:

1. **Ledger:** check/create `.superpowers/sdd/progress.md`; append `Task N: complete (commits <base>..<head>, review clean)` after each clean review. Never re-dispatch a task the ledger marks complete.
2. **Per task:** `scripts/task-brief PLAN_FILE N` → dispatch **one** implementer (brief path + report path + interfaces from prior tasks + the Global Constraints block). Implementer implements, verifies, commits, self-reviews, writes its report to the report file.
3. **Review:** record BASE before dispatch (never `HEAD~1`); run `scripts/review-package BASE HEAD`; dispatch the task reviewer with brief + report + package + Global Constraints. Require **both** verdicts (spec compliance + code quality). Dispatch a fix subagent for Critical/Important; log Minor findings in the ledger for final triage.
4. **Never** run implementers in parallel; never skip the re-review after a fix.
5. **Final:** dispatch the whole-branch review on the most capable model with a `review-package MERGE_BASE HEAD`, then `superpowers:finishing-a-development-branch`.

**Model policy:** specify the model on every dispatch. Cheap for single-file transcription (Tasks 3, 4, 9); standard for multi-file/interactive (1, 2, 5, 7, 8, 10); most capable for Task 6 and the final review.

---

## Verification

**Per task:** `npm run build` clean; implementer reports the command and output.

**End-to-end** (browser preview, `npm run dev`):
- **Visual:** each screen matches its mockup counterpart — masthead + 2px rule, serif headlines, drop cap on detail, rust pull-quotes, hatch placeholders, outlined evidence pills.
- **Safety (must all still hold):** gate blocks first use; a `limited` compound (e.g. BPC-157) shows the auto-disclaimer; community reports sit under "anecdotal — not evidence"; **insulin shows no buy links/pricing** and keeps its emergency warning; COA/third-party framing intact.
- **Function:** catalog search + category/goal chips filter all 32 compounds; build → save → activate a protocol; log take/skip/undo and see adherence update; notification toggle works.
- **Responsive:** 375 / 768 / 1280 — no horizontal scroll, bottom nav doesn't cover content.
- Check `read_console_messages` and `preview_logs` for errors; screenshot each key screen as proof.

## Out of scope

- Content/data changes (catalog copy, pricing, citations are frozen — Catalog v2 just landed).
- Logic, schema, or Dexie changes; new features.
- Real photography (hatch placeholders stand in).
- Dark mode (single committed light theme).
