import { describe, expect, it } from "vitest";
import type { DecisionCard, Player, PrivateRoomState } from "../../src/shared/domain";
import { sequenceRandom } from "../../src/shared/rules/random";
import { resolveCurrentDecision } from "../../src/shared/rules/stateMachine";

const starvationScenario: DecisionCard = {
  id: "test-starvation",
  prompt: "The food bag contains one damp receipt. What does the group do?",
  options: [
    {
      id: "hunt-fish",
      label: "Try to catch fish",
      outcomes: [
        { id: "fish-caught", weight: 55, text: "A fish takes the bait. Dinner is saved, and the fishing committee becomes unbearable.", resourceDeltas: { food: 18, morale: 4 } },
        { id: "fish-missed", weight: 35, text: "The fish win. The group loses the bait and most of its dignity.", resourceDeltas: { food: -3, morale: -2 } },
        { id: "shark-mishap", weight: 10, text: "A shark steals the catch and one survivor earns an unexpected ghost promotion.", resourceDeltas: { health: -10 }, eliminateRandomLiving: true },
      ],
    },
    {
      id: "eat-daniel",
      label: "Eat Daniel",
      outcomes: [
        { id: "daniel-ration", weight: 100, text: "Daniel becomes the emergency ration. The group agrees not to make this a recurring tradition.", resourceDeltas: { food: 28, morale: -20 }, eliminateCharacterId: "cast-daniel" },
      ],
    },
    {
      id: "wait-it-out",
      label: "Pretend not to be hungry",
      outcomes: [{ id: "hunger-wins", weight: 100, text: "The stomachs file a louder complaint.", resourceDeltas: { morale: -8 } }],
    },
  ],
};

const cast: Array<{ id: string; characterId: string }> = [
  { id: "p_daniel", characterId: "cast-daniel" },
  { id: "p_samantha", characterId: "cast-samantha" },
  { id: "p_tony", characterId: "cast-tony" },
];

function player(id: string, characterId: string): Player {
  return { id, displayName: id, status: "alive", characterId, ready: true, connected: true, joinedAt: 0 };
}

function scenarioState(optionId: string): PrivateRoomState {
  return {
    code: "ABC234", revision: 7, phase: "decision", createdAt: 0, lastActivityAt: 0, hostPlayerId: "p_daniel",
    phaseStartedAt: 0, phaseDeadlineAt: 40_000, votingOpensAt: 25_000, earliestResolveAt: 35_000, phaseEndsAt: 40_000,
    players: Object.fromEntries(cast.map(({ id, characterId }) => [id, player(id, characterId)])),
    characters: Object.fromEntries(cast.map(({ characterId }) => [characterId, { characterId, status: "alive" as const, resources: { food: 8, health: 55, morale: 50, water: 50 } }])),
    resources: { shelter: 30 }, deck: [starvationScenario], decisionIndex: 0,
    currentDecisionId: starvationScenario.id, votesByPlayer: Object.fromEntries(cast.map(({ id }) => [id, optionId])),
    eligibleVoterIds: cast.map(({ id }) => id), eventHistory: [],
  };
}

describe("starvation decision scenario", () => {
  it.each([
    { random: [0.1], result: "fish-caught", food: 16, ghosts: 0 },
    { random: [0.55], result: "fish-missed", food: 0, ghosts: 0 },
    { random: [0.9, 0], result: "shark-mishap", food: 0, ghosts: 1 },
  ])("resolves the fish-hunt branch as $result", ({ random, result, food, ghosts }) => {
    const resolved = resolveCurrentDecision(scenarioState("hunt-fish"), 40_000, sequenceRandom(random));
    expect(resolved.eventHistory.at(-1)?.text).toContain(result === "fish-caught" ? "fish takes the bait" : result === "fish-missed" ? "fish win" : "shark steals");
    expect(resolved.characters["cast-samantha"]?.resources.food).toBe(food);
    expect(Object.values(resolved.players).filter(({ status }) => status === "ghost")).toHaveLength(ghosts);
    expect(resolved.phase).toBe("reveal");
  });

  it("eliminates Daniel specifically when the group votes to eat him", () => {
    const resolved = resolveCurrentDecision(scenarioState("eat-daniel"), 40_000, sequenceRandom([0.5]));
    expect(resolved.players.p_daniel?.status).toBe("ghost");
    expect(resolved.characters["cast-daniel"]?.status).toBe("ghost");
    expect(resolved.players.p_samantha?.status).toBe("alive");
    expect(resolved.characters["cast-samantha"]?.resources.food).toBe(26);
    expect(resolved.eventHistory.at(-1)?.text).toContain("Daniel becomes the emergency ration");
    expect(resolved.winningOptionId).toBe("eat-daniel");
  });
});
