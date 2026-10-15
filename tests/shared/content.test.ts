import { describe, expect, it } from "vitest";
import { DECISION_CARDS } from "../../src/shared/content/decisionCards";

describe("initial decision deck", () => {
  it("contains ten unique three-option cards", () => {
    expect(DECISION_CARDS).toHaveLength(10);
    expect(new Set(DECISION_CARDS.map(({ id }) => id)).size).toBe(10);
    for (const card of DECISION_CARDS) { expect(card.options).toHaveLength(3); expect(new Set(card.options.map(({ id }) => id)).size).toBe(3); }
  });
  it("uses complete weights and includes upside and downside on every card", () => {
    for (const card of DECISION_CARDS) {
      const deltas = card.options.flatMap(({ outcomes }) => { expect(outcomes.reduce((sum, outcome) => sum + outcome.weight, 0)).toBe(100); expect(outcomes.every(({ weight }) => Number.isInteger(weight) && weight > 0)).toBe(true); return outcomes.flatMap(({ resourceDeltas = {} }) => Object.values(resourceDeltas)); });
      expect(deltas.some((delta) => delta > 0)).toBe(true);
      expect(deltas.some((delta) => delta < 0)).toBe(true);
    }
  });
  it("keeps elimination rare and limited to exactly six cards", () => {
    const riskyCards = DECISION_CARDS.filter((card) => card.options.some((option) => option.outcomes.some(({ eliminateRandomLiving }) => eliminateRandomLiving)));
    expect(riskyCards).toHaveLength(6);
    for (const card of riskyCards) {
      const weights = card.options.flatMap(({ outcomes }) => outcomes.filter(({ eliminateRandomLiving }) => eliminateRandomLiving).map(({ weight }) => weight));
      expect(weights.every((weight) => weight >= 5 && weight <= 15)).toBe(true);
    }
  });
});
