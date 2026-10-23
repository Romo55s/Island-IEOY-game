import { describe, expect, it } from "vitest";
import { CHARACTER_CATALOG, type PublicGameSnapshot } from "../../src/shared/domain";
import { deriveCrewHistoryBeat } from "../../src/scene/crewHistoryDirector";

function snapshot(socialCue: "success" | "setback" | "danger" | "neutral" = "success"): PublicGameSnapshot {
  const characters = [CHARACTER_CATALOG[0]!, CHARACTER_CATALOG[1]!, CHARACTER_CATALOG[3]!].map(({ id }) => ({
    characterId: id, status: "alive" as const,
    resources: { food: 40, health: 80, morale: 60, water: 45 },
  }));
  const players = characters.map((character, index) => ({
    id: `p${index}`, displayName: `Player ${index}`, status: "alive" as const,
    characterId: character.characterId, ready: true, connected: true, joinedAt: index,
  }));
  return {
    code: "ABC234", revision: 3, phase: "reveal", hostPlayerId: "p0", phaseStartedAt: 0,
    phaseDeadlineAt: 10_000, votingOpensAt: null, earliestResolveAt: null, phaseEndsAt: 10_000,
    players, characters, characterCatalog: CHARACTER_CATALOG, resources: { shelter: 50 },
    currentDecision: { id: "coconut-jury", prompt: "", options: [] }, decisionNumber: 2, totalDecisions: 10,
    eligibleVoterIds: players.map(({ id }) => id), eventHistory: [{ id: "coconut-jury-123", decisionId: "coconut-jury", winningOptionId: "shake", outcomeId: "coconut-falls", socialCue, text: "An event.", createdAt: 1 }],
    viewer: { playerId: "p0", hasVoted: false },
  };
}

describe("history-aware crew behavior", () => {
  it("selects the same close celebration pair and clips on every client", () => {
    const game = snapshot("success");
    const before = structuredClone(game);
    const first = deriveCrewHistoryBeat(game);
    expect(deriveCrewHistoryBeat(game)).toEqual(first);
    expect(game).toEqual(before);
    expect(first.kind).toBe("shared-success");
    expect(first.interactionPairCharacterIds).toHaveLength(2);
    expect(Object.values(first.animationByCharacterId)).toContain("hug");
  });

  it("lets repeated outcomes rotate the interaction pair using the event history", () => {
    const first = snapshot("success");
    first.eventHistory[0]!.id = "event-0";
    const second = snapshot("success");
    second.eventHistory[0]!.id = "event-1";
    expect(deriveCrewHistoryBeat(first).interactionPairCharacterIds).not.toEqual(deriveCrewHistoryBeat(second).interactionPairCharacterIds);
  });

  it("uses a profile-aware mediator for a setback without naming a voter to blame", () => {
    const beat = deriveCrewHistoryBeat(snapshot("setback"));
    expect(beat.kind).toBe("setback");
    expect(beat.interactionPairCharacterIds?.[0]).toBe("cast-esther-morgan");
    expect(beat.animationByCharacterId["cast-esther-morgan"]).toBe("agree");
    expect(beat.interactionPairCharacterIds?.[1]).toBeTruthy();
    expect(beat.animationByCharacterId[beat.interactionPairCharacterIds![1]!]).toBe("complain_01");
  });

  it("starts deterministic hunger banter only when the living crew has no food", () => {
    const game = snapshot("neutral");
    game.characters.forEach((character) => { character.resources.food = 0; });
    const first = deriveCrewHistoryBeat(game);
    expect(first.kind).toBe("hunger-talk");
    expect(first.interactionPairCharacterIds).toHaveLength(2);
    expect(deriveCrewHistoryBeat(game)).toEqual(first);

    game.characters[0]!.resources.food = 1;
    expect(deriveCrewHistoryBeat(game).kind).toBe("food-search");
  });

  it("keeps death reactions ahead of hunger banter and only evaluates it during reveal", () => {
    const game = snapshot("danger");
    game.characters.forEach((character) => { character.resources.food = 0; });
    game.characters[0]!.status = "ghost";
    game.eventHistory[0]!.deathCharacterIds = [game.characters[0]!.characterId];
    expect(deriveCrewHistoryBeat(game).kind).toBe("mourning");

    game.eventHistory[0]!.deathCharacterIds = [];
    game.phase = "decision";
    expect(deriveCrewHistoryBeat(game).kind).toBe("quiet");
  });

  it("sends a hungry survivor to search with one deterministic crewmate", () => {
    const game = snapshot("neutral");
    game.characters[0]!.resources.food = 0;
    const beat = deriveCrewHistoryBeat(game);
    expect(beat.kind).toBe("food-search");
    expect(beat.interactionPairCharacterIds).toHaveLength(2);
    expect(Object.values(beat.behaviorByCharacterId)).toContain("Searching the area for food");
    expect(deriveCrewHistoryBeat(game)).toEqual(beat);
  });

  it("stages an empathetic survivor checking on the most injured member after danger", () => {
    const game = snapshot("danger");
    game.characters[1]!.resources.health = 30;
    const beat = deriveCrewHistoryBeat(game);
    expect(beat.kind).toBe("danger");
    expect(beat.interactionPairCharacterIds).toEqual(["cast-esther-morgan", "cast-samantha"]);
    expect(beat.behaviorByCharacterId).toMatchObject({
      "cast-esther-morgan": "Checking on an injured crewmate",
      "cast-samantha": "Recovering after the danger",
    });
  });

  it("assigns a watch and a rest action during a neutral reveal", () => {
    const game = snapshot("neutral");
    const beat = deriveCrewHistoryBeat(game);
    expect(beat.kind).toBe("quiet");
    expect(Object.values(beat.behaviorByCharacterId)).toContain("Keeping watch");
    expect(Object.values(beat.behaviorByCharacterId)).toContain("Catching a breath");
  });

  it("plays death from explicit event IDs and has a survivor respond", () => {
    const game = snapshot("danger");
    game.characters[0]!.status = "ghost";
    game.characters[0]!.resources.health = 0;
    game.players[0]!.status = "ghost";
    game.eventHistory[0]!.deathCharacterIds = ["cast-daniel"];
    const beat = deriveCrewHistoryBeat(game);
    expect(beat.kind).toBe("mourning");
    expect(beat.animationByCharacterId).toMatchObject({ "cast-daniel": "fall", "cast-esther-morgan": "depressed" });
    expect(beat.interactionPairCharacterIds).toEqual(["cast-esther-morgan", "cast-daniel"]);
  });

  it("prefers the structured presentation cue over stale compact fields", () => {
    const game = snapshot("neutral");
    const event = game.eventHistory[0]!;
    event.resolution = {
      decisionId: "coconut-jury", prompt: "Shake it?", winningOptionId: "shake", winningOptionLabel: "Shake", outcomeId: "coconut-falls", outcomeText: "Somehow this worked.",
      optionResults: [{ optionId: "shake", label: "Shake", votes: 3 }], resourceChanges: [], statusChanges: [], affectedCharacterIds: [], presentationCue: "success",
    };
    expect(deriveCrewHistoryBeat(game).kind).toBe("shared-success");
  });

  it("reunites crash rescuers and saved characters, but stays quiet during voting", () => {
    const game = snapshot();
    game.phase = "crashResolution";
    game.crashResolution = {
      attempts: [{ rescuerCharacterId: "cast-daniel", targetCharacterId: "cast-samantha", itemId: "rope", outcome: "success" }],
      savedCharacterIds: ["cast-samantha"], eliminatedCharacterIds: [], summary: "Rescue.",
    };
    expect(deriveCrewHistoryBeat(game)).toMatchObject({
      kind: "rescue-reunion", interactionPairCharacterIds: ["cast-daniel", "cast-samantha"],
      animationByCharacterId: { "cast-daniel": "cheer", "cast-samantha": "hug" },
    });
    game.phase = "decision";
    expect(deriveCrewHistoryBeat(game).kind).toBe("quiet");
  });
});
