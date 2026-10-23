import { describe, expect, it } from "vitest";
import { SURVIVAL_ITEMS } from "../../src/shared/content/items";
import { drawStartingItemOffer } from "../../src/shared/rules/itemOffers";
import { sequenceRandom } from "../../src/shared/rules/random";

describe("starting item offers", () => {
  it("draws exactly three distinct items uniformly from the shared catalog", () => {
    const offer = drawStartingItemOffer(SURVIVAL_ITEMS, sequenceRandom([0, 0, 0]));
    expect(offer).toHaveLength(3);
    expect(new Set(offer.map(({ id }) => id)).size).toBe(3);
    expect(offer.map(({ id }) => id)).toEqual(["knife", "lighter", "rope"]);
  });

  it("allows different players' independent offers to overlap", () => {
    const first = drawStartingItemOffer(SURVIVAL_ITEMS, sequenceRandom([0, 0, 0]));
    const second = drawStartingItemOffer(SURVIVAL_ITEMS, sequenceRandom([0, 0, 0]));
    expect(second.map(({ id }) => id)).toEqual(first.map(({ id }) => id));
  });

  it("rejects a pool that cannot provide three distinct choices", () => {
    expect(() => drawStartingItemOffer(SURVIVAL_ITEMS.slice(0, 2), sequenceRandom([0]))).toThrow(/at least 3/);
  });

  it("rejects duplicate IDs in the shared item catalog", () => {
    expect(() => drawStartingItemOffer([SURVIVAL_ITEMS[0]!, SURVIVAL_ITEMS[0]!, SURVIVAL_ITEMS[1]!], sequenceRandom([0]))).toThrow(/duplicate IDs/);
  });
});
