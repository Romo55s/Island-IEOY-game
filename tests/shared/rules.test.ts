import { describe, expect, it } from "vitest";
import type { PrivateRoomState } from "../../src/shared/domain";
import { applyOutcome, clampResource, pickWeightedOutcome } from "../../src/shared/rules/outcomes";
import { sequenceRandom } from "../../src/shared/rules/random";
import { resolveWinningOption } from "../../src/shared/rules/resolveVote";

describe("deterministic rules", () => {
  it("resolves majorities, ties, and no-vote decisions", () => {
    const random = sequenceRandom([0, 0.999999]);
    expect(resolveWinningOption({ a: 2, b: 1 }, ["a", "b"], random)).toBe("a");
    expect(resolveWinningOption({ a: 1, b: 1 }, ["a", "b"], random)).toBe("a");
    expect(resolveWinningOption({}, ["a", "b"], random)).toBe("b");
  });
  it("clamps resources and observes weighted half-open boundaries", () => {
    expect(clampResource(-5)).toBe(0);
    expect(clampResource(108)).toBe(100);
    const choices = [{ id: "a", text: "A", weight: 20 }, { id: "b", text: "B", weight: 80 }];
    expect(pickWeightedOutcome(choices, sequenceRandom([0.199999])).id).toBe("a");
    expect(pickWeightedOutcome(choices, sequenceRandom([0.2])).id).toBe("b");
  });
  it("turns an eliminated character into a voting ghost", () => {
    const state: PrivateRoomState = {
      code: "ABC234", revision: 4, phase: "reveal", createdAt: 0, lastActivityAt: 0, hostPlayerId: "p_one", phaseStartedAt: 0,
      phaseDeadlineAt: 20_000, votingOpensAt: null, earliestResolveAt: null, phaseEndsAt: 20_000,
      players: { p_one: { id: "p_one", displayName: "One", status: "alive", characterId: "cast-ember", ready: true, connected: true, joinedAt: 0 } },
      characters: { "cast-ember": { characterId: "cast-ember", status: "alive" } }, resources: { food: 50, health: 50, morale: 50, shelter: 50 },
      deck: [], decisionIndex: 0, currentDecisionId: null, votesByPlayer: {}, eligibleVoterIds: ["p_one"], eventHistory: [],
    };
    const next = applyOutcome(state, { id: "fire", text: "Whoops", weight: 10, eliminateRandomLiving: true }, sequenceRandom([0]));
    expect(next.players.p_one?.status).toBe("ghost");
    expect(next.characters["cast-ember"]?.status).toBe("ghost");
    expect(next.eligibleVoterIds).toContain("p_one");
    expect(next.revision).toBe(5);
  });
});
