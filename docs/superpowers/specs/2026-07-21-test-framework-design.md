# Test framework + baseline coverage

**Date:** 2026-07-21
**Status:** Approved

## Problem

This project has zero automated tests and no CI. Every verification throughout its entire
history — including every safety-critical check on the AI protocol builder's dose-grounding
and hormone-tier stripping — has been manual (browser clicks, curl commands, hand-traced
arithmetic). That's expensive to repeat and easy to silently regress, especially for logic
with no visible UI signal when it breaks (e.g. `validateProtocolResponse` quietly failing to
strip a hormone-category item would produce a working-looking response with no error).

## Goals

- Stand up Vitest as the project's test framework.
- Cover the pure-logic functions this session's manual testing has leaned on most:
  `validateProtocolResponse`, `checkRateLimit`, `currentStreak`, `evidenceMeta`.
- Add a minimal CI workflow so tests (and the build) run automatically on every push/PR.

## Non-goals

- No tests for `ensureDayLogs`/`getAdherence` (`lib/tracker.ts`) — both call into
  Dexie/IndexedDB via `lib/db.ts` and would need `fake-indexeddb` or similar mocking
  infrastructure to test in Node. Bigger lift, deferred.
- No React component tests (no React Testing Library / jsdom setup) — this round is pure
  function logic only.
- No E2E tests (no Playwright) — deferred; would effectively automate the manual browser
  verification this session has relied on, but is a substantially bigger undertaking than
  "stand up a test framework."
- No changes to any existing source file — this is additive only: new test files, one config
  file, one CI workflow file, and two `package.json` script entries.

## Design

### Dependencies

Add `vitest` as a devDependency. Nothing else — Vitest's built-in `expect`/`describe`/`it`
cover everything these tests need; no React/DOM tooling is being added in this round.

### `vitest.config.ts` (new file, project root)

Resolves the `@/*` path alias to match `tsconfig.json`'s `"@/*": ["./*"]`, so test files can
import app code the same way the app itself does (e.g. `import { checkRateLimit } from
"@/lib/rate-limit"`).

### `package.json` scripts

- `"test": "vitest run"` — single-run mode, what CI invokes.
- `"test:watch": "vitest"` — watch mode for local development.

### Test files (all new, colocated next to the module they test)

- **`lib/rate-limit.test.ts`** — `checkRateLimit(key, max, windowMs)`:
  - allows exactly `max` calls within the window
  - blocks the `max + 1`th call within the same window
  - two different keys don't share a bucket (calling with key `"a"` at its limit doesn't
    block key `"b"`)
  - a call outside the window (simulated via a very short `windowMs` and a real delay, or by
    directly reasoning about the sliding-window filter with distinct timestamps) is allowed
    again after expiry
- **`lib/ai-protocol.test.ts`** — `validateProtocolResponse(raw)`:
  - a well-formed response with only real, non-hormone `compoundId`s passes through with all
    items intact
  - an item whose `compoundId` doesn't exist in `COMPOUNDS` is dropped, the rest of the
    response still succeeds if other valid items remain
  - **an item whose compound category is `"hormone"` is unconditionally dropped**, even when
    its `compoundId` is otherwise valid — this is the safety guarantee added in the
    AI-SARM-eligibility work; a regression here is the single highest-value thing this test
    suite protects
  - a response where filtering leaves zero items returns `{ ok: false }` with an error message
  - a response that fails Zod schema validation entirely (e.g. missing `rationale`) returns
    `{ ok: false }` before any filtering happens
- **`lib/tracker.test.ts`** — `currentStreak(history: DayAdherence[])`:
  - a history where every day has `taken === total` (and `total > 0`) returns the full length
  - a history with one partial day (e.g. `taken < total`) breaks the streak at that day,
    counting only the consecutive fully-adherent days after it (working backward from the end
    of the array, since the function iterates from the most recent day)
  - a day with `total === 0` (no doses scheduled that day) does NOT break the streak — it's
    skipped, per the function's own `continue` behavior
  - an empty array returns `0`
- **`lib/evidence.test.ts`** — `evidenceMeta(level: EvidenceLevel)`:
  - `showAutoDisclaimer` is `true` for `"limited"` and `"anecdotal"`
  - `showAutoDisclaimer` is `false` for `"strong"` and `"moderate"`
  - each level returns a non-empty `label` and `blurb` (basic shape sanity, not exact string
    matching — the copy itself isn't what's being protected here, the disclaimer-trigger
    boolean is)

### `.github/workflows/test.yml` (new file)

Runs on every push and pull request:

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

`npm run build` runs after `npm test` in the same job — this project's own established
verification pattern throughout this whole session has been "build must pass," so CI checks
the same thing a human has been checking manually after every task.

## Testing

The tests themselves are the deliverable — verification is that `npm test` passes locally,
`npm run build` still passes (confirming nothing broke), and the CI workflow file is valid
YAML that will actually run on the next push (this can be spot-checked by the file's structure
mirroring GitHub's documented Actions syntax; genuine confirmation happens once it's merged
and the Actions tab shows a real run — not something a local check can fully guarantee, so it's
called out as an accepted limitation of this task rather than skipped silently).
