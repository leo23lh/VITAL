# Supporting Pages (About / FAQ / Legal) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three static reference pages (About, FAQ, Legal) to VitalPeps and link them from the footer.

**Architecture:** Three new file-based Next.js App Router routes (`app/about/page.tsx`, `app/faq/page.tsx`, `app/legal/page.tsx`), each a plain server component using only existing typography primitives from `app/globals.css` (`eyebrow`, `section-head`, `Disclaimer`/`safety-callout`). One edit to the shared footer in `app/layout.tsx` to add the three links.

**Tech Stack:** Next.js 14 App Router, React 18 server components, Tailwind CSS (utility classes + the project's own primitive classes in `app/globals.css`), TypeScript.

## Global Constraints

- No new CSS primitives or components — reuse `eyebrow`, `section-head`, `.btn-secondary`, and the existing `Disclaimer` component (`components/Disclaimer.tsx`) exactly as they're used elsewhere in the app.
- No client-side interactivity on any of the three pages — plain server components, no `"use client"`.
- Internal links use `next/link`'s `Link`, matching every other internal link in the codebase (never a raw `<a>` for same-app navigation).
- Inline body-copy links use the established `text-rust hover:underline` pattern (see `components/DueDoses.tsx:57`), not a new link style.
- This project has **no test framework configured** (no Jest/Vitest, no `*.test.*` files, no test script in `package.json`). Verification for each task is `npm run build` (full type-check + route compile) plus a manual dev-server check — there is no unit-test step to add, and inventing a test framework is out of scope for this plan.
- Legal page content must be factually accurate to this codebase as of 2026-07-19: all user data (protocols, tracker history, settings) lives in browser-local IndexedDB via Dexie; the only outbound network call triggered by user data is the AI protocol builder's request to Anthropic's API via the server route at `app/api/generate-protocol/route.ts`; there is currently **no built-in data export/delete tool** in Settings (`app/settings/page.tsx`) beyond "Show disclaimer again" — do not claim one exists.

---

## Task 1: About page

**Files:**
- Create: `app/about/page.tsx`

**Interfaces:**
- Consumes: nothing (no imports from other new files).
- Produces: route `/about`, importable as a target for `Link href="/about"` in Task 4.

- [ ] **Step 1: Create the About page**

Create `app/about/page.tsx`:

```tsx
import Link from "next/link";

export default function AboutPage() {
  return (
    <div>
      <p className="eyebrow">About</p>
      <h1 className="mt-3 font-serif text-[38px] font-bold text-ink">About VitalPeps</h1>
      <p className="mt-3 max-w-[640px] font-serif text-[15px] italic leading-[1.6] text-body">
        An educational reference and personal tracker for peptides and supplements — not a
        recommendation to use anything.
      </p>

      <section className="mt-10 max-w-[640px]">
        <h2 className="section-head">What this is</h2>
        <p className="mt-5 font-serif text-[16px] leading-[1.75] text-body">
          VitalPeps is a catalog, protocol builder, and dose tracker for peptides, supplements,
          SARMs, and hormones. Every entry is graded on the actual evidence behind it and sourced
          to real citations, not marketing copy or forum consensus. Everything you enter — your
          protocols, your dose history — stays on your own device.
        </p>
      </section>

      <section className="mt-12 max-w-[640px]">
        <h2 className="section-head">Who it&apos;s for</h2>
        <p className="mt-5 font-serif text-[16px] leading-[1.75] text-body">
          People who are already using, or seriously considering, one of these compounds and
          want better-sourced information than a forum thread or a vendor&apos;s product page.
          This is harm reduction, not encouragement: the goal is that if you&apos;re going to do
          this, you do it with your eyes open.
        </p>
      </section>

      <section className="mt-12 max-w-[640px]">
        <h2 className="section-head">How evidence is graded</h2>
        <p className="mt-5 font-serif text-[16px] leading-[1.75] text-body">
          Every compound is rated <strong>strong</strong>, <strong>moderate</strong>,{" "}
          <strong>limited</strong>, or <strong>anecdotal</strong> based on the quality of human
          evidence behind it — not on how popular or promising it is. Where the evidence is
          thin, you&apos;ll see a warning inline rather than a confident-sounding dose. Some
          compounds, like BPC-157 and TB-500, have no validated human dosing at all, so
          VitalPeps deliberately doesn&apos;t offer one — inventing a number would be worse than
          leaving it blank.
        </p>
      </section>

      <section className="mt-12 max-w-[640px]">
        <h2 className="section-head">What it isn&apos;t</h2>
        <p className="mt-5 font-serif text-[16px] leading-[1.75] text-body">
          VitalPeps is not medical advice, not a recommendation to use any substance, and not a
          vendor or marketplace. It doesn&apos;t sell anything, and any vendor links in the
          catalog are third-party — read the{" "}
          <Link href="/legal" className="text-rust hover:underline">
            Legal page
          </Link>{" "}
          for the full picture.
        </p>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Type-check and build**

Run: `npm run build`
Expected: build succeeds with no TypeScript or lint errors, and the route list printed by Next.js includes `/about`.

- [ ] **Step 3: Commit**

```bash
git add app/about/page.tsx
git commit -m "Add About page"
```

---

## Task 2: FAQ page

**Files:**
- Create: `app/faq/page.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: route `/faq`, importable as a target for `Link href="/faq"` in Task 4.

- [ ] **Step 1: Create the FAQ page**

Create `app/faq/page.tsx`:

```tsx
import Link from "next/link";

export default function FaqPage() {
  return (
    <div>
      <p className="eyebrow">FAQ</p>
      <h1 className="mt-3 font-serif text-[38px] font-bold text-ink">
        Frequently Asked Questions
      </h1>
      <p className="mt-3 max-w-[640px] font-serif text-[15px] italic leading-[1.6] text-body">
        Answers to the questions we get asked most.
      </p>

      <section className="mt-10 max-w-[640px]">
        <h2 className="section-head">Safety &amp; evidence</h2>

        <p className="mt-5 font-serif text-[16px] leading-[1.75] text-body">
          <strong>Is this medical advice?</strong> No. VitalPeps is an educational reference and
          personal tracker, not a substitute for a licensed healthcare professional. Talk to a
          doctor before starting, stopping, or changing anything. See the{" "}
          <Link href="/legal" className="text-rust hover:underline">
            Legal page
          </Link>{" "}
          for the full disclaimer.
        </p>

        <p className="mt-5 font-serif text-[16px] leading-[1.75] text-body">
          <strong>How is evidence graded, and why do some compounds have no listed dose?</strong>{" "}
          Every compound is rated strong, moderate, limited, or anecdotal based on the quality of
          human evidence behind it. Where no validated human dosing exists — BPC-157 and TB-500,
          for example — VitalPeps shows that gap honestly instead of inventing a number.
        </p>

        <p className="mt-5 font-serif text-[16px] leading-[1.75] text-body">
          <strong>
            Why are high-risk compounds (SARMs, hormones, AAS) in the catalog at all?
          </strong>{" "}
          Because people already use them, and an honest, evidence-graded entry with real risks
          spelled out is safer than no information or a vendor&apos;s marketing copy. High-risk
          entries are info-only — VitalPeps doesn&apos;t link to buy pages for insulin, EPO, AAS,
          or HGH.
        </p>
      </section>

      <section className="mt-12 max-w-[640px]">
        <h2 className="section-head">Data &amp; privacy</h2>

        <p className="mt-5 font-serif text-[16px] leading-[1.75] text-body">
          <strong>Where does my data live?</strong> In your browser&apos;s local storage
          (IndexedDB), on your device only. There&apos;s no account and no server-side database
          of your protocols or tracker history.
        </p>

        <p className="mt-5 font-serif text-[16px] leading-[1.75] text-body">
          <strong>What does the AI protocol builder send anywhere?</strong> Only the goal text
          you type — for example, &ldquo;help me recover from a shoulder injury&rdquo; — is sent
          to Anthropic&apos;s API to generate a suggested protocol. The suggestion is checked
          against the real catalog before you see it, and nothing is saved anywhere until you
          explicitly tap &ldquo;Save protocol.&rdquo;
        </p>

        <p className="mt-5 font-serif text-[16px] leading-[1.75] text-body">
          <strong>Can I delete my data?</strong> There&apos;s no dedicated export or delete tool
          yet. Since everything lives in your browser&apos;s local storage, clearing this
          site&apos;s data (or using a private/incognito window) removes it completely.
        </p>
      </section>

      <section className="mt-12 max-w-[640px]">
        <h2 className="section-head">Using the app</h2>

        <p className="mt-5 font-serif text-[16px] leading-[1.75] text-body">
          <strong>
            What&apos;s the difference between a template, AI-generated, and from-scratch
            protocol?
          </strong>{" "}
          A template is a curated, goal-based starting point you tune yourself. &ldquo;Describe
          your goal&rdquo; asks the AI builder to suggest a starting point from the same catalog
          instead. From scratch skips both and starts empty. All three land on the same
          customize screen, and nothing saves until you choose to save it.
        </p>

        <p className="mt-5 font-serif text-[16px] leading-[1.75] text-body">
          <strong>How does the tracker work day-to-day?</strong> Your active protocol&apos;s
          doses show up as a due-today list; logging one marks it done and feeds your adherence
          history over time.
        </p>

        <p className="mt-5 font-serif text-[16px] leading-[1.75] text-body">
          <strong>Why do some catalog entries have no vendor/buy links?</strong> High-risk
          entries (insulin, EPO, AAS, HGH) are info-only by design. Some other vendors are
          clinician-gated telehealth services with no public price, so VitalPeps links to them
          without listing a price it can&apos;t verify.
        </p>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Type-check and build**

Run: `npm run build`
Expected: build succeeds with no TypeScript or lint errors, and the route list printed by Next.js includes `/faq`.

- [ ] **Step 3: Commit**

```bash
git add app/faq/page.tsx
git commit -m "Add FAQ page"
```

---

## Task 3: Legal page

**Files:**
- Create: `app/legal/page.tsx`

**Interfaces:**
- Consumes: `Disclaimer` component — `import { Disclaimer } from "@/components/Disclaimer"`, signature `Disclaimer({ children: React.ReactNode, title?: string })`, renders its children inside a `.safety-callout` box (see `components/Disclaimer.tsx:5-18`).
- Produces: route `/legal`, importable as a target for `Link href="/legal"` in Task 4. (Tasks 1 and 2 already link to `/legal` by path string, not by import, so this task has no back-reference to fix.)

- [ ] **Step 1: Create the Legal page**

Create `app/legal/page.tsx`:

```tsx
import { Disclaimer } from "@/components/Disclaimer";

export default function LegalPage() {
  return (
    <div>
      <p className="eyebrow">Legal</p>
      <h1 className="mt-3 font-serif text-[38px] font-bold text-ink">Legal &amp; Disclaimer</h1>
      <p className="mt-3 max-w-[640px] font-serif text-[15px] italic leading-[1.6] text-body">
        The fuller version of the disclaimer you acknowledged when you first opened VitalPeps.
      </p>

      <section className="mt-10 max-w-[640px]">
        <Disclaimer title="Not medical advice">
          <p>
            VitalPeps is an educational reference and personal tracker. It is not medical advice
            and is not a substitute for a licensed healthcare professional.
          </p>
          <p>
            Nothing here is a recommendation to take any substance. Talk to a doctor before
            starting, stopping, or changing anything — especially if you are pregnant, nursing,
            under 18, or taking medication.
          </p>
          <p>
            Evidence is graded honestly. Where studies are thin, you&apos;ll see a warning, and
            any testimonials are clearly marked as anecdotal, not proof.
          </p>
        </Disclaimer>
      </section>

      <section className="mt-12 max-w-[640px]">
        <h2 className="section-head">Research chemical status</h2>
        <p className="mt-5 font-serif text-[16px] leading-[1.75] text-body">
          Many peptides cataloged here are sold as research chemicals and are not approved for
          human use. Laws vary by country. Purity and contents of any product are the
          responsibility of the seller, not this app.
        </p>
      </section>

      <section className="mt-12 max-w-[640px]">
        <h2 className="section-head">Your data</h2>
        <p className="mt-5 font-serif text-[16px] leading-[1.75] text-body">
          Everything you enter into VitalPeps — catalog interactions, protocols, and tracker
          history — lives in your browser&apos;s local storage (IndexedDB) on your own device.
          Nothing is transmitted to any server, except the text you type into the AI protocol
          builder, described below.
        </p>
      </section>

      <section className="mt-12 max-w-[640px]">
        <h2 className="section-head">AI protocol builder</h2>
        <p className="mt-5 font-serif text-[16px] leading-[1.75] text-body">
          When you use &ldquo;Describe your goal,&rdquo; the text you type is sent to a VitalPeps
          server route, which calls Anthropic&apos;s API to generate a suggested protocol. Every
          compound the AI suggests is cross-checked against the real catalog before it ever
          reaches your screen — nothing invented makes it through. The suggestion only pre-fills
          the same customize screen a manual protocol uses, and nothing is saved anywhere until
          you explicitly choose to save it.
        </p>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Type-check and build**

Run: `npm run build`
Expected: build succeeds with no TypeScript or lint errors, and the route list printed by Next.js includes `/legal`.

- [ ] **Step 3: Commit**

```bash
git add app/legal/page.tsx
git commit -m "Add Legal page"
```

---

## Task 4: Footer links

**Files:**
- Modify: `app/layout.tsx:31-34` (the `<footer>` block)

**Interfaces:**
- Consumes: routes `/about`, `/faq`, `/legal` created in Tasks 1–3, plus the existing `/settings` route.
- Produces: nothing consumed by later tasks (this is the last code task).

- [ ] **Step 1: Update the footer**

In `app/layout.tsx`, the current footer is:

```tsx
          <footer className="border-t-2 border-rule pb-24 md:pb-0">
            <div className="mx-auto max-w-[1200px] px-5 py-8 md:px-10">
              <p className="max-w-3xl font-serif text-sm leading-relaxed text-body">
                Educational reference and personal tracker — <strong>not medical advice</strong>.
                Many peptides are unapproved research chemicals; consult a healthcare
                professional before use.
              </p>
              <Link href="/settings" className="btn-secondary mt-4 inline-block">
                Settings
              </Link>
            </div>
          </footer>
```

Replace the single `Settings` link with a row of four links (Settings, About, FAQ, Legal):

```tsx
          <footer className="border-t-2 border-rule pb-24 md:pb-0">
            <div className="mx-auto max-w-[1200px] px-5 py-8 md:px-10">
              <p className="max-w-3xl font-serif text-sm leading-relaxed text-body">
                Educational reference and personal tracker — <strong>not medical advice</strong>.
                Many peptides are unapproved research chemicals; consult a healthcare
                professional before use.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
                <Link href="/settings" className="btn-secondary inline-block">
                  Settings
                </Link>
                <Link href="/about" className="btn-secondary inline-block">
                  About
                </Link>
                <Link href="/faq" className="btn-secondary inline-block">
                  FAQ
                </Link>
                <Link href="/legal" className="btn-secondary inline-block">
                  Legal
                </Link>
              </div>
            </div>
          </footer>
```

`Link` is already imported at the top of `app/layout.tsx` (`import Link from "next/link";`) — no new import needed.

- [ ] **Step 2: Type-check and build**

Run: `npm run build`
Expected: build succeeds with no TypeScript or lint errors.

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "Link About/FAQ/Legal from the footer"
```

---

## Task 5: Manual verification

**Files:** none (verification only, no code changes).

**Interfaces:**
- Consumes: routes `/about`, `/faq`, `/legal` and the updated footer from Tasks 1–4.
- Produces: nothing (terminal task).

- [ ] **Step 1: Start the dev server**

Run: `npm run dev -- -p 3005` (background/preview tool), then open `http://localhost:3005/`.

- [ ] **Step 2: Dismiss the disclaimer gate if shown**

Click "I understand — this is not medical advice" if the one-time gate appears.

- [ ] **Step 3: Check the footer on any page**

Confirm the footer shows four links in a row: Settings, About, FAQ, Legal. Confirm none of them overlap the fixed mobile tab bar at narrow viewport widths (resize to ~375px wide and re-check).

- [ ] **Step 4: Visit each new page directly**

Navigate to `/about`, `/faq`, and `/legal` in turn. For each, confirm:
- The `eyebrow` label, serif `h1`, and italic intro paragraph render (matches the visual pattern on `/tracker` or `/settings`).
- Each `section-head` renders with its bottom rule.
- On `/legal`, the "Not medical advice" section renders as a bordered `safety-callout` box (rust top border), visually distinct from the plain-paragraph sections below it.
- All body copy is present and free of literal `{" "}` or unescaped-apostrophe rendering artifacts.

- [ ] **Step 5: Click through the cross-links**

From `/about`, click the "Legal page" link and confirm it lands on `/legal`. From `/faq`, click the "Legal page" link in the first Safety & evidence answer and confirm the same.

- [ ] **Step 6: Report results**

Summarize what was checked and any visual issues found. If issues are found, fix them in the relevant page file, re-run `npm run build`, and re-check before considering this task done. No commit needed for this task unless a fix was made (in which case, commit the fix with a message describing what was wrong).
