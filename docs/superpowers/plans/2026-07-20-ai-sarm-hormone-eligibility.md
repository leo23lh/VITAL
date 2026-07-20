# AI Protocol Builder: SARM/Peptide/Hormone Eligibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the AI protocol builder consider SARM and peptide compounds for any goal, and hormone-tier compounds only when the user's own goal text signals that tier — without weakening the existing "never invent a dose" guarantee — and add a structural UI callout when a generated protocol includes higher-risk compounds.

**Architecture:** Extend `lib/ai-protocol.ts`'s catalog context (add `category`), system prompt (permission + gating + a closed free-text-dose gap), and few-shot examples (three new internal-only examples demonstrating honest framing per tier). Add one structural, non-AI-dependent callout to `components/ProtocolBuilder.tsx` that fires off the already-returned `items`' compound categories.

**Tech Stack:** Next.js 14 App Router, TypeScript, Zod, `@anthropic-ai/sdk` (`claude-sonnet-5`), Tailwind CSS + the project's own primitive classes.

## Global Constraints

- No test framework exists in this project (no Jest/Vitest, no test script in `package.json`). Verification is `npm run build` (full type-check) plus a live manual smoke test against the real Anthropic API — the same pattern used to verify the original AI-builder feature.
- The AI must never invent a dose — this applies to the structured `items` array (pre-existing rule) AND to the free-text `rationale` field (new: closing a gap where prose could state an ungrounded number even though `items` couldn't).
- Hormone-category compounds (`testosterone`, `anabolic-steroids`, `hgh`, `epo`, `insulin`) are eligible ONLY when the user's own goal text names that compound or clearly signals current/planned use of that tier. Never volunteered for a generic goal — not as a dosed item, not named in the rationale.
- Supplement/peptide/SARM-category compounds are eligible for any goal, unconditionally, regardless of `evidenceLevel`.
- No new compounds added to the catalog. No changes to `PROTOCOL_TEMPLATES` (the 3 curated cards on `/protocols/new` stay supplement-only). No changes to the manual "+ Add compound" flow. No server-side keyword/regex filter — the hormone-tier gate is prompt-level only, reinforced by the dose-grounding rule.
- New few-shot examples live only in `lib/ai-protocol.ts` and are never rendered as browsable template cards anywhere in the UI.

---

## Task 1: Catalog context, system prompt, and few-shot examples

**Files:**
- Modify: `lib/ai-protocol.ts` (entire file — every exported symbol in it changes)

**Interfaces:**
- Consumes: `COMPOUNDS` from `@/content/compounds` (each has `.category: "supplement"|"peptide"|"sarm"|"hormone"`, per `lib/types.ts:20-21`), `PROTOCOL_TEMPLATES` from `@/content/protocol-templates` (each has `.evidenceSummary: string`, per `lib/types.ts:164`).
- Produces: `buildUserMessage(goal: string): string` — same signature as before, consumed unchanged by `app/api/generate-protocol/route.ts:44` (`buildUserMessage(goal)`). No changes needed in that route file. `CatalogEntry` and `TemplateExample` interfaces both gain new required fields (`category` and `rationale` respectively) — both are internal to this file and `buildCatalogContext()`/`buildTemplateExamples()` are their only producers, so no other file needs updating for this.

- [ ] **Step 1: Add `category` to the catalog context sent to the model**

In `lib/ai-protocol.ts`, update the `CatalogEntry` interface and `buildCatalogContext()`:

```ts
export interface CatalogEntry {
  id: string;
  name: string;
  category: string;
  goals: string[];
  evidenceLevel: string;
  dosingNotes: string | null;
}

export function buildCatalogContext(): CatalogEntry[] {
  return COMPOUNDS.map((c) => ({
    id: c.id,
    name: c.name,
    category: c.category,
    goals: c.goals,
    evidenceLevel: c.evidenceLevel,
    dosingNotes: c.dosingNotes ?? null,
  }));
}
```

- [ ] **Step 2: Add `rationale` to the template-derived few-shot examples**

Update the `TemplateExample` interface and `buildTemplateExamples()` so every few-shot example
— including the 3 existing supplement templates — carries a `rationale` string. Use each
template's own `evidenceSummary` (already curated, honest evidence-framing text) rather than
inventing new copy:

```ts
export interface TemplateExample {
  goal: string;
  name: string;
  rationale: string;
  items: {
    compoundId: string;
    dose: number;
    unit: string;
    frequency: string;
    timing: string;
  }[];
}

export function buildTemplateExamples(): TemplateExample[] {
  return PROTOCOL_TEMPLATES.map((t) => ({
    goal: t.goal,
    name: t.name,
    rationale: t.evidenceSummary,
    items: t.items.map((i) => ({
      compoundId: i.compoundId,
      dose: i.dose,
      unit: i.unit,
      frequency: i.frequency,
      timing: i.timing,
    })),
  }));
}
```

- [ ] **Step 3: Add the three new internal-only few-shot examples**

Add this new exported constant directly below `buildTemplateExamples()`. These use real
catalog compound IDs and doses grounded exactly in each compound's own `dosingNotes`
(verified against `content/compounds.ts` while writing this plan — ostarine's cancer-trial
range is 1–3 mg/day, tesamorelin's approved regimen is 2 mg/day, and testosterone has no
grounded self-directed dose at all):

```ts
/**
 * Hand-written few-shot examples for tiers the curated templates don't cover.
 * Internal to the AI prompt only — never rendered as a browsable template card.
 */
export const AI_FEWSHOT_EXAMPLES: TemplateExample[] = [
  {
    goal: "Building muscle, open to a mild SARM",
    name: "Ostarine (research dose) + training support",
    rationale:
      "Ostarine (MK-2866) has the closest thing to real human dosing data among SARMs: cancer-cachexia trials used 1-3 mg/day of pharmaceutical-grade enobosarm under medical supervision. That is not the same as a validated consumer 'cycle' dose, and gray-market product content varies widely — evidence here is rated 'limited', not 'strong'. Creatine monohydrate is included alongside it as a strongly-evidenced, low-risk complement.",
    items: [
      { compoundId: "ostarine", dose: 2, unit: "mg", frequency: "once-daily", timing: "any" },
      {
        compoundId: "creatine-monohydrate",
        dose: 5,
        unit: "g",
        frequency: "once-daily",
        timing: "any",
      },
    ],
  },
  {
    goal: "Recovery and body composition, interested in a GH-axis peptide",
    name: "Tesamorelin (off-label) + recovery basics",
    rationale:
      "Tesamorelin's only real dosing data is its approved regimen — 2 mg/day by subcutaneous injection, prescribed and monitored by a clinician for a specific approved indication. Using it here for a recovery/body-composition goal is off-label; the dose below reflects that approved regimen, not a validated protocol for this use. Evidence for tesamorelin overall is rated 'strong', but only for its approved use — that distinction should be stated plainly. Magnesium glycinate is included as a strongly-evidenced complement for recovery.",
    items: [
      {
        compoundId: "tesamorelin",
        dose: 2,
        unit: "mg",
        frequency: "once-daily",
        timing: "evening",
      },
      {
        compoundId: "magnesium-glycinate",
        dose: 300,
        unit: "mg elemental",
        frequency: "once-daily",
        timing: "evening",
      },
    ],
  },
  {
    goal: "I'm currently on TRT and want help with sleep and recovery",
    name: "Sleep & recovery support alongside TRT",
    rationale:
      "This protocol only includes compounds with real grounded dosing for sleep and recovery — magnesium glycinate and L-theanine. Testosterone itself is not included as a dosed item here: therapeutic replacement doses are individualized by a clinician with monitoring, and there is no safe way to estimate a number for supraphysiologic or performance-oriented dosing outside that supervision. Questions about the TRT dose itself belong with the prescribing clinician, not this tool.",
    items: [
      {
        compoundId: "magnesium-glycinate",
        dose: 300,
        unit: "mg elemental",
        frequency: "once-daily",
        timing: "evening",
      },
      {
        compoundId: "l-theanine",
        dose: 200,
        unit: "mg",
        frequency: "once-daily",
        timing: "evening",
      },
    ],
  },
];
```

- [ ] **Step 4: Rewrite the system prompt**

Replace `SYSTEM_PROMPT` entirely:

```ts
export const SYSTEM_PROMPT = `You are assembling a supplement/peptide/SARM/hormone protocol for a harm-reduction reference app. You MUST follow these rules exactly:

1. Use ONLY the compounds listed in the CATALOG you are given. Never invent a compound, and never use a compoundId that is not in the CATALOG.
2. For dose, unit, frequency, and timing, stay consistent with each compound's own "dosingNotes" and the EXAMPLE PROTOCOLS you are given. Do not invent a dose that isn't grounded in the compound's dosingNotes — and this applies to the "rationale" text too: if a compound has no dose you can ground this way, you may name it in the rationale and point to its catalog entry, but never state a specific numeric dose for it in prose either.
3. Compounds with category "supplement", "peptide", or "sarm" are eligible for any goal, on equal footing with each other.
4. Compounds with category "hormone" (testosterone, anabolic steroids, HGH, EPO, insulin) are eligible ONLY when the user's own goal text names that specific compound or clearly signals they are already using or specifically planning to use that hormone tier. If the goal is generic, do not include any hormone-category compound at all — not as a dosed item, and not named in the rationale.
5. Mention evidence quality (the "evidenceLevel" field) honestly in the rationale, but never use weaker evidence as a reason to silently drop a compound that the goal actually calls for.
6. If the user's goal doesn't map well to anything in the catalog, choose the closest reasonable compounds and say so plainly in "rationale" — do not stretch the truth to force a fit.
7. Call the propose_protocol tool exactly once with your answer. Do not respond in plain text.`;
```

- [ ] **Step 5: Feed both example sets to the model**

Update `buildUserMessage()`:

```ts
export function buildUserMessage(goal: string): string {
  return [
    `Goal: ${goal}`,
    "",
    "CATALOG:",
    JSON.stringify(buildCatalogContext()),
    "",
    "EXAMPLE PROTOCOLS:",
    JSON.stringify([...buildTemplateExamples(), ...AI_FEWSHOT_EXAMPLES]),
  ].join("\n");
}
```

Leave `PROPOSE_PROTOCOL_TOOL`, `AIProtocolResponse`, `ValidationResult`, and
`validateProtocolResponse` exactly as they are — none of them need to change; the catalog
cross-check in `validateProtocolResponse` already validates any `compoundId`, from any
category, against the real `COMPOUNDS` list.

- [ ] **Step 6: Type-check and build**

Run: `npm run build`
Expected: build succeeds with no TypeScript errors. This project has no test framework, so
this (plus Task 3's live smoke test) is the verification for this task.

- [ ] **Step 7: Commit**

```bash
git add lib/ai-protocol.ts
git commit -m "Expand AI protocol builder to SARM/peptide/hormone tiers"
```

---

## Task 2: Structural UI callout for higher-risk AI suggestions

**Files:**
- Modify: `components/ProtocolBuilder.tsx:208` (immediately before the `started` view's `return`) and `components/ProtocolBuilder.tsx:212-216` (immediately after the existing `aiRationale` banner)

**Interfaces:**
- Consumes: `items: ProtocolItem[]` and `aiRationale: string | null` (existing component state, `components/ProtocolBuilder.tsx:57,64`), `byId: Map<string, Compound>` (existing, `components/ProtocolBuilder.tsx:51`), `Compound.category: Category` (`lib/types.ts:20-21,94`), `Disclaimer` component (`components/Disclaimer.tsx:5-18`, signature `Disclaimer({ children: React.ReactNode, title?: string })`, renders children inside a `.safety-callout` box).
- Produces: nothing consumed by later tasks (this is the last code task).

- [ ] **Step 1: Compute which returned items are higher-risk**

In `components/ProtocolBuilder.tsx`, immediately before the `started` view's `return (` (the
line currently reading `return (` right after the closing `}` of the `if (!started) { ... }`
block), add:

```tsx
  const higherRiskItems = aiRationale
    ? items
        .map((it) => byId.get(it.compoundId))
        .filter(
          (c): c is Compound => !!c && (c.category === "sarm" || c.category === "hormone"),
        )
    : [];

```

- [ ] **Step 2: Render the callout**

Immediately after the existing AI-suggested banner block:

```tsx
        {aiRationale && (
          <Disclaimer title="AI-suggested — review before saving">
            <p>{aiRationale}</p>
          </Disclaimer>
        )}
```

add:

```tsx
        {higherRiskItems.length > 0 && (
          <Disclaimer title="Higher-risk compounds included">
            <p>
              This protocol includes {higherRiskItems.map((c) => c.name).join(", ")} — review
              each compound&apos;s full catalog entry for risks, evidence, and legal status
              before using.
            </p>
          </Disclaimer>
        )}
```

so the two blocks render back-to-back at the top of the main column, in that order (rationale
banner first, then the higher-risk callout).

- [ ] **Step 3: Type-check and build**

Run: `npm run build`
Expected: build succeeds with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add components/ProtocolBuilder.tsx
git commit -m "Add structural callout for higher-risk AI-suggested compounds"
```

---

## Task 3: Live verification against the real Anthropic API

**Files:** none (verification only, no code changes).

**Interfaces:**
- Consumes: the running dev server's `/protocols/new` page and `/api/generate-protocol` route, both updated by Tasks 1–2. Requires `ANTHROPIC_API_KEY` in `.env.local` (already configured in this environment).
- Produces: nothing (terminal task).

- [ ] **Step 1: Start the dev server and open the builder**

Start the dev server (port 3005) and navigate to `/protocols/new`. Dismiss the one-time
disclaimer gate if it appears. Scroll to "Or describe your goal."

- [ ] **Step 2: Generic goal — expect no hormone-tier content anywhere**

Type a generic goal, e.g. "help me build muscle", and generate. Inspect the raw JSON response
(via network inspector) and the rendered customize screen. Confirm:
- No `items` entry has a `compoundId` whose catalog `category` is `"hormone"`.
- The `rationale` text does not name testosterone, anabolic steroids, HGH, EPO, or insulin.
- If any SARM or peptide item is present, the new "Higher-risk compounds included" callout
  renders; if not, it doesn't.

- [ ] **Step 3: SARM/peptide-signaling goal — expect real grounded eligibility**

Type a goal that invites a SARM or peptide, e.g. "I want to try a mild SARM for muscle,
what's a safe way to do it", and generate. Confirm:
- Any SARM/peptide item returned has a dose that matches (or is plausibly grounded in) that
  compound's real `dosingNotes` range — not an invented number.
- The "Higher-risk compounds included" callout renders and correctly lists the returned
  SARM/peptide compound(s) by name.
- The rationale is honest about evidence quality (e.g. doesn't claim "strong" evidence for a
  compound the catalog grades "limited").

- [ ] **Step 4: Hormone-signaling goal — expect acknowledgment without dosing**

Type a goal that names a hormone-tier compound or clearly signals current use, e.g. "I'm
currently on TRT and want help with sleep and recovery", and generate. Confirm:
- No `items` entry has `category === "hormone"` (no dosed testosterone item).
- The `rationale` may name testosterone/TRT by way of acknowledgment, but contains no specific
  numeric dose for it.
- Supporting non-hormone items (e.g. magnesium glycinate, L-theanine) are still present and
  genuinely relevant to the stated goal.

- [ ] **Step 5: Report results**

Summarize what was checked and the actual model output for each of the 3 prompts (paste the
`items`/`rationale` returned). If any scenario doesn't match the expected behavior, treat it
as a task failure: go back to Task 1's system prompt (Step 4) or few-shot examples (Step 3)
and adjust, then re-run `npm run build` and repeat this task's steps before considering the
plan complete. No commit needed for this task unless a fix was made to Task 1/2's files (in
which case, commit the fix with a message describing what was wrong and re-run this task's
steps 2–4 in full again).
