import { describe, expect, it } from "vitest";
import type { DecisionCard, PrivateRoomState } from "../../src/shared/domain";
import { createResolvedDecision } from "../../src/shared/rules/resolvedEvents";

function room(): PrivateRoomState {
  return {
    code: "ABC234", revision: 1, phase: "decision", createdAt: 0, lastActivityAt: 0, hostPlayerId: "p_one", phaseStartedAt: 0,
    phaseDeadlineAt: 10_000, votingOpensAt: 0, earliestResolveAt: 0, phaseEndsAt: 10_000,
    players: {
      p_one: { id: "p_one", displayName: "One", status: "alive", characterId: "cast-daniel", ready: true, connected: true, joinedAt: 0 },
      p_two: { id: "p_two", displayName: "Two", status: "alive", characterId: "cast-samantha", ready: true, connected: true, joinedAt: 0 },
    },
    characters: {
      "cast-daniel": { characterId: "cast-daniel", status: "alive", resources: { food: 0, health: 5, morale: 50, water: 50 } },
      "cast-samantha": { characterId: "cast-samantha", status: "alive", resources: { food: 20, health: 90, morale: 50, water: 50 } },
    },
    resources: { shelter: 95 }, deck: [], decisionIndex: 0, currentDecisionId: "storm", votesByPlayer: {}, eligibleVoterIds: ["p_one", "p_two"], eventHistory: [],
  };
}

describe("resolved decision facts", () => {
  it("records actual clamped outcome, upkeep, starvation, and death transitions separately", () => {
    const before = room();
    const card: DecisionCard = { id: "storm", prompt: "Patch the roof?", options: [
      { id: "patch", label: "Patch it", outcomes: [] },
      { id: "dance", label: "Dance in the rain", outcomes: [] },
    ] };
    const outcome = { id: "patched", text: "The roof becomes aggressively adequate.", weight: 1, resourceDeltas: { shelter: 20 } };
    const afterOutcome: PrivateRoomState = { ...before, resources: { shelter: 100 }, revision: 2 };
    const afterSurvival: PrivateRoomState = {
      ...afterOutcome,
      revision: 3,
      players: { ...afterOutcome.players, p_one: { ...afterOutcome.players.p_one!, status: "ghost" } },
      characters: {
        ...afterOutcome.characters,
        "cast-daniel": { ...afterOutcome.characters["cast-daniel"]!, status: "ghost", resources: { ...afterOutcome.characters["cast-daniel"]!.resources, health: 0 } },
        "cast-samantha": { ...afterOutcome.characters["cast-samantha"]!, resources: { ...afterOutcome.characters["cast-samantha"]!.resources, food: 10 } },
      },
    };

    const resolution = createResolvedDecision({
      before, afterOutcome, afterSurvival, card, option: card.options[0]!, outcome,
      optionCounts: { patch: 2, dance: 0 }, presentationCue: "danger",
    });

    expect(resolution.optionResults).toEqual([
      { optionId: "patch", label: "Patch it", votes: 2 },
      { optionId: "dance", label: "Dance in the rain", votes: 0 },
    ]);
    expect(resolution.resourceChanges).toEqual(expect.arrayContaining([
      { scope: "crew", resource: "shelter", before: 95, after: 100, delta: 5, cause: "outcome" },
      { scope: "character", characterId: "cast-daniel", resource: "health", before: 5, after: 0, delta: -5, cause: "starvation" },
      { scope: "character", characterId: "cast-samantha", resource: "food", before: 20, after: 10, delta: -10, cause: "daily-consumption" },
    ]));
    expect(resolution.statusChanges).toEqual([{ characterId: "cast-daniel", before: "alive", after: "ghost", cause: "starvation" }]);
    expect(resolution.affectedCharacterIds).toEqual(["cast-daniel", "cast-samantha"]);
  });

  it("records the assigned actor even when the outcome changes no personal resource", () => {
    const before = room();
    const card: DecisionCard = { id: "cave", prompt: "Who enters?", options: [
      { id: "send", label: "Send one volunteer", outcomes: [] },
    ] };
    const outcome = { id: "sealed", text: "The cave is sealed.", weight: 1, resourceDeltas: { shelter: -5 } };
    const afterOutcome = { ...before, resources: { shelter: 90 } };
    const assignment = { id: "assignment-1", actorCharacterId: "cast-samantha", roleLabel: "enter the cave", selectionMethod: "group-nomination" as const, result: "refusal-succeeded" as const };
    const resolution = createResolvedDecision({
      before, afterOutcome, afterSurvival: afterOutcome, card, option: card.options[0]!, outcome,
      optionCounts: { send: 2 }, presentationCue: "setback", assignment,
    });
    expect(resolution.assignment).toEqual(assignment);
    expect(resolution.affectedCharacterIds).toContain("cast-samantha");
  });
});
