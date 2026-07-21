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
