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
