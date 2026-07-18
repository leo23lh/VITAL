# AI-Powered Protocol Builder — Design Spec

## Context

The protocol builder (`/protocols/new`) currently offers two entry points: pick a curated goal-based template, or start from scratch and manually add compounds. Early in this project the user asked for an AI-powered version of the builder and explicitly deferred it ("we can work on that later"). That later point is now.

The goal: let a user describe what they're after in their own words (e.g. "help me recover from a shoulder injury, I lift 3x/week, want something gentle to start") and get a draft protocol assembled from the real catalog — without weakening the app's core safety promise that dosing is never invented or guessed.

## Approach

### Entry point

`ProtocolBuilder`'s "not started" screen gains a **third option** alongside the existing template cards and "Start from scratch": a free-text "Describe your goal" input with a "Generate with AI" button. All three paths converge on the same customize screen that already exists (Task 7 of the editorial overhaul) — template, blank, and AI-drafted protocols are all just different ways of arriving at the same `items`/`ancillaries` state before the user reviews and saves.

### Flow

1. User types a goal description and clicks "Generate with AI."
2. Client POSTs the goal text to a new server route, `app/api/generate-protocol/route.ts`.
3. The route calls the Anthropic API (Claude Sonnet) with:
   - A system prompt instructing the model to assemble a protocol **only** from the compound data it is given — never invent a compound or a dose beyond what's documented.
   - The real catalog as context: compound `id`, `name`, `goals`, `dosingNotes`, `evidenceLevel` (not the full essay-length content — just enough to select and dose correctly). At 32 compounds the whole catalog fits comfortably in one request; no separate retrieval or pre-filtering step is needed at this scale.
   - The existing curated `ProtocolTemplate`s as few-shot examples of sound compound/dose combinations.
   - A forced tool-call / structured-output schema matching the existing `ProtocolItem` and `Ancillary` Zod types from `lib/types.ts` — the model cannot return free text, only a call to a `propose_protocol` tool with a typed argument.
4. The route validates the response before it ever reaches the browser: every `compoundId` must exist in `COMPOUNDS`; any hallucinated ID is dropped from the response, not rendered.
5. The client receives `{ name, goal, items, ancillaries, rationale }` and prefills the existing customize screen with it — same dose/unit/frequency/timing fields, same live summary rail, same Save button as a manual build.
6. A distinct **"AI-suggested — review before saving"** banner appears on this path only, so it's never confused with a fully manual entry.

### Grounding & safety guarantee

This is the part that has to hold, since the app's credibility rests on it:

- The model's only source of truth is the catalog data and templates it's given in the prompt — it is instructed to select and combine from that, never to invent.
- Structured output (a forced tool call against the `ProtocolItem`/`Ancillary` schema) replaces free-text parsing, eliminating a whole class of "did I parse this right" bugs.
- Server-side validation cross-checks every `compoundId` against the real catalog before the response leaves the server; anything invalid is dropped.
- Once in the customize screen, every item is subject to the **same safety UI a manual build already has** — the compound's own dosing notes, disclaimers, and evidence badge all render regardless of how the item was added, and nothing persists until the user explicitly saves.
- Net effect: the AI has authority to *pre-fill a form a human then reviews* — it never gains authority to write dosing guidance the rest of the app doesn't already stand behind.

### UI & error handling

- The generate button shows a loading state; one request per click, not per keystroke.
- If the API key isn't configured, the network call fails, the model is rate-limited, or the response fails validation, the input shows a clear inline error. The user can still fall back to templates or "start from scratch" — never a silent failure or a broken screen.
- No new persistent data model: the AI call is stateless and only produces in-memory builder state until the user saves, exactly like picking a template does today.

### Infrastructure note

This introduces the app's first server-side route (a real API call, not just static content). Next.js API routes run as serverless functions on Vercel with no special configuration — this is compatible with, and actually reinforces, the earlier recommendation to deploy there. The `ANTHROPIC_API_KEY` lives in server-only environment variables, never exposed to the client, and is excluded from git via the existing `.env*` gitignore rule.

## Critical files (for the implementation plan)

- New: `app/api/generate-protocol/route.ts` — the server route: builds the prompt, calls Anthropic, validates the response.
- New: `lib/ai-protocol.ts` (or similar) — prompt construction and response-validation helpers, kept separate from the route handler for testability.
- Modify: `components/ProtocolBuilder.tsx` — add the "Describe your goal" entry option; wire a successful generation into the existing `items`/`ancillaries`/`name`/`goal` state that the customize screen already renders.
- Reused as-is: `lib/types.ts` (`ProtocolItem`, `Ancillary` schemas), `content/compounds.ts` (the catalog), `content/protocol-templates.ts` (few-shot examples), the existing customize screen and its safety UI.

## Verification

- Manual: enter a realistic goal, confirm the generated draft lands in the customize screen with sensible items, that every item shows its compound's real dosing notes/disclaimers/evidence badge, and that saving behaves identically to a manual/template-based protocol.
- Adversarial: submit a goal designed to bait an invalid suggestion (e.g. asking for a compound not in the catalog) and confirm the server drops anything not backed by a real `compoundId` rather than rendering it.
- Failure path: simulate a missing API key / network failure and confirm the UI degrades to a clear error with templates/scratch still available, not a crash.
- No regression: template and "start from scratch" entry points behave exactly as before.

## Out of scope (this pass)

- Multi-turn chat/refinement — one goal in, one draft out, then manual editing.
- New database tables, accounts, or persistence changes — this rides entirely on the existing local-first Protocol/DoseLog model.
- "Regenerate" history or comparing multiple drafts — clicking again just re-runs from the same goal text.
- Any change to the catalog, evidence grading, or existing template system — this is purely a new entry point into protocol creation.
