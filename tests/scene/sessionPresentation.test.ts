import { describe, expect, it } from "vitest";
import { CHARACTER_CATALOG, type PublicGameSnapshot } from "../../src/shared/domain";
import { CHARACTER_PROFILES } from "../../src/shared/content/characterProfiles";
import { toSessionScenePresentation } from "../../src/scene/sessionPresentation";

function snapshot(overrides: Partial<PublicGameSnapshot> = {}): PublicGameSnapshot {
  const character = CHARACTER_CATALOG[0]!;
  return {
    code: "ABC234", revision: 1, phase: "decision", hostPlayerId: "p_daniel", phaseStartedAt: 0,
    phaseDeadlineAt: 30_000, votingOpensAt: 25_000, earliestResolveAt: 26_000, phaseEndsAt: 30_000,
    players: [{ id: "p_daniel", displayName: "Danny", status: "alive", characterId: character.id, ready: true, connected: true, joinedAt: 0 }],
    characters: [{ characterId: character.id, status: "alive", resources: { food: 50, health: 100, morale: 65, water: 50 }, startingItemId: "knife" }],
    characterCatalog: CHARACTER_CATALOG, resources: { shelter: 50 },
    currentDecision: { id: "card", prompt: "What now?", options: [{ id: "one", label: "Run" }, { id: "two", label: "Stay" }] },
    decisionNumber: 2, totalDecisions: 10, eligibleVoterIds: ["p_daniel"], eventHistory: [],
    viewer: { playerId: "p_daniel", hasVoted: false },
    ...overrides,
  };
}

describe("session scene presentation", () => {
  it("keys playback by the event rather than snapshot revision", () => {
    const original = snapshot({ phase: "reveal", phaseStartedAt: 1000, eventHistory: [{ id: "a", text: "Result", createdAt: 1000 }] });
    const first = toSessionScenePresentation(original).members[0]!;
    expect(first.animationStartedAt).toBe(1000);
    expect(toSessionScenePresentation({ ...original, revision: 99 }).members[0]?.animationEventId).toBe(first.animationEventId);
    expect(toSessionScenePresentation({ ...original, eventHistory: [{ id: "b", text: "Result", createdAt: 1000 }] }).members[0]?.animationEventId).not.toBe(first.animationEventId);
  });

  it("maps selected characters, held items, phase, and survival counts", () => {
    const view = toSessionScenePresentation(snapshot());
    expect(view.phaseLabel).toBe("Crew decision pending");
    expect(view.members).toHaveLength(1);
    expect(view.members[0]).toMatchObject({ characterId: "cast-daniel", playerName: "Danny", name: "Daniel", status: "alive", startingItemId: "knife" });
    expect(view.livingCount).toBe(1);
    expect(view.ghostCount).toBe(0);
    expect(view.zoneId).toBe("crash_beach");
  });

  it("directs each authored encounter to its island zone and preserves a dead character's ground pose", () => {
    const scenarios = [
      ["wreckage-lighter", "crash_beach"], ["coconut-jury", "jungle_clearing"], ["smoke-signal", "rocky_coast"], ["mystery-berries", "jungle_clearing"],
      ["shelter-politics", "forest_crossroads"], ["boar-diplomacy", "forest_crossroads"], ["rainwater-budget", "waterfall_pool"],
      ["distress-flare", "rocky_coast"], ["cave-of-bad-ideas", "mountain_foothills"], ["raft-committee", "rocky_coast"],
    ] as const;
    for (const [id, zoneId] of scenarios) {
      const view = toSessionScenePresentation(snapshot({ currentDecision: { id, prompt: "", options: [] } }));
      expect(view.zoneId).toBe(zoneId);
    }
    const dead = snapshot({
      phase: "reveal",
      characters: [{ characterId: "cast-daniel", status: "ghost", resources: { food: 0, health: 0, morale: 65, water: 50 } }],
      players: [{ id: "p_daniel", displayName: "Danny", status: "ghost", characterId: "cast-daniel", ready: true, connected: true, joinedAt: 0 }],
      eventHistory: [{ id: "event", text: "The crew encountered a ghost story.", createdAt: 1, deathCharacterIds: ["cast-daniel"] }],
    });
    expect(toSessionScenePresentation(dead).members[0]?.animationName).toBe("fall");
    const unrelatedGhost = snapshot({
      phase: "reveal",
      characters: [{ characterId: "cast-daniel", status: "ghost", resources: { food: 0, health: 0, morale: 65, water: 50 } }],
      players: [{ id: "p_daniel", displayName: "Danny", status: "ghost", characterId: "cast-daniel", ready: true, connected: true, joinedAt: 0 }],
      eventHistory: [{ id: "event", text: "A ghost story.", createdAt: 1 }],
    });
    expect(toSessionScenePresentation(unrelatedGhost).members[0]).toMatchObject({ animationName: "fall", animationHoldAtEnd: true });
  });

  it("plays death from the authoritative status transition when compact legacy fields are absent", () => {
    const event = {
      id: "structured-death", text: "A compact report.", createdAt: 1, decisionId: "card", winningOptionId: "one", outcomeId: "bad", socialCue: "neutral" as const,
      resolution: {
        decisionId: "card", prompt: "What now?", winningOptionId: "one", winningOptionLabel: "Run", outcomeId: "bad", outcomeText: "Daniel trips at a professionally unfortunate angle.",
        optionResults: [{ optionId: "one", label: "Run", votes: 1 }], resourceChanges: [],
        statusChanges: [{ characterId: "cast-daniel", before: "alive" as const, after: "ghost" as const, cause: "outcome" as const }],
        affectedCharacterIds: ["cast-daniel"], presentationCue: "danger" as const,
      },
    };
    const game = snapshot({
      phase: "reveal",
      characters: [{ characterId: "cast-daniel", status: "ghost", resources: { food: 40, health: 0, morale: 20, water: 35 } }],
      players: [{ id: "p_daniel", displayName: "Danny", status: "ghost", characterId: "cast-daniel", ready: true, connected: true, joinedAt: 0 }],
      eventHistory: [event],
    });
    expect(toSessionScenePresentation(game).members[0]?.animationName).toBe("fall");
  });

  it("represents ghosts explicitly and omits members without a character selection", () => {
    const ghostSnapshot = snapshot({
      players: [
        { id: "p_daniel", displayName: "Danny", status: "ghost", characterId: "cast-daniel", ready: true, connected: true, joinedAt: 0 },
        { id: "p_waiting", displayName: "Waiting", status: "alive", characterId: null, ready: false, connected: true, joinedAt: 1 },
      ],
      characters: [{ characterId: "cast-daniel", status: "ghost", resources: { food: 40, health: 0, morale: 20, water: 35 } }],
    });
    const view = toSessionScenePresentation(ghostSnapshot);
    expect(view.members).toHaveLength(1);
    expect(view.members[0]?.name).toContain("GHOST");
    expect(view.ghostCount).toBe(1);
    expect(view.livingCount).toBe(0);
  });

  it("uses the profile hunger dialogue during an empty-food reveal without changing survival values", () => {
    const hungry = snapshot({
      phase: "reveal",
      characters: [{ characterId: "cast-daniel", status: "alive", resources: { food: 0, health: 40, morale: 65, water: 50 } }],
      eventHistory: [{ id: "hungry-event", text: "No food remains.", createdAt: 1 }],
    });
    const before = structuredClone(hungry);
    const member = toSessionScenePresentation(hungry).members[0];
    expect(member?.reactionLine).toBeTruthy();
    expect(CHARACTER_PROFILES[0]?.reactions.hunger).toContain(member?.reactionLine);
    expect(hungry).toEqual(before);
  });

  it("surfaces reveal-only crew action labels in deterministic scene members", () => {
    const hungry = snapshot({
      phase: "reveal",
      characters: [
        { characterId: "cast-daniel", status: "alive", resources: { food: 0, health: 70, morale: 65, water: 50 } },
        { characterId: "cast-samantha", status: "alive", resources: { food: 40, health: 100, morale: 65, water: 50 } },
      ],
      players: [
        { id: "p_daniel", displayName: "Danny", status: "alive", characterId: "cast-daniel", ready: true, connected: true, joinedAt: 0 },
        { id: "p_sam", displayName: "Sam", status: "alive", characterId: "cast-samantha", ready: true, connected: true, joinedAt: 1 },
      ],
      eventHistory: [{ id: "search-event", text: "A quiet day.", createdAt: 1 }],
    });
    const first = toSessionScenePresentation(hungry);
    expect(first.members.find(({ characterId }) => characterId === "cast-daniel")?.behaviorLabel).toBe("Searching the area for food");
    expect(first.members.find(({ characterId }) => characterId === "cast-samantha")?.behaviorLabel).toBe("Joining the food search");
    expect(first.members.find(({ characterId }) => characterId === "cast-daniel")?.thoughtLine).toBe("I’m checking the area for something edible.");
    expect(first.members.find(({ characterId }) => characterId === "cast-samantha")?.thoughtLine).toBe("I’ll search the other side of camp.");
    expect(toSessionScenePresentation(hungry)).toEqual(first);
    expect(toSessionScenePresentation({ ...hungry, phase: "decision" }).members.every(({ behaviorLabel }) => behaviorLabel === undefined)).toBe(true);
  });

  it("uses crash outcomes and stable ambient clips without mutating the snapshot", () => {
    const crash = snapshot({
      phase: "crashResolution",
      characters: [{ characterId: "cast-daniel", status: "alive", resources: { food: 50, health: 100, morale: 65, water: 50 } }],
      crashResolution: {
        attempts: [{ rescuerCharacterId: "cast-daniel", targetCharacterId: "cast-samantha", itemId: "rope", outcome: "success" }],
        savedCharacterIds: ["cast-samantha"], eliminatedCharacterIds: [], summary: "A rescue.",
      },
    });
    const before = structuredClone(crash);
    const reaction = toSessionScenePresentation(crash).members[0];
    expect(reaction?.animationName).toBe("cheer");
    expect(CHARACTER_PROFILES[0]?.reactions.success).toContain(reaction?.reactionLine);
    expect(crash).toEqual(before);
    const idleSnapshot = snapshot({ phase: "crashItemChoice", decisionNumber: 0 });
    expect(toSessionScenePresentation(idleSnapshot).members[0]?.animationName)
      .toBe(toSessionScenePresentation(idleSnapshot).members[0]?.animationName);
  });

  it("integrates motorboat staging without naming a private fuel finder", () => {
    const privateFuel = snapshot({
      phase: "privateChoice",
      currentDecision: null,
      motorboat: {
        node: "fuel-choice", discovered: true, hull: "sound", engine: "broken",
        fuelAvailability: "known-private", warningLevel: 0, missCount: 0, completion: "active",
      },
      activePrivateChoice: { id: "fuel-choice", kind: "fuel-discovery", deadlineAt: 16_000 },
      viewerPrivateChoice: { canRespond: true, optionIds: ["share", "hide"] },
    });
    const privateView = toSessionScenePresentation(privateFuel);
    expect(privateView.zoneId).toBe("motorboat_cove");
    expect(privateView.phaseLabel).toBe("Someone found fuel. They are deciding what to do");
    expect(privateView.members[0]?.stageRole).toBeUndefined();

    const publicCustodian = toSessionScenePresentation({
      ...privateFuel,
      activePrivateChoice: { id: "launch-choice", kind: "launch-custodian", deadlineAt: 16_000, publicActorCharacterId: "cast-daniel" },
      motorboat: { ...privateFuel.motorboat!, node: "launch", fuelAvailability: "shared", fuelCharges: 1 },
    });
    expect(publicCustodian.zoneId).toBe("motorboat_launch");
    expect(publicCustodian.phaseLabel).toBe("Daniel has night watch");
    expect(publicCustodian.members[0]?.stageRole).toBe("motorboat-actor");
  });

  it("plays a terminal storm death from direct public route status changes", () => {
    const storm = snapshot({
      phase: "ending", currentDecision: null,
      players: [{ id: "p_daniel", displayName: "Danny", status: "ghost", characterId: "cast-daniel", ready: true, connected: true, joinedAt: 0 }],
      characters: [{ characterId: "cast-daniel", status: "ghost", resources: { food: 0, health: 0, morale: 0, water: 0 } }],
      motorboat: { node: "terminal", discovered: true, hull: "leaking", engine: "fragile", fuelAvailability: "none", warningLevel: 2, missCount: 3, completion: "no-survivors" },
      eventHistory: [{
        id: "storm", text: "The storm takes the island.", createdAt: 20,
        motorboat: {
          node: "terminal", boatChange: "storm-destroyed", missNumber: 3, endingCause: "storm-surge",
          statusChanges: [{ characterId: "cast-daniel", before: "alive", after: "ghost", cause: "storm-surge" }],
        },
      }],
    });
    const view = toSessionScenePresentation(storm);
    expect(view.zoneId).toBe("motorboat_storm");
    expect(view.members[0]?.animationName).toBe("fall");
  });
});
