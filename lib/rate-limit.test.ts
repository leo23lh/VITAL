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
