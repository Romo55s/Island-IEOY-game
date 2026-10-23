import { describe, expect, it } from "vitest";
import { SURVIVAL_ITEMS, validateItemCatalog } from "../../src/shared/content/items";

describe("shared survival item catalog", () => {
  it("has unique valid entries across the requested item categories", () => {
    expect(() => validateItemCatalog(SURVIVAL_ITEMS)).not.toThrow();
    expect(new Set(SURVIVAL_ITEMS.map(({ id }) => id)).size).toBe(SURVIVAL_ITEMS.length);
    expect(new Set(SURVIVAL_ITEMS.map(({ category }) => category))).toEqual(new Set(["survival", "tool", "food", "keepsake", "improvised"]));
  });

  it("rejects malformed entries, duplicate IDs, and too-small pools", () => {
    expect(() => validateItemCatalog([{ ...SURVIVAL_ITEMS[0]!, id: "Bad ID" }, SURVIVAL_ITEMS[1]!, SURVIVAL_ITEMS[2]!])).toThrow();
    expect(() => validateItemCatalog([SURVIVAL_ITEMS[0]!, SURVIVAL_ITEMS[0]!, SURVIVAL_ITEMS[2]!])).toThrow(/Duplicate item ID/);
    expect(() => validateItemCatalog(SURVIVAL_ITEMS.slice(0, 2))).toThrow(/at least three/);
  });
});
