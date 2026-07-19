# Supporting pages: About / FAQ / Legal

**Date:** 2026-07-19
**Status:** Approved

## Problem

VitalPeps has no About, FAQ, or Legal/disclaimer page. The footer only carries an inline
one-line disclaimer and a link to Settings. There's nowhere to point a new user who wants
to understand what the app is, how their data is handled, or the fuller legal/safety
picture beyond the one-time acknowledgment gate.

## Goals

- Add three static, reference-style pages: About, FAQ, Legal.
- Reuse the existing VitalPeps Editorial design system exactly as-is — no new visual
  primitives.
- Keep scope lightweight: no formal Privacy Policy / Terms of Service documents, no
  interactive FAQ accordion, no personal creator narrative on About.
- Link all three from the footer only; primary nav and mobile tab bar are unchanged.

## Non-goals

- No new CSS primitives or layout components.
- No client-side interactivity (no accordion, no search/filter on FAQ).
- No formal legal documents (ToS/Privacy Policy) — this is a personal/local-first project,
  not a company with an entity behind it.
- No changes to the existing `DisclaimerGate` one-time acknowledgment flow — the Legal page
  supplements it, doesn't replace it.

## Architecture

Three new static server-component pages, following the exact page-level pattern already
established (see `app/tracker/page.tsx`, `app/catalog/page.tsx`):

```
eyebrow (small label)
  -> h1 (serif, 38px, bold)
    -> italic intro paragraph (serif, 15px)
      -> one or more <section> blocks, each headed by .section-head
```

No new components. No new CSS — `eyebrow`, `section-head`, `pull-quote`, `safety-callout`,
and standard body typography (all in `app/globals.css`) cover every visual need identified
below.

### Files

- `app/about/page.tsx` — new
- `app/faq/page.tsx` — new
- `app/legal/page.tsx` — new
- `app/layout.tsx` — footer edited to add three links

No routing config needed beyond the file-based routes Next.js App Router creates
automatically. No changes to `components/Nav.tsx` (primary/mobile nav unchanged).

## Page content specs

### About (`/about`)

Eyebrow: "About". Intro: one italic sentence restating the app's purpose (educational
reference + personal tracker, not medical advice).

Sections (each a `section-head` + body copy):
- **What this is** — an evidence-graded reference and protocol/dose tracker for peptides
  and supplements; local-first, no accounts.
- **Who it's for** — people already using or considering these compounds who want
  better-sourced information than forum threads, framed as harm reduction rather than
  encouragement.
- **How evidence is graded** — the strong/moderate/limited/anecdotal scale used throughout
  the catalog, and why some compounds (e.g. BPC-157, TB-500) have no dosing guidance at
  all rather than an invented one.
- **What it isn't** — not medical advice, not a recommendation to use any substance, not a
  vendor or marketplace.

### FAQ (`/faq`)

Eyebrow: "FAQ". Intro: one italic sentence ("Answers to the questions we get asked most").

Three `section-head`-grouped lists of Q&A pairs (question as bold lead-in, answer as body
copy directly beneath — no accordion, no client JS):

- **Safety & evidence**
  - Is this medical advice? (No — restate the disclaimer gate's core point, link to
    `/legal`.)
  - How is evidence graded, and why do some compounds have no listed dose?
  - Why are some compounds (SARMs, hormones, AAS) in the catalog at all if they're
    high-risk? (Harm reduction: better to have honest info than none.)
- **Data & privacy**
  - Where does my data live? (Local IndexedDB via Dexie, on-device only, `userId`
    defaulting to "local".)
  - What does the AI protocol builder send anywhere? (Your typed goal text goes to
    Anthropic's API to generate a suggestion; nothing is saved server-side; the result
    still requires your explicit "Save protocol" to persist locally.)
  - Can I delete my data? (Point to Settings — whatever the existing data-management
    affordance is; verify it during implementation rather than asserting a feature that
    may not exist.)
- **Using the app**
  - What's the difference between a template, AI-generated, and from-scratch protocol?
  - How does the tracker work day-to-day?
  - Why do some catalog entries have no vendor/buy links? (High-risk entries — insulin,
    EPO, AAS, HGH — are info-only by design; some vendors are clinician-gated telehealth
    with no public price.)

Legal/regulatory questions (substance legality, jurisdiction) are deliberately **not**
duplicated here — the FAQ's safety answers link to `/legal` instead.

### Legal (`/legal`)

Eyebrow: "Legal". Intro: one italic sentence framing this as the fuller version of the
one-time disclaimer gate.

Sections:
- **Not medical advice** — full restatement of the DisclaimerGate copy: educational
  reference only, not a substitute for a licensed healthcare professional, talk to a
  doctor before starting/stopping/changing anything.
- **Research chemical status** — many cataloged peptides are sold as research chemicals,
  not approved for human use; legality varies by country; purity/contents are the seller's
  responsibility, not this app's.
- **Your data** — everything (catalog interactions, protocols, tracker history) lives in
  browser-local IndexedDB via Dexie; nothing is transmitted to any server **except** the
  text you type into the AI protocol builder, which goes to Anthropic's API solely to
  generate a suggestion.
- **AI protocol builder** — one paragraph: what you type is sent to Claude via a server
  route, the response is cross-checked against the real catalog before you ever see it,
  and nothing is saved until you explicitly hit "Save protocol."

The core "not medical advice" section reuses the `safety-callout` primitive (same visual
treatment as elsewhere in the app) rather than plain body copy, to keep it visually
distinct as the most important section on the page.

## Footer changes

Current footer (`app/layout.tsx`) has a disclaimer paragraph and a single `Settings` link
styled `.btn-secondary`. Add `About`, `FAQ`, and `Legal` links in the same row, same style,
after Settings — order: Settings, About, FAQ, Legal. No wrapping/overflow concerns at this
link count on mobile (footer already stacks fine at narrow widths per existing layout).

## Testing / verification

No business logic to unit test — these are static content pages. Verification is manual:
load each of `/about`, `/faq`, `/legal` in the dev server, confirm typography matches
existing pages (eyebrow/h1/section-head rendering correctly), confirm footer links
navigate correctly from every page, confirm mobile layout doesn't break (footer already
has bottom padding reserved for the mobile tab bar — new links must not collide with it).

## Open questions resolved during brainstorming

- Legal scope: lightweight disclaimer page, not formal ToS/Privacy Policy. Decided.
- About tone: what-and-why, no personal narrative. Decided.
- FAQ topics: safety/evidence, data/privacy, using-the-app. Legal/regulatory excluded
  (lives on `/legal` instead). Decided.
- Nav placement: footer only. Decided.
- FAQ interaction: static list, not accordion. Decided.
