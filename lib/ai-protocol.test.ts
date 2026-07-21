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
