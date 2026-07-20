# AI Route Rate Limiting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cap `/api/generate-protocol` at 10 requests per rolling 60-minute window per client IP, with zero new dependencies, so the route can't be looped against the Anthropic API key unprotected.

**Architecture:** One new file (`lib/rate-limit.ts`) exporting a plain in-process sliding-window counter. One call site added to `app/api/generate-protocol/route.ts`, as the first gate in the handler.

**Tech Stack:** Next.js 14 App Router route handler, TypeScript. No new dependencies.

## Global Constraints

- No test framework exists in this project (no Jest/Vitest, no test script in `package.json`). Verification is `npm run build` (type-check) plus a manual live check.
- No new dependencies. In-memory state only — no external store (Redis, Vercel KV, etc.).
- Limit: 10 requests per rolling 60-minute window, keyed on client IP (`x-forwarded-for` header, first value in the comma-separated list, falling back to the literal string `"unknown"` when absent).
- On limit hit: `429` with `{ error: "Too many requests. Try again in a bit." }` — the same JSON error shape every other branch of this route already uses.
- The rate-limit check must run before the goal-empty check, the goal-length check, and the API-key check — it's the cheapest gate and should run first, and it must not depend on Anthropic being called (so testing it costs zero API calls).
- No periodic cleanup of stale map entries, no `Retry-After` header — both explicitly out of scope per the spec.

---

## Task 1: Rate limiter + route wiring

**Files:**
- Create: `lib/rate-limit.ts`
- Modify: `app/api/generate-protocol/route.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `checkRateLimit(key: string, max: number, windowMs: number): boolean` — returns `true` if the request is allowed (and records it), `false` if the caller has hit the limit within the window. This is the only export of `lib/rate-limit.ts` and the only thing `route.ts` needs from it.

- [ ] **Step 1: Create the rate limiter**

Create `lib/rate-limit.ts`:

```ts
const hits = new Map<string, number[]>();

export function checkRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) return false;
  recent.push(now);
  hits.set(key, recent);
  return true;
}
```

- [ ] **Step 2: Wire it into the route**

In `app/api/generate-protocol/route.ts`, the current top of the file is:

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
```

Replace it with:

```ts
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  SYSTEM_PROMPT,
  buildUserMessage,
  PROPOSE_PROTOCOL_TOOL,
  validateProtocolResponse,
} from "@/lib/ai-protocol";
import { checkRateLimit } from "@/lib/rate-limit";

const MAX_GOAL_LENGTH = 500;
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const goal = typeof body?.goal === "string" ? body.goal.trim() : "";

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(ip, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS)) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a bit." },
      { status: 429 },
    );
  }

  if (!goal) {
    return NextResponse.json({ error: "Describe a goal before generating." }, { status: 400 });
  }
```

Everything below the `if (!goal)` block (the length check, API-key check, Anthropic call, tool-use handling, `validateProtocolResponse` call) is unchanged — do not modify anything past this point.

- [ ] **Step 3: Type-check and build**

Run: `npm run build`
Expected: build succeeds with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add lib/rate-limit.ts app/api/generate-protocol/route.ts
git commit -m "Add rate limiting to the AI protocol generation route"
```

---

## Task 2: Manual verification

**Files:** none (verification only, no code changes).

**Interfaces:**
- Consumes: the running dev server's `/api/generate-protocol` route, updated by Task 1.
- Produces: nothing (terminal task).

- [ ] **Step 1: Restart the dev server clean**

This project has a known gotcha: running `npm run build` while a dev server is also running against the same `.next` directory corrupts it. Stop the dev server, `rm -rf .next`, restart it before testing.

- [ ] **Step 2: Send 10 requests with no `goal` — confirm none are rate-limited**

Send 10 POST requests to `http://localhost:3005/api/generate-protocol` with an empty JSON body (`{}`), one at a time:

```bash
for i in $(seq 1 10); do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3005/api/generate-protocol \
    -H "Content-Type: application/json" -d '{}'
done
```

Expected: all 10 return `400` (the existing "Describe a goal before generating." branch) — confirming the rate limiter allows these through and the existing empty-goal validation still runs normally. This deliberately avoids spending any real Anthropic API calls: the rate-limit check runs before the goal-empty check per Task 1, so these requests exercise the rate limiter without ever reaching the Anthropic client.

- [ ] **Step 3: Send an 11th request — confirm it's rate-limited**

```bash
curl -s -X POST http://localhost:3005/api/generate-protocol \
  -H "Content-Type: application/json" -d '{}'
```

Expected: `{"error":"Too many requests. Try again in a bit."}` with HTTP status `429` (check status with `-w "\n%{http_code}\n"` appended to the command above).

- [ ] **Step 4: Confirm the UI displays a 429 correctly**

Open `/protocols/new` in the browser, scroll to "Or describe your goal," type any goal, and click "Generate with AI" while still within the same rate-limit window from Steps 2-3. Confirm the existing `aiError` UI state displays "Too many requests. Try again in a bit." — this exercises the real fetch path in `ProtocolBuilder.tsx`'s `generateWithAI()`, not just the raw HTTP response, and confirms no UI code changes were actually needed for a status code (429) the UI hasn't been exercised against before.

- [ ] **Step 5: Report results**

Summarize the actual status codes/responses observed for each step. If the 11th request (or the UI check) doesn't match expected behavior, treat it as a task failure: go back to Task 1 and fix, re-run `npm run build`, and repeat this task's steps before considering the plan complete. No commit needed for this task unless a fix was made to Task 1's files.
