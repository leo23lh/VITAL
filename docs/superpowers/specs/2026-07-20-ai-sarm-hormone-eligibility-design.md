# AI protocol builder: SARM/peptide/hormone eligibility

**Date:** 2026-07-20
**Status:** Approved

## Problem

The AI protocol builder (`/protocols/new` → "Describe your goal") only ever suggests basic
supplements. Its few-shot examples (`buildTemplateExamples()` in `lib/ai-protocol.ts`) are
derived entirely from the 3 curated templates, which are all supplements (creatine, magnesium
glycinate, L-theanine). Its system prompt has no explicit permission to consider SARMs,
peptides, or hormone-tier compounds, and a rule that prefers "strong"/"moderate" evidence
further biases it away from the "limited"/"anecdotal" evidence that most of those compounds
carry. The catalog already contains 32 compounds across all four categories
(`supplement`/`peptide`/`sarm`/`hormone`), evidence-graded and cited, specifically for
harm-reduction purposes — but the AI builder effectively never surfaces anything outside
`supplement`.

## Goals

- Let the AI protocol builder consider SARM and peptide compounds for any goal, on equal
  footing with supplements.
- Let it consider hormone-tier compounds (testosterone, anabolic steroids, HGH, EPO,
  insulin) only when the user's own goal text signals current or planned use of that tier —
  never volunteered for a generic goal.
- Do this without weakening the existing "never invent a dose" guarantee, and close a gap in
  that guarantee (see below).
- Add a structural (non-AI-dependent) UI callout when a generated protocol includes any
  SARM- or hormone-tier compound.

## Non-goals

- No change to the manual builder or "+ Add compound" flow — it already allows adding any
  catalog compound with no restriction; that's pre-existing and out of scope here.
- No change to the 3 curated templates on `/protocols/new` — they stay supplement-only.
- No server-side keyword/regex intent filter as a second enforcement layer for the hormone-tier
  *goal-signaling* gate (whether the user's own wording justifies mentioning that tier at all) —
  that gate is prompt-level only. Separately, `validateProtocolResponse` does unconditionally
  drop any hormone-category item server-side (see "Key finding" below) — that's a category-based
  exclusion, not a keyword/intent filter, and it doesn't affect whether the AI can name a
  hormone-tier compound in prose.
- No new compounds added to the catalog.

## Key finding that shapes this design

Checking every SARM/peptide/hormone compound's actual `dosingNotes` in `content/compounds.ts`
turned up a structural fact that does most of the safety work here for free:

- **Insulin, anabolic steroids, EPO, and cardarine explicitly state no safe/validated dose
  exists at all** — e.g. insulin: *"There is no safe performance dose. This entry exists to
  warn: non-medical insulin use has caused sudden deaths..."*; anabolic steroids: *"There is
  no safe recreational dose. This entry exists to inform about risks, not to provide a
  cycle."*
- **Testosterone and HGH** only have clinician-monitored numbers, explicitly captioned as not
  a recommendation for the self-directed use case.
- **Most peptides** (BPC-157, TB-500, CJC-1295, ipamorelin, melanotan-2, AOD-9604) and **most
  SARMs** (RAD-140, andarine, YK-11) have **zero** numeric dosing anywhere in their entry.
- Only **ostarine** (1–3 mg/day) and **LGD-4033** (~0.1–1 mg/day) have any numbers at all, and
  both are captioned as cancer-trial/early-research doses under medical supervision, not
  consumer cycle doses.

The existing rule that the AI must never invent a dose (`SYSTEM_PROMPT` rule 2, unchanged) is
a prompt-level instruction, not a code-enforced guarantee — nothing in `validateProtocolResponse`
checks whether a returned dose is actually grounded in a compound's `dosingNotes`. For SARMs and
peptides, the safety property genuinely does rest on the model following that instruction (verified
live against the real API — see Testing below). For the hormone tier specifically, this design adds
a separate, unconditional code-level backstop in `validateProtocolResponse`: any `items` entry whose
compound category is `"hormone"` is dropped server-side regardless of what the model returns, so no
dosed testosterone/AAS/HGH/EPO/insulin item can ever reach the browser — a real code guarantee, not
just prompt trust. The AI can still name a hormone-tier compound in its free-text `rationale` (per
the goal-signaling gate below); only the structured, dosed `items` array is affected by this backstop.

**The one real gap:** the `rationale` field is free text, not covered by the `items` schema's
per-field constraints. Nothing currently stops the model from narrating a specific dose in
prose (e.g. "for insulin, start with 2 IU pre-workout...") even though it can't put that
number in a structured item. This design closes that gap explicitly.

## Changes

### 1. `lib/ai-protocol.ts` — catalog context

Add `category` to the `CatalogEntry` interface and to `buildCatalogContext()`'s mapping, so
the model can see each compound's tier (`supplement` | `peptide` | `sarm` | `hormone`).

### 2. `lib/ai-protocol.ts` — `SYSTEM_PROMPT` rules

Revise the existing 5-rule prompt:

- Keep rule 1 (only catalog compounds) and rule 2 (never invent a dose — ground in
  `dosingNotes`) unchanged; they're the load-bearing safety mechanism.
- Add: SARM and peptide compounds are eligible for any goal, exactly like supplements — no
  special permission needed, no gating.
- Add: hormone-tier compounds (category `hormone`) are eligible **only** when the user's own
  goal text names that specific compound or clearly signals current/planned use of that tier.
  If the goal is generic, do not include any hormone-tier compound, dosed or undosed.
- Add: if a compound is relevant to the goal but has no dose to ground (per rule 2), it may be
  named in the rationale with a pointer to its catalog entry, but a specific numeric dose must
  never be stated in the rationale text either — closing the free-text gap above.
- Revise the old evidence-preference rule (previously: prefer strong/moderate evidence "when
  there is a reasonable choice"): evidence quality should be mentioned honestly in the
  rationale, but must never be used to silently drop a compound the goal actually calls for.

### 3. `lib/ai-protocol.ts` — new internal-only few-shot examples

Add a new exported array (name: `AI_FEWSHOT_EXAMPLES`, shape: `TemplateExample[]`, same shape
already used by `buildTemplateExamples()`) with three hand-written examples, concatenated into
the "EXAMPLE PROTOCOLS" block `buildUserMessage()` sends to the model, alongside the existing
template-derived examples. These are **not** added to `PROTOCOL_TEMPLATES` and never render as
browsable cards anywhere in the UI — they exist purely to give the model a concrete pattern
for each tier's honest-framing style:

- **SARM-tier example:** goal like "muscle/strength, considering a mild SARM." Uses ostarine
  at its real 1–3 mg/day number, with rationale text that explicitly frames it as the
  cancer-trial dose under medical supervision, not a validated cycle dose, and notes evidence
  is "limited."
- **Peptide-tier example:** goal like "recovery/body composition, interested in a GH-axis
  peptide." Uses tesamorelin at its real 2 mg/day approved regimen, with rationale explicitly
  framing it as the approved indication's clinician-monitored dose, being used off-label here.
- **Hormone-tier acknowledgment example:** goal that mentions existing testosterone use (e.g.
  "I'm currently on TRT, want something to help sleep and recovery"). The response's `items`
  contain only the adjacent supplement-tier compounds that do have grounded doses; the
  `rationale` names testosterone explicitly, states no dose is given because none is safe to
  estimate outside clinician supervision, and points the user to their prescriber. This is the
  concrete pattern for "acknowledge the hormone tier, never dose it."

### 4. `components/ProtocolBuilder.tsx` — structural UI callout

When the AI response being rendered on the customize screen contains any item whose
`getCompound(item.compoundId)?.category` is `"sarm"` or `"hormone"`, render an additional
`Disclaimer` box (reusing the existing component, same as the current "AI-suggested" and "Not
medical advice" boxes) above the compound list, listing which included compounds are
higher-risk category and pointing to their catalog entries for full risk/evidence/legal
detail. This is independent of what the model's `rationale` says — a structural safety net,
consistent with the app's existing "safety posture is structural, not cosmetic" principle.

## Testing / verification

This codebase has no test framework (no Jest/Vitest, no test script) — verification is
`npm run build` (full type-check) plus a live smoke test against the real Anthropic API,
mirroring how the original AI-builder feature was verified. At minimum, three live prompts
should be tried against the running dev server:

1. A generic goal ("help me build muscle") — expect supplement/SARM/peptide-tier items only,
   zero hormone-tier items, zero hormone-tier mentions in the rationale.
2. A goal naming a SARM or peptide directly ("I want to try ostarine safely") — expect that
   compound included with its real grounded dose (or, if ungrounded, named in the rationale
   with no invented number), and the new UI callout rendering.
3. A goal signaling existing hormone-tier use ("I'm on TRT, help with recovery") — expect
   testosterone acknowledged by name in the rationale with no dose anywhere (items or prose),
   supporting compounds still suggested, and the UI callout rendering for the hormone-tier
   mention if the implementation surfaces it there (see open note below).

## Open implementation note

The UI callout in Task 4 keys off `items` (compounds actually returned with a dosed entry).
The hormone-tier acknowledgment case (rationale-only mention, no item) won't have a
`compoundId` to check against — so callout #3 in the verification list above may legitimately
not trigger the same UI box, since there's no item to detect. That's fine: the rationale
prose itself carries the acknowledgment in that case, and the `Disclaimer` "AI-suggested"
banner already surfaces the full rationale text prominently. The implementation should not
attempt to parse the rationale text to detect a named-but-undosed hormone mention — that would
be fragile string-matching against model output. This is a deliberate, disclosed scope
boundary, not an oversight.
