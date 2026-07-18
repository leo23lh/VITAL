# AI-Powered Protocol Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user describe a goal in free text and get a draft protocol assembled from the real catalog by Claude, which lands in the existing customize screen for review before saving.

**Architecture:** A new Next.js Route Handler (`app/api/generate-protocol/route.ts`) calls the Anthropic API with the compound catalog and curated templates as grounding context, forces a structured tool-call response, and cross-checks every returned `compoundId` against the real catalog before it ever reaches the browser. `ProtocolBuilder.tsx` gains a third entry point that POSTs to this route and prefills the same customize screen a manual build already uses.

**Tech Stack:** Next.js 14 App Router Route Handlers, `@anthropic-ai/sdk` (Anthropic Node SDK), Claude Sonnet (`claude-sonnet-5`) via tool use with a forced `tool_choice`, Zod (already a dependency) for response validation.

## Global Constraints

- This app has no test framework and no test script (`package.json` has only `dev`/`build`/`start`/`lint`). Do not add one as a side effect of this feature — verify with `npm run build` (type-checking) plus literal `curl` commands against the running dev server and manual browser checks, matching how every prior feature in this codebase was verified.
- `ANTHROPIC_API_KEY` is a server-only secret. It must never be sent to or read by client code, and must never be committed — it lives in `.env.local`, which is already covered by the `.env*` rule in `.gitignore`.
- Reuse `ProtocolItem`, `Frequency`, `Timing` from `lib/types.ts` — do not redeclare these shapes.
- **Ancillaries are out of scope for v1.** The existing customize screen has no UI for rendering ancillary compounds at all (`ProtocolBuilder.tsx`'s `save()` hardcodes `ancillaries: []`) — this is a pre-existing gap, not something this plan fixes. The AI tool schema therefore omits `ancillaries` entirely rather than asking the model for structured data the UI has nowhere to display.
- Model: `claude-sonnet-5` (per the earlier design decision).
- New UI must reuse the existing editorial primitives already in `ProtocolBuilder.tsx` — `fieldClasses`, `.btn`/`.btn-secondary`, `.eyebrow`, and the `Disclaimer` component — not invent new styling.
- The AI must never gain authority beyond pre-filling the same form a manual build uses: every generated item still passes through the customize screen's existing safety UI (compound dosing notes, evidence badges) before the user can save.

---

### Task 1: AI generation route — prompt, grounding, and validation

**Files:**
- Create: `lib/ai-protocol.ts`
- Create: `app/api/generate-protocol/route.ts`
- Create: `.env.example`
- Modify: `.gitignore` (add a negation so `.env.example` can be committed despite the `.env*` rule)
- Modify: `package.json` / `package-lock.json` (via `npm install`)

**Interfaces:**
- Consumes: `COMPOUNDS`, `getCompound(id: string): Compound | undefined` from `@/content/compounds`; `PROTOCOL_TEMPLATES` from `@/content/protocol-templates`; `ProtocolItem` (Zod schema) from `@/lib/types`.
- Produces (for Task 2): `POST /api/generate-protocol` accepting `{ goal: string }` and returning, on success (200), `{ name: string, goal: string, rationale: string, items: ProtocolItem[] }`; on failure, `{ error: string }` with status 400 (bad input), 500 (not configured), 502 (upstream failure), or 422 (validation failure).

- [ ] **Step 1: Install the Anthropic SDK**

```bash
cd /Users/admin/peptide-companion
npm install @anthropic-ai/sdk
```

Expected: `package.json` gains `@anthropic-ai/sdk` under `dependencies`, `package-lock.json` updates, install completes with no errors.

- [ ] **Step 2: Document the required env var**

Create `.env.example`:

```
# Required for the AI-powered protocol builder (app/api/generate-protocol).
# Get a key at https://console.anthropic.com/, then copy this file to
# .env.local (already gitignored) and fill in your real key.
ANTHROPIC_API_KEY=
```

Edit `.gitignore` — the existing `.env*` line would also exclude this example file, so add a negation immediately after it:

```
.env*
!.env.example
```

- [ ] **Step 3: Verify the gitignore negation works**

```bash
cd /Users/admin/peptide-companion
git check-ignore -v .env.example; echo "exit code: $?"
git check-ignore -v .env.local; echo "exit code: $?"
```

Expected: the first command prints nothing and exits `1` (not ignored — `.env.example` IS tracked); the second prints a match against `.gitignore`'s `.env*` line and exits `0` (still ignored).

- [ ] **Step 4: Write the catalog-context and prompt-building helpers**

Create `lib/ai-protocol.ts`:

```ts
import { z } from "zod";
import { ProtocolItem } from "@/lib/types";
import { COMPOUNDS, getCompound } from "@/content/compounds";
import { PROTOCOL_TEMPLATES } from "@/content/protocol-templates";

/**
 * Reduced compound projection sent to the model — enough to select and dose
 * correctly, not the full essay-length catalog entry (mechanism, citations,
 * community reports, vendors, etc. are omitted).
 */
export interface CatalogEntry {
  id: string;
  name: string;
  goals: string[];
  evidenceLevel: string;
  dosingNotes: string | null;
}

export function buildCatalogContext(): CatalogEntry[] {
  return COMPOUNDS.map((c) => ({
    id: c.id,
    name: c.name,
    goals: c.goals,
    evidenceLevel: c.evidenceLevel,
    dosingNotes: c.dosingNotes ?? null,
  }));
}

/** Reduced few-shot examples of sound compound/dose combinations. */
export interface TemplateExample {
  goal: string;
  name: string;
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
    items: t.items.map((i) => ({
      compoundId: i.compoundId,
      dose: i.dose,
      unit: i.unit,
      frequency: i.frequency,
      timing: i.timing,
    })),
  }));
}

export const SYSTEM_PROMPT = `You are assembling a supplement/peptide protocol for a harm-reduction reference app. You MUST follow these rules exactly:

1. Use ONLY the compounds listed in the CATALOG you are given. Never invent a compound, and never use a compoundId that is not in the CATALOG.
2. For dose, unit, frequency, and timing, stay consistent with each compound's own "dosingNotes" and the EXAMPLE PROTOCOLS you are given. Do not invent a dose that isn't grounded in the compound's dosingNotes.
3. If the user's goal doesn't map well to anything in the catalog, choose the closest reasonable compounds and say so plainly in "rationale" — do not stretch the truth to force a fit.
4. Prefer compounds with a stronger evidenceLevel ("strong" or "moderate") over "limited" or "anecdotal" ones when there is a reasonable choice, and mention evidence quality briefly in the rationale.
5. Call the propose_protocol tool exactly once with your answer. Do not respond in plain text.`;

export function buildUserMessage(goal: string): string {
  return [
    `Goal: ${goal}`,
    "",
    "CATALOG:",
    JSON.stringify(buildCatalogContext()),
    "",
    "EXAMPLE PROTOCOLS:",
    JSON.stringify(buildTemplateExamples()),
  ].join("\n");
}

export const PROPOSE_PROTOCOL_TOOL = {
  name: "propose_protocol",
  description:
    "Propose a protocol assembled ONLY from the given catalog of compounds, grounded in each compound's own dosing notes.",
  input_schema: {
    type: "object" as const,
    properties: {
      name: { type: "string", description: "A short, descriptive name for this protocol." },
      goal: { type: "string", description: "A short label for the goal this protocol targets." },
      rationale: {
        type: "string",
        description: "A brief, plain-language explanation of why these compounds and doses were chosen.",
      },
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            compoundId: { type: "string", description: "Must exactly match an id from the CATALOG." },
            dose: { type: "number" },
            unit: { type: "string" },
            frequency: {
              type: "string",
              enum: ["once-daily", "twice-daily", "every-other-day", "weekly", "as-needed"],
            },
            timing: {
              type: "string",
              enum: ["morning", "midday", "evening", "pre-workout", "post-workout", "with-food", "any"],
            },
            durationWeeks: { type: "number" },
          },
          required: ["compoundId", "dose", "unit", "frequency", "timing"],
        },
      },
    },
    required: ["name", "goal", "rationale", "items"],
  },
};

/** Structured shape the model must return, before catalog cross-checking. */
export const AIProtocolResponse = z.object({
  name: z.string(),
  goal: z.string(),
  rationale: z.string(),
  items: z.array(ProtocolItem),
});
export type AIProtocolResponse = z.infer<typeof AIProtocolResponse>;

export interface ValidationResult {
  ok: boolean;
  data?: AIProtocolResponse;
  error?: string;
}

/**
 * Cross-checks the model's raw tool input against the real catalog and the
 * response schema. Any compoundId not in COMPOUNDS is dropped, never
 * rendered. If nothing valid remains, the whole response is rejected.
 */
export function validateProtocolResponse(raw: unknown): ValidationResult {
  const parsed = AIProtocolResponse.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "The AI's response didn't match the expected shape." };
  }
  const validItems = parsed.data.items.filter((item) => !!getCompound(item.compoundId));
  if (validItems.length === 0) {
    return {
      ok: false,
      error: "The AI didn't return any compounds that exist in the catalog. Try rephrasing your goal.",
    };
  }
  return { ok: true, data: { ...parsed.data, items: validItems } };
}
```

- [ ] **Step 5: Verify the helpers compile and behave correctly on obviously-invalid input**

```bash
cd /Users/admin/peptide-companion
npm run build 2>&1 | tail -20
```

Expected: build succeeds (this type-checks `lib/ai-protocol.ts` against `ProtocolItem`/`Compound` and catches any schema mismatch).

Type-checking alone doesn't prove `validateProtocolResponse` behaves correctly at runtime, and this project has no test runner. Bare `tsc`/`node` can't be used to exercise it either — the file imports via this project's `@/` path alias (e.g. `@/lib/types`), which only resolves inside Next's own build (webpack/SWC honor `tsconfig.json`'s `paths`), not under plain Node. So verify through Next itself: temporarily add a `GET` handler to the route file that will exist after Step 6. Since Step 6 comes next, do this verification as part of it (see Step 6's temporary handler) rather than before the route file exists.

- [ ] **Step 6: Write the route handler, with a temporary self-test GET handler**

Create `app/api/generate-protocol/route.ts`. Add the temporary `GET` handler shown below the `POST` handler — it exercises `validateProtocolResponse` against three fixed inputs (invalid shape, hallucinated compound, real compound) using Next's own module resolution, and gets deleted immediately below once verified:

```ts
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  SYSTEM_PROMPT,
  buildUserMessage,
  PROPOSE_PROTOCOL_TOOL,
  validateProtocolResponse,
} from "@/lib/ai-protocol";

const MAX_GOAL_LENGTH = 500;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const goal = typeof body?.goal === "string" ? body.goal.trim() : "";

  if (!goal) {
    return NextResponse.json({ error: "Describe a goal before generating." }, { status: 400 });
  }
  if (goal.length > MAX_GOAL_LENGTH) {
    return NextResponse.json(
      { error: `Keep your goal under ${MAX_GOAL_LENGTH} characters.` },
      { status: 400 },
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI generation isn't configured on this server yet." },
      { status: 500 },
    );
  }

  const client = new Anthropic({ apiKey });

  let response;
  try {
    response = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      tools: [PROPOSE_PROTOCOL_TOOL],
      tool_choice: { type: "tool", name: "propose_protocol" },
      messages: [{ role: "user", content: buildUserMessage(goal) }],
    });
  } catch {
    return NextResponse.json(
      { error: "Couldn't reach the AI service. Try again in a moment." },
      { status: 502 },
    );
  }

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    return NextResponse.json(
      { error: "The AI didn't return a usable suggestion. Try rephrasing your goal." },
      { status: 502 },
    );
  }

  const result = validateProtocolResponse(toolUse.input);
  if (!result.ok || !result.data) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  return NextResponse.json(result.data);
}

// TEMPORARY — exercises validateProtocolResponse's runtime behavior through
// Next's own module resolution (bare tsc/node can't resolve the `@/` alias
// used inside lib/ai-protocol.ts). Delete this handler in Step 8 below.
export async function GET() {
  return NextResponse.json({
    garbageInput: validateProtocolResponse({ foo: "bar" }),
    unknownCompound: validateProtocolResponse({
      name: "Test",
      goal: "Test",
      rationale: "Test",
      items: [
        { compoundId: "not-a-real-compound", dose: 5, unit: "mg", frequency: "once-daily", timing: "any" },
      ],
    }),
    validInput: validateProtocolResponse({
      name: "Test",
      goal: "Test",
      rationale: "Test",
      items: [
        { compoundId: "creatine-monohydrate", dose: 5, unit: "g", frequency: "once-daily", timing: "any" },
      ],
    }),
  });
}
```

Run it:

```bash
cd /Users/admin/peptide-companion
npm run dev &
sleep 3
curl -s http://localhost:3000/api/generate-protocol | python3 -m json.tool
kill %1
```

Expected JSON output:

```json
{
    "garbageInput": {
        "ok": false,
        "error": "The AI's response didn't match the expected shape."
    },
    "unknownCompound": {
        "ok": false,
        "error": "The AI didn't return any compounds that exist in the catalog. Try rephrasing your goal."
    },
    "validInput": {
        "ok": true,
        "data": {
            "name": "Test",
            "goal": "Test",
            "rationale": "Test",
            "items": [
                { "compoundId": "creatine-monohydrate", "dose": 5, "unit": "g", "frequency": "once-daily", "timing": "any" }
            ]
        }
    }
}
```

This confirms `validateProtocolResponse` rejects malformed input, drops/rejects hallucinated compound IDs, and passes through real ones — before the route is ever exercised with a live model call.

Now delete the temporary `GET` handler: remove the `// TEMPORARY ...` comment and the entire `export async function GET() { ... }` block from `app/api/generate-protocol/route.ts`. The file should now contain only the imports and the `POST` function — nothing after its closing `}`.

- [ ] **Step 7: Verify the build passes**

```bash
cd /Users/admin/peptide-companion
npm run build 2>&1 | tail -20
```

Expected: `✓ Compiled successfully`, all 41+ routes generated including `/api/generate-protocol` listed as a dynamic (`ƒ`) route.

- [ ] **Step 8: Verify the deterministic failure paths (no API key required)**

```bash
cd /Users/admin/peptide-companion
npm run dev &
sleep 3

echo "--- empty goal ---"
curl -s -o /tmp/resp1.json -w "%{http_code}\n" -X POST http://localhost:3000/api/generate-protocol \
  -H "Content-Type: application/json" -d '{"goal":""}'
cat /tmp/resp1.json

echo "--- goal too long ---"
curl -s -o /tmp/resp2.json -w "%{http_code}\n" -X POST http://localhost:3000/api/generate-protocol \
  -H "Content-Type: application/json" -d "{\"goal\":\"$(python3 -c 'print("x"*501)')\"}"
cat /tmp/resp2.json

kill %1
```

Expected:
- First request: HTTP `400`, body `{"error":"Describe a goal before generating."}`
- Second request: HTTP `400`, body `{"error":"Keep your goal under 500 characters."}`

- [ ] **Step 9: Verify the "not configured" path when no API key is set**

```bash
cd /Users/admin/peptide-companion
unset ANTHROPIC_API_KEY
npm run dev &
sleep 3
curl -s -o /tmp/resp3.json -w "%{http_code}\n" -X POST http://localhost:3000/api/generate-protocol \
  -H "Content-Type: application/json" -d '{"goal":"help me sleep better"}'
cat /tmp/resp3.json
kill %1
```

Expected: HTTP `500`, body `{"error":"AI generation isn't configured on this server yet."}` — confirms the route fails cleanly with no key configured, rather than crashing on an SDK call with an empty key.

- [ ] **Step 10: Verify a real generation (requires your own Anthropic API key)**

This step needs a real `ANTHROPIC_API_KEY` and makes a live, billed API call — obtain a key at https://console.anthropic.com/ if you don't have one, then:

```bash
cd /Users/admin/peptide-companion
cp .env.example .env.local
# Edit .env.local and set ANTHROPIC_API_KEY=sk-ant-... with your real key
npm run dev &
sleep 3
curl -s -o /tmp/resp4.json -w "%{http_code}\n" -X POST http://localhost:3000/api/generate-protocol \
  -H "Content-Type: application/json" -d '{"goal":"help me sleep better, I already take magnesium"}'
python3 -m json.tool /tmp/resp4.json
kill %1
```

Expected: HTTP `200`. The response body is JSON with `name`, `goal`, `rationale` (all strings) and `items` (a non-empty array). Exact compound choices will vary since this is a live model call — verify structurally instead of against literal content:

```bash
python3 -c "
import json
d = json.load(open('/tmp/resp4.json'))
assert isinstance(d['name'], str) and d['name']
assert isinstance(d['rationale'], str) and d['rationale']
assert isinstance(d['items'], list) and len(d['items']) > 0
for item in d['items']:
    assert set(['compoundId','dose','unit','frequency','timing']).issubset(item.keys())
print('all structural checks passed')
"
```

Expected: `all structural checks passed`. Also spot-check that every `compoundId` in the output is a real catalog id:

```bash
python3 -c "
import json, re
resp = json.load(open('/tmp/resp4.json'))
src = open('content/compounds.ts').read()
ids = set(re.findall(r'id: \"([a-z0-9-]+)\"', src))
for item in resp['items']:
    assert item['compoundId'] in ids, f\"unknown compound: {item['compoundId']}\"
print('all compoundIds are real catalog entries')
"
```

Expected: `all compoundIds are real catalog entries`.

- [ ] **Step 11: Commit**

```bash
cd /Users/admin/peptide-companion
git add package.json package-lock.json .env.example .gitignore lib/ai-protocol.ts app/api/generate-protocol/route.ts
git -c user.name="Claude" -c user.email="noreply@anthropic.com" commit -m "Add AI protocol generation route with catalog-grounded validation

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: UI integration — "Describe your goal" entry point

**Files:**
- Modify: `components/ProtocolBuilder.tsx`

**Interfaces:**
- Consumes: `POST /api/generate-protocol` from Task 1, returning `{ name, goal, rationale, items }` on success or `{ error }` on failure.
- Produces: no new exports — this is a self-contained UI addition to the existing default-exported `ProtocolBuilder` component.

- [ ] **Step 1: Add AI-related state and reset it on other entry paths**

In `components/ProtocolBuilder.tsx`, add new state alongside the existing `useState` calls (after the `addId` state, around line 60):

```tsx
const [aiGoal, setAiGoal] = useState("");
const [aiLoading, setAiLoading] = useState(false);
const [aiError, setAiError] = useState<string | null>(null);
const [aiRationale, setAiRationale] = useState<string | null>(null);
```

Update `loadTemplate` and `startBlank` (around lines 62–74) so choosing either path clears any leftover AI banner from a previous generation:

```tsx
function loadTemplate(t: ProtocolTemplate) {
  setName(t.name);
  setGoal(t.goal);
  setItems(t.items.map((i) => ({ ...i })));
  setAiRationale(null);
  setStarted(true);
}

function startBlank() {
  setName("");
  setGoal("");
  setItems([]);
  setAiRationale(null);
  setStarted(true);
}
```

- [ ] **Step 2: Add the generate handler**

Add a new function near `addCompound`/`updateItem` (around line 83):

```tsx
async function generateWithAI() {
  if (!aiGoal.trim()) return;
  setAiLoading(true);
  setAiError(null);
  try {
    const res = await fetch("/api/generate-protocol", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal: aiGoal.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      setAiError(data.error ?? "Something went wrong generating a protocol.");
      return;
    }
    setName(data.name);
    setGoal(data.goal);
    setItems(data.items);
    setAiRationale(data.rationale);
    setStarted(true);
  } catch {
    setAiError("Couldn't reach the AI service. Check your connection and try again.");
  } finally {
    setAiLoading(false);
  }
}
```

- [ ] **Step 3: Add the "Describe your goal" UI to the not-started screen**

In the `!started` return block (around line 141, right before the closing `</div>` of the templates grid section), add a new block after the grid `</div>`:

```tsx
        </div>

        <div className="mt-10 border-t border-rule pt-8">
          <p className="eyebrow">Or describe your goal</p>
          <p className="mt-2 max-w-[560px] font-serif text-[15px] italic leading-[1.6] text-body">
            Tell the AI what you&apos;re after in your own words — it drafts a starting point from
            the same catalog above, which you then review and edit like any other protocol.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              value={aiGoal}
              onChange={(e) => setAiGoal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !aiLoading) generateWithAI();
              }}
              placeholder="e.g. help me recover from a shoulder injury, I lift 3x/week"
              className={`${fieldClasses} mt-0 sm:flex-1`}
            />
            <button
              onClick={generateWithAI}
              disabled={aiLoading || !aiGoal.trim()}
              className="btn whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-40"
            >
              {aiLoading ? "Generating…" : "Generate with AI"}
            </button>
          </div>
          {aiError && <p className="mt-3 font-sans text-[13px] text-rust">{aiError}</p>}
        </div>
      </div>
    );
  }
```

(This closes out the existing `if (!started) { return ( <div> ... ` block — the new block sits inside that same wrapping `<div>`, after the templates grid, before its closing tag.)

- [ ] **Step 4: Show the AI-suggested banner in the customize screen**

In the `started` return block's main column (around line 149, right after `<div className="space-y-10">`), add the conditional banner as the first child, before the "1 · Protocol details" `<section>`:

```tsx
      <div className="space-y-10">
        {aiRationale && (
          <Disclaimer title="AI-suggested — review before saving">
            <p>{aiRationale}</p>
          </Disclaimer>
        )}

        <section>
          <h2 className="section-head">1 · Protocol details</h2>
```

- [ ] **Step 5: Verify the build passes**

```bash
cd /Users/admin/peptide-companion
npm run build 2>&1 | tail -20
```

Expected: `✓ Compiled successfully`, no type errors.

- [ ] **Step 6: Verify in the browser — regression check on existing paths**

```bash
cd /Users/admin/peptide-companion
rm -rf .next
npm run dev &
sleep 3
```

Open `http://localhost:3000/protocols/new` in a browser. Confirm:
- Template cards and "Start from scratch" still work exactly as before (pick one, land in the customize screen, no AI banner appears).
- The new "Or describe your goal" block renders below the template grid with an input and a "Generate with AI" button (disabled while the input is empty).

- [ ] **Step 7: Verify the AI generation path end-to-end**

With `ANTHROPIC_API_KEY` set in `.env.local` (from Task 1, Step 10) and the dev server running:
1. On `/protocols/new`, type a goal (e.g. "help me sleep better") into the new input and click "Generate with AI".
2. Confirm the button shows "Generating…" and disables while the request is in flight.
3. Confirm you land on the customize screen with: the "AI-suggested — review before saving" banner showing the model's rationale text, the protocol name/goal fields prefilled, and one or more compound rows prefilled with dose/unit/frequency/timing — each row still shows that compound's own `dosingNotes` exactly as a manually-added compound would.
4. Confirm Save still works: click "Save protocol" and land on `/protocols/[id]` with the AI-generated items shown.

Without a configured API key, instead confirm: clicking "Generate with AI" shows the inline error "AI generation isn't configured on this server yet." and the user can still use templates or "start from scratch".

```bash
kill %1
```

- [ ] **Step 8: Commit**

```bash
cd /Users/admin/peptide-companion
git add components/ProtocolBuilder.tsx
git -c user.name="Claude" -c user.email="noreply@anthropic.com" commit -m "Add AI-generated protocol entry point to the builder

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```
