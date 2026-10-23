import { describe, expect, it } from "vitest";
import type { PrivateRoomState } from "../../src/shared/domain";
import { didRefusalSucceed, eligibleLivingAssignments, resolveAssignedActor } from "../../src/shared/rules/assignments";
import { applyOutcome } from "../../src/shared/rules/outcomes";
import { sequenceRandom } from "../../src/shared/rules/random";

function room(): PrivateRoomState {
  return {
    code: "ABC234", revision: 1, phase: "decision", createdAt: 0, lastActivityAt: 0, hostPlayerId: "p_a",
    phaseStartedAt: 0, phaseDeadlineAt: 10_000, votingOpensAt: 0, earliestResolveAt: 0, phaseEndsAt: 10_000,
    players: {
      p_a: { id: "p_a", displayName: "A", status: "alive", characterId: "cast-daniel", ready: true, connected: true, joinedAt: 0 },
      p_b: { id: "p_b", displayName: "B", status: "alive", characterId: "cast-samantha", ready: true, connected: true, joinedAt: 1 },
      p_g: { id: "p_g", displayName: "Ghost", status: "ghost", characterId: "cast-tony", ready: true, connected: true, joinedAt: 2 },
    },
    characters: {
      "cast-daniel": { characterId: "cast-daniel", status: "alive", resources: { food: 50, health: 60, morale: 50, water: 50 } },
      "cast-samantha": { characterId: "cast-samantha", status: "alive", resources: { food: 50, health: 70, morale: 50, water: 50 } },
      "cast-tony": { characterId: "cast-tony", status: "ghost", resources: { food: 50, health: 0, morale: 50, water: 50 } },
    },
    resources: { shelter: 50 }, deck: [], decisionIndex: 0, currentDecisionId: "cave", votesByPlayer: { p_a: "send", p_b: "send", p_g: "send" },
    eligibleVoterIds: ["p_a", "p_b", "p_g"], eventHistory: [],
    assignmentNominationsByPlayer: { p_a: "cast-daniel", p_b: "cast-samantha", p_g: "cast-samantha" },
  };
}

describe("assignment rules", () => {
  it("lets ghost ballots nominate a living actor while excluding ghost actors", () => {
    const state = room();
    expect(eligibleLivingAssignments(state).map(({ actorCharacterId }) => actorCharacterId)).toEqual(["cast-daniel", "cast-samantha"]);
    expect(resolveAssignedActor(state, "send", sequenceRandom([]))).toEqual({
      actorCharacterId: "cast-samantha", actorPlayerId: "p_b", selectionMethod: "group-nomination",
    });
  });

  it("breaks nomination ties once and falls back randomly when no valid nomination exists", () => {
    const state = room();
    state.assignmentNominationsByPlayer = { p_a: "cast-daniel", p_b: "cast-samantha", p_g: "cast-tony" };
    expect(resolveAssignedActor(state, "send", sequenceRandom([0.99]))?.actorCharacterId).toBe("cast-samantha");
    state.assignmentNominationsByPlayer = { p_a: "cast-tony" };
    expect(resolveAssignedActor(state, "send", sequenceRandom([0]))).toEqual({
      actorCharacterId: "cast-daniel", actorPlayerId: "p_a", selectionMethod: "random-fallback",
    });
  });

  it("uses half-open basis-point refusal boundaries and validates tuning", () => {
    expect(didRefusalSucceed(3_500, sequenceRandom([0.3499]))).toBe(true);
    expect(didRefusalSucceed(3_500, sequenceRandom([0.35]))).toBe(false);
    expect(() => didRefusalSucceed(-1, sequenceRandom([0]))).toThrow();
    expect(() => didRefusalSucceed(10_001, sequenceRandom([0]))).toThrow();
  });

  it("applies actor-targeted damage and elimination only to the committed actor", () => {
    const state = room();
    const damaged = applyOutcome(state, { id: "bat", text: "Bats.", weight: 1, effectTarget: "assigned-actor", resourceDeltas: { health: -20 } }, sequenceRandom([]), "cast-daniel");
    expect(damaged.characters["cast-daniel"]?.resources.health).toBe(40);
    expect(damaged.characters["cast-samantha"]?.resources.health).toBe(70);
    const eliminated = applyOutcome(state, { id: "lost", text: "Lost.", weight: 1, effectTarget: "assigned-actor", eliminateRandomLiving: true }, sequenceRandom([]), "cast-daniel");
    expect(eliminated.players.p_a?.status).toBe("ghost");
    expect(eliminated.players.p_b?.status).toBe("alive");
    expect(() => applyOutcome(state, { id: "bad", text: "Bad.", weight: 1, effectTarget: "assigned-actor" }, sequenceRandom([]))).toThrow();
  });
});
