# Rate limiting for `/api/generate-protocol`

**Date:** 2026-07-20
**Status:** Approved

## Problem

`/api/generate-protocol` calls the Anthropic API on every request with no protection against
repeated or automated hits. The app has no login, so there's no user identity to key any
protection on. Before this route is exposed on a public deployment, an unprotected loop
against it is an open cost/abuse surface against the Anthropic API key.

## Goals

- Cap requests to `/api/generate-protocol` at 10 per rolling 60-minute window, per client IP.
- Return a `429` with the same JSON error shape the route already uses (`{ error: string }`)
  when the limit is hit, so the existing UI error display needs no changes.
- Zero new dependencies — plain in-process state.

## Non-goals

- No external store (Upstash Redis, Vercel KV, etc.) — deferred. In-memory state is a
  deliberate v1 tradeoff: it resets on cold start and doesn't share across concurrent
  serverless instances, making this a soft ceiling rather than a hard guarantee. Worth
  revisiting only if traffic ever justifies the added infrastructure.
- No periodic cleanup of stale IP entries in the counter map — memory growth from this is
  negligible at expected traffic levels, and serverless instances recycle naturally.
- No `Retry-After` header or precise wait-time messaging — a flat error string is enough for
  v1.
- No change to rate-limiting any other route — this app has exactly one route that costs
  money per request; nothing else needs this.

## Design

### `lib/rate-limit.ts` (new file)

A single exported function, a plain in-process sliding-window counter:

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

### `app/api/generate-protocol/route.ts`

Call `checkRateLimit` right after extracting `goal` from the request body, before the goal
length check or the API-key check — it's the cheapest possible gate and should run first.
Client IP is read from the `x-forwarded-for` header (the standard header Vercel's proxy sets),
falling back to the literal string `"unknown"` when that header is absent (local dev, where
there's no proxy in front of the dev server — this means local dev effectively shares one
rate-limit bucket across all requests, which is fine since it's not the target of the
protection).

On failure, return the same JSON error shape every other branch in this route already uses:

```ts
return NextResponse.json(
  { error: "Too many requests. Try again in a bit." },
  { status: 429 },
);
```

## Testing

This project has no test framework — verification is `npm run build` (type-check) plus a
manual check: hit the route 11+ times in under an hour and confirm the 11th returns 429 with
the expected error message, and that the existing `aiError` UI state displays it correctly
(no UI code changes, but worth confirming the display path still works end-to-end for a 429
specifically, since it's a status code the UI hasn't been exercised against before).
