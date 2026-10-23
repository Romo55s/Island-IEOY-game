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
      players: { p_one: { id: "p_one", displayName: "One", status: "alive", characterId: "cast-daniel", ready: true, connected: true, joinedAt: 0 } },
      characters: { "cast-daniel": { characterId: "cast-daniel", status: "alive", resources: { food: 50, health: 50, morale: 50, water: 50 } } }, resources: { shelter: 50 },
      deck: [], decisionIndex: 0, currentDecisionId: null, votesByPlayer: {}, eligibleVoterIds: ["p_one"], eventHistory: [],
    };
    const next = applyOutcome(state, { id: "fire", text: "Whoops", weight: 10, eliminateRandomLiving: true }, sequenceRandom([0]));
    expect(next.players.p_one?.status).toBe("ghost");
    expect(next.characters["cast-daniel"]?.status).toBe("ghost");
    expect(next.characters["cast-daniel"]?.resources.health).toBe(0);
    expect(next.eligibleVoterIds).toContain("p_one");
    expect(next.revision).toBe(5);
  });
  it("turns health reaching zero into a ghost with health fixed at zero", () => {
    const state: PrivateRoomState = {
      code: "ABC234", revision: 4, phase: "reveal", createdAt: 0, lastActivityAt: 0, hostPlayerId: "p_one", phaseStartedAt: 0,
      phaseDeadlineAt: 20_000, votingOpensAt: null, earliestResolveAt: null, phaseEndsAt: 20_000,
      players: { p_one: { id: "p_one", displayName: "One", status: "alive", characterId: "cast-daniel", ready: true, connected: true, joinedAt: 0 } },
      characters: { "cast-daniel": { characterId: "cast-daniel", status: "alive", resources: { food: 20, health: 5, morale: 50, water: 50 } } }, resources: { shelter: 50 },
      deck: [], decisionIndex: 0, currentDecisionId: null, votesByPlayer: {}, eligibleVoterIds: ["p_one"], eventHistory: [],
    };
    const next = applyOutcome(state, { id: "fatal-fall", text: "The fall was not ideal.", weight: 1, resourceDeltas: { health: -5 } }, sequenceRandom([]));
    expect(next.characters["cast-daniel"]?.status).toBe("ghost");
    expect(next.characters["cast-daniel"]?.resources.health).toBe(0);
    expect(next.players.p_one?.status).toBe("ghost");
    expect(next.eligibleVoterIds).toContain("p_one");
  });
  it("applies personal effects to one character while shelter remains shared", () => {
    const base = {
      code: "ABC234", revision: 1, phase: "reveal" as const, createdAt: 0, lastActivityAt: 0, hostPlayerId: "p_one", phaseStartedAt: 0,
      phaseDeadlineAt: 20_000, votingOpensAt: null, earliestResolveAt: null, phaseEndsAt: 20_000,
      players: { p_one: { id: "p_one", displayName: "One", status: "alive" as const, characterId: "cast-daniel", ready: true, connected: true, joinedAt: 0 }, p_two: { id: "p_two", displayName: "Two", status: "alive" as const, characterId: "cast-samantha", ready: true, connected: true, joinedAt: 0 } },
      characters: {
        "cast-daniel": { characterId: "cast-daniel", status: "alive" as const, resources: { food: 50, health: 80, morale: 50, water: 50 } },
        "cast-samantha": { characterId: "cast-samantha", status: "alive" as const, resources: { food: 50, health: 90, morale: 50, water: 50 } },
      },
      resources: { shelter: 40 }, deck: [], decisionIndex: 0, currentDecisionId: null, votesByPlayer: {}, eligibleVoterIds: ["p_one", "p_two"], eventHistory: [],
    } satisfies PrivateRoomState;
    const next = applyOutcome(base, { id: "fall", text: "A branch falls", weight: 100, affectedCharacterId: "cast-daniel", resourceDeltas: { health: -20, shelter: 15 } }, sequenceRandom([]));
    expect(next.characters["cast-daniel"]?.resources.health).toBe(60);
    expect(next.characters["cast-samantha"]?.resources.health).toBe(90);
    expect(next.resources.shelter).toBe(55);
  });
});
