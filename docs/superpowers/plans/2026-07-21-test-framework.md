# Test Framework + Baseline Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up Vitest as this project's test framework, add unit tests for the four pure-logic functions this session's manual testing has relied on most, and wire up a minimal CI workflow so tests run automatically on every push/PR.

**Architecture:** One new devDependency (`vitest`), one config file (`vitest.config.ts`) resolving the existing `@/*` path alias, two new `package.json` scripts, four colocated `*.test.ts` files (one per module under test), and one GitHub Actions workflow file.

**Tech Stack:** Vitest (test runner + assertion library, no additional libraries needed), GitHub Actions.

## Global Constraints

- No changes to any existing source file (`lib/*.ts` implementation files) — this is additive only.
- No React component tests, no jsdom, no E2E — pure Node-runnable function tests only.
- No tests for `ensureDayLogs`/`getAdherence` in `lib/tracker.ts` — both call into Dexie/IndexedDB via `lib/db.ts`, out of scope for this round.
- `vitest.config.ts` must resolve `@` to the project root (matching `tsconfig.json`'s `"@/*": ["./*"]`) so test files can `import ... from "@/lib/..."` exactly like app code does.
- `npm test` must run in single-run mode (not watch) — that's what CI invokes.
- The CI workflow must run `npm test` and then `npm run build`, on both `push` and `pull_request`.

---

## Task 1: Vitest setup + rate-limit tests

**Files:**
- Create: `vitest.config.ts`
- Create: `lib/rate-limit.test.ts`
- Modify: `package.json` (add `devDependencies.vitest` and two `scripts` entries)

**Interfaces:**
- Consumes: `checkRateLimit(key: string, max: number, windowMs: number): boolean` from `lib/rate-limit.ts` (unchanged, already exists).
- Produces: `vitest.config.ts` (the `@` alias resolution every later task's test file relies on) and the `npm test` / `npm run test:watch` scripts every later task assumes exist.

- [ ] **Step 1: Install Vitest**

```bash
npm install --save-dev vitest
```

- [ ] **Step 2: Create the Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
```

- [ ] **Step 3: Add the test scripts**

In `package.json`, the current `"scripts"` block is:

```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
```

Add two entries so it becomes:

```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest"
  },
```

(`npm install` in Step 1 will have already added `vitest` to `devDependencies` automatically — don't hand-edit that part.)

- [ ] **Step 4: Write the rate-limit tests**

Create `lib/rate-limit.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { checkRateLimit } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  it("allows exactly max calls within the window", () => {
    const key = `test-allow-${Date.now()}-${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit(key, 5, 60_000)).toBe(true);
    }
  });

  it("blocks the max+1th call within the same window", () => {
    const key = `test-block-${Date.now()}-${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      checkRateLimit(key, 5, 60_000);
    }
    expect(checkRateLimit(key, 5, 60_000)).toBe(false);
  });

  it("does not share buckets between different keys", () => {
    const keyA = `test-a-${Date.now()}-${Math.random()}`;
    const keyB = `test-b-${Date.now()}-${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      checkRateLimit(keyA, 3, 60_000);
    }
    expect(checkRateLimit(keyA, 3, 60_000)).toBe(false);
    expect(checkRateLimit(keyB, 3, 60_000)).toBe(true);
  });

  it("allows a call again after the window expires", async () => {
    const key = `test-expiry-${Date.now()}-${Math.random()}`;
    expect(checkRateLimit(key, 1, 50)).toBe(true);
    expect(checkRateLimit(key, 1, 50)).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 70));
    expect(checkRateLimit(key, 1, 50)).toBe(true);
  });
});
```

Each test uses a unique, randomly-suffixed key — `checkRateLimit`'s internal `hits` map is
module-level state shared across every test in this file (and the whole process), and the
module exposes no reset function, so unique keys are how these tests stay independent of each
other, matching the real production API surface (there's nothing to reset in real usage
either).

- [ ] **Step 5: Run the tests**

Run: `npm test`
Expected: all 4 tests in `lib/rate-limit.test.ts` pass, 0 failures.

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts lib/rate-limit.test.ts package.json package-lock.json
git commit -m "Add Vitest and rate-limit tests"
```

---

## Task 2: AI protocol validation tests

**Files:**
- Create: `lib/ai-protocol.test.ts`

**Interfaces:**
- Consumes: `validateProtocolResponse(raw: unknown): ValidationResult` from `lib/ai-protocol.ts` (unchanged, already exists), where `ValidationResult = { ok: boolean; data?: AIProtocolResponse; error?: string }`. Consumes `vitest.config.ts`'s `@` alias from Task 1.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Write the tests**

Create `lib/ai-protocol.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { validateProtocolResponse } from "@/lib/ai-protocol";

function baseResponse(items: unknown[]) {
  return {
    name: "Test protocol",
    goal: "Test goal",
    rationale: "Test rationale.",
    items,
  };
}

describe("validateProtocolResponse", () => {
  it("passes through a well-formed response with only real, non-hormone compounds", () => {
    const result = validateProtocolResponse(
      baseResponse([
        {
          compoundId: "creatine-monohydrate",
          dose: 5,
          unit: "g",
          frequency: "once-daily",
          timing: "any",
        },
      ]),
    );
    expect(result.ok).toBe(true);
    expect(result.data?.items).toHaveLength(1);
    expect(result.data?.items[0].compoundId).toBe("creatine-monohydrate");
  });

  it("drops an item whose compoundId doesn't exist in the catalog, keeping the rest", () => {
    const result = validateProtocolResponse(
      baseResponse([
        {
          compoundId: "totally-fake-compound",
          dose: 5,
          unit: "mg",
          frequency: "once-daily",
          timing: "any",
        },
        {
          compoundId: "creatine-monohydrate",
          dose: 5,
          unit: "g",
          frequency: "once-daily",
          timing: "any",
        },
      ]),
    );
    expect(result.ok).toBe(true);
    expect(result.data?.items).toHaveLength(1);
    expect(result.data?.items[0].compoundId).toBe("creatine-monohydrate");
  });

  it("unconditionally drops any item whose compound category is hormone, even with a valid compoundId and dose", () => {
    const result = validateProtocolResponse(
      baseResponse([
        {
          compoundId: "testosterone",
          dose: 100,
          unit: "mg",
          frequency: "weekly",
          timing: "any",
        },
        {
          compoundId: "creatine-monohydrate",
          dose: 5,
          unit: "g",
          frequency: "once-daily",
          timing: "any",
        },
      ]),
    );
    expect(result.ok).toBe(true);
    expect(result.data?.items).toHaveLength(1);
    expect(result.data?.items.some((i) => i.compoundId === "testosterone")).toBe(false);
  });

  it("rejects a response where every item is filtered out", () => {
    const result = validateProtocolResponse(
      baseResponse([
        {
          compoundId: "testosterone",
          dose: 100,
          unit: "mg",
          frequency: "weekly",
          timing: "any",
        },
      ]),
    );
    expect(result.ok).toBe(false);
    expect(result.data).toBeUndefined();
    expect(result.error).toBeTruthy();
  });

  it("rejects a response that fails schema validation before any filtering happens", () => {
    const result = validateProtocolResponse({ name: "Test", goal: "Test", items: [] });
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });
});
```

`"testosterone"` and `"creatine-monohydrate"` are real compound IDs already in
`content/compounds.ts` (categories `"hormone"` and `"supplement"` respectively) — this test
relies on the real catalog, not a mock, so it's actually exercising the live cross-check.

- [ ] **Step 2: Run the tests**

Run: `npm test`
Expected: all tests in both `lib/rate-limit.test.ts` and `lib/ai-protocol.test.ts` pass (9
total), 0 failures.

- [ ] **Step 3: Commit**

```bash
git add lib/ai-protocol.test.ts
git commit -m "Add validateProtocolResponse tests, including hormone-tier stripping"
```

---

## Task 3: Tracker streak tests

**Files:**
- Create: `lib/tracker.test.ts`

**Interfaces:**
- Consumes: `currentStreak(history: DayAdherence[]): number` and the `DayAdherence` interface (`{ dayMs: number; taken: number; total: number; pct: number }`) from `lib/tracker.ts` (unchanged, already exists). Consumes `vitest.config.ts`'s `@` alias from Task 1.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Write the tests**

Create `lib/tracker.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { currentStreak, type DayAdherence } from "@/lib/tracker";

function day(dayMs: number, taken: number, total: number): DayAdherence {
  return { dayMs, taken, total, pct: total > 0 ? Math.round((taken / total) * 100) : 0 };
}

describe("currentStreak", () => {
  it("returns the full length when every day is fully adherent", () => {
    const history = [day(1, 2, 2), day(2, 3, 3), day(3, 1, 1)];
    expect(currentStreak(history)).toBe(3);
  });

  it("stops counting at the most recent partial day, working backward from the end", () => {
    const history = [day(1, 1, 1), day(2, 1, 2), day(3, 2, 2), day(4, 1, 1)];
    // Working backward from the end: day 4 (full) counts, day 3 (full) counts,
    // day 2 (partial, 1/2) breaks the streak. Day 1 is never reached.
    expect(currentStreak(history)).toBe(2);
  });

  it("does not break the streak on a day with zero scheduled doses", () => {
    const history = [day(1, 2, 2), day(2, 0, 0), day(3, 1, 1)];
    expect(currentStreak(history)).toBe(2);
  });

  it("returns 0 for an empty history", () => {
    expect(currentStreak([])).toBe(0);
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `npm test`
Expected: all tests across all three test files pass (13 total), 0 failures.

- [ ] **Step 3: Commit**

```bash
git add lib/tracker.test.ts
git commit -m "Add currentStreak tests"
```

---

## Task 4: Evidence grading tests

**Files:**
- Create: `lib/evidence.test.ts`

**Interfaces:**
- Consumes: `evidenceMeta(level: EvidenceLevel)` from `lib/evidence.ts` (unchanged, already exists), returning `{ label: string; blurb: string; classes: string; showAutoDisclaimer: boolean }`. `EvidenceLevel` is `"strong" | "moderate" | "limited" | "anecdotal"`. Consumes `vitest.config.ts`'s `@` alias from Task 1.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Write the tests**

Create `lib/evidence.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { evidenceMeta } from "@/lib/evidence";

describe("evidenceMeta", () => {
  it("shows the auto-disclaimer for limited and anecdotal evidence", () => {
    expect(evidenceMeta("limited").showAutoDisclaimer).toBe(true);
    expect(evidenceMeta("anecdotal").showAutoDisclaimer).toBe(true);
  });

  it("does not show the auto-disclaimer for strong and moderate evidence", () => {
    expect(evidenceMeta("strong").showAutoDisclaimer).toBe(false);
    expect(evidenceMeta("moderate").showAutoDisclaimer).toBe(false);
  });

  it("returns a non-empty label and blurb for every evidence level", () => {
    for (const level of ["strong", "moderate", "limited", "anecdotal"] as const) {
      const meta = evidenceMeta(level);
      expect(meta.label.length).toBeGreaterThan(0);
      expect(meta.blurb.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `npm test`
Expected: all tests across all four test files pass (16 total), 0 failures.

- [ ] **Step 3: Commit**

```bash
git add lib/evidence.test.ts
git commit -m "Add evidenceMeta tests"
```

---

## Task 5: CI workflow

**Files:**
- Create: `.github/workflows/test.yml`

**Interfaces:**
- Consumes: `npm test` and `npm run build` (both already work as of Task 1 / pre-existing).
- Produces: nothing consumed by later tasks — this is the last code task.

- [ ] **Step 1: Create the workflow**

Create `.github/workflows/test.yml`:

```yaml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm test
      - run: npm run build
```

- [ ] **Step 2: Validate locally**

There's no local GitHub Actions runner in this project, so full end-to-end validation only
happens once this is pushed and a real workflow run appears in the repo's Actions tab. As a
local proxy, run the same two commands the workflow runs, in order, exactly as it would:

Run: `npm ci && npm test && npm run build`
Expected: `npm ci` completes cleanly (confirms `package-lock.json` is in sync with
`package.json` after Task 1's `vitest` install — this is the check CI's `npm ci` step would
otherwise fail on if the lockfile were stale), all 16 tests pass, and the Next.js build
succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/test.yml
git commit -m "Add CI workflow to run tests and build on push/PR"
```

---

## Task 6: Manual verification

**Files:** none (verification only, no code changes).

**Interfaces:**
- Consumes: everything from Tasks 1-5.
- Produces: nothing (terminal task).

- [ ] **Step 1: Run the full suite one more time from a clean state**

```bash
rm -rf node_modules
npm install
npm test
```

Expected: `npm install` completes cleanly, all 16 tests pass across all 4 test files
(`lib/rate-limit.test.ts`: 4, `lib/ai-protocol.test.ts`: 5, `lib/tracker.test.ts`: 4,
`lib/evidence.test.ts`: 3), 0 failures. This simulates a fresh CI checkout more faithfully
than reusing a warm local `node_modules`.

- [ ] **Step 2: Confirm the build still passes**

Run: `npm run build`
Expected: build succeeds with no TypeScript errors, same as every other task in this project's
history has verified.

- [ ] **Step 3: Report results**

Summarize the actual test counts and pass/fail status observed. If anything fails, treat it as
a task failure: go back to the relevant task's file, fix it, re-run `npm test`, and repeat
this task's steps before considering the plan complete. No commit needed for this task unless
a fix was made (in which case, commit the fix with a message describing what was wrong).
