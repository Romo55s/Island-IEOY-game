import { describe, expect, it } from "vitest";
import { rescueRiskLabel, resolveCrashBatch, type CrashRescueSubmission } from "../../src/shared/rules/crashRescue";
import { sequenceRandom } from "../../src/shared/rules/random";

const attempt = (rescuerCharacterId: string, targetCharacterId: string, itemId: string | null = "lighter"): CrashRescueSubmission => ({ rescuerCharacterId, targetCharacterId, itemId });

describe("crash rescue batch rules", () => {
  it("maps success odds to qualitative risk labels without exposing percentages", () => {
    expect(rescueRiskLabel(0.8)).toBe("low");
    expect(rescueRiskLabel(0.6)).toBe("moderate");
    expect(rescueRiskLabel(0.3)).toBe("high");
    expect(() => rescueRiskLabel(1.1)).toThrow(/between 0 and 1/);
  });
  it("allows self-rescue and duplicate targets; a target is saved once", () => {
    const result = resolveCrashBatch(["a", "b", "c"], [attempt("a", "a"), attempt("b", "c"), attempt("c", "c")], sequenceRandom([0.1, 0.2, 0.3]));
    expect(result.attempts).toHaveLength(3);
    expect(result.savedCharacterIds).toEqual(["a", "c"]);
    expect(result.eliminatedCharacterIds).toEqual([]);
  });

  it("does not describe a self-rescue casualty as two people lost", () => {
    const result = resolveCrashBatch(["a"], [attempt("a", "a")], sequenceRandom([0.6, 0.95]));
    expect(result.attempts[0]?.outcome).toBe("rescuer-lost");
    expect(result.eliminatedCharacterIds).toEqual(["a"]);
  });

  it("resolves the same seeded batch identically regardless of submission arrival order", () => {
    const submissions = [attempt("c", "a"), attempt("a", "b"), attempt("b", "b")];
    const randomValues = [0.61, 0.1, 0.2, 0.7, 0.4];
    const forward = resolveCrashBatch(["a", "b", "c"], submissions, sequenceRandom(randomValues));
    const reverse = resolveCrashBatch(["a", "b", "c"], [...submissions].reverse(), sequenceRandom(randomValues));
    expect(reverse).toEqual(forward);
  });

  it.each([
    { roll: 0.79, outcome: "miss", eliminated: [] },
    { roll: 0.8, outcome: "rescuer-lost", eliminated: ["a"] },
    { roll: 0.9, outcome: "target-lost", eliminated: ["b"] },
    { roll: 0.95, outcome: "both-lost", eliminated: ["a", "b"] },
  ] as const)("handles failure boundary $roll as $outcome", ({ roll, outcome, eliminated }) => {
    const result = resolveCrashBatch(["a", "b"], [attempt("a", "b")], sequenceRandom([0.6, roll]));
    expect(result.attempts[0]?.outcome).toBe(outcome);
    expect(result.eliminatedCharacterIds).toEqual(eliminated);
  });

  it("applies casualties after all attempts, so input order cannot cancel a pending attempt", () => {
    const result = resolveCrashBatch(["a", "b", "c"], [attempt("a", "b"), attempt("b", "c")], sequenceRandom([0.6, 0.8, 0.1]));
    expect(result.attempts.map(({ outcome }) => outcome)).toEqual(["rescuer-lost", "success"]);
    expect(result.savedCharacterIds).toEqual(["c"]);
    expect(result.eliminatedCharacterIds).toEqual(["a"]);
  });

  it("does not create attempts for players who timed out without choosing a target", () => {
    const result = resolveCrashBatch(["a", "b"], [], sequenceRandom([]));
    expect(result.attempts).toEqual([]);
    expect(result.eliminatedCharacterIds).toEqual([]);
  });

  it("rejects ghost or unknown participants, duplicate rescuers, and unknown items", () => {
    expect(() => resolveCrashBatch(["a"], [attempt("ghost", "a")], sequenceRandom([]))).toThrow(/not alive/);
    expect(() => resolveCrashBatch(["a"], [attempt("a", "ghost")], sequenceRandom([]))).toThrow(/not alive/);
    expect(() => resolveCrashBatch(["a", "b"], [attempt("a", "b"), attempt("a", "a")], sequenceRandom([]))).toThrow(/only one/);
    expect(() => resolveCrashBatch(["a", "b"], [attempt("a", "b", "not-an-item")], sequenceRandom([]))).toThrow(/Unknown starting item/);
  });
});
