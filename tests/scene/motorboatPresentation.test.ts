import { describe, expect, it } from "vitest";
import { CHARACTER_CATALOG, type EventEntry, type PublicGameSnapshot, type PublicMotorboatRouteState } from "../../src/shared/domain";
import {
  deriveMotorboatScenePresentation,
  getMotorboatAnimation,
  getMotorboatStageRole,
} from "../../src/scene/motorboatPresentation";
import { getMotorboatPropAppearance } from "../../src/scene/props/MotorboatRouteProp";

const baseRoute: PublicMotorboatRouteState = {
  node: "discovery",
  discovered: false,
  hull: "unknown",
  engine: "unknown",
  fuelAvailability: "none",
  warningLevel: 0,
  missCount: 0,
  completion: "active",
};

function snapshot(overrides: Partial<PublicGameSnapshot> = {}): PublicGameSnapshot {
  const definitions = CHARACTER_CATALOG.slice(0, 2);
  return {
    code: "BOAT42", revision: 1, phase: "decision", hostPlayerId: "p1", phaseStartedAt: 1,
    phaseDeadlineAt: 16_000, votingOpensAt: 1, earliestResolveAt: 2, phaseEndsAt: 16_000,
    players: definitions.map((definition, index) => ({
      id: `p${index + 1}`, displayName: `Player ${index + 1}`, status: "alive", characterId: definition.id,
      ready: true, connected: true, joinedAt: index,
    })),
    characters: definitions.map(({ id }) => ({ characterId: id, status: "alive", resources: { food: 50, health: 100, morale: 65, water: 50 } })),
    characterCatalog: CHARACTER_CATALOG, resources: { shelter: 50 },
    currentDecision: { id: "motorboat-discovery", prompt: "Inspect the boat?", options: [] },
    decisionNumber: 1, totalDecisions: 4, eligibleVoterIds: ["p1", "p2"], eventHistory: [],
    viewer: { playerId: "p1", hasVoted: false }, motorboat: baseRoute,
    ...overrides,
  };
}

function routeEvent(boatChange: NonNullable<NonNullable<EventEntry["resolution"]>["motorboat"]>["boatChange"], extras: Partial<NonNullable<EventEntry["resolution"]>> = {}): EventEntry {
  return {
    id: `event-${boatChange}`, text: "The boat route changed.", createdAt: 10,
    resolution: {
      decisionId: "motorboat-repair", prompt: "Repair it?", winningOptionId: "repair", winningOptionLabel: "Repair",
      outcomeId: `outcome-${boatChange}`, outcomeText: "A visible consequence.", optionResults: [], resourceChanges: [], statusChanges: [],
      affectedCharacterIds: [], presentationCue: "neutral",
      motorboat: { node: boatChange === "storm-destroyed" ? "terminal" : boatChange === "escaped" ? "complete" : "repair", boatChange },
      ...extras,
    },
  };
}

describe("motorboat scene presentation", () => {
  it("maps every authored route decision to a grounded scene zone", () => {
    const scenarios = [
      ["motorboat-discovery", "motorboat_cove"],
      ["motorboat-repair", "motorboat_repair"],
      ["motorboat-recovery", "motorboat_repair"],
      ["motorboat-group-launch", "motorboat_launch"],
    ] as const;
    for (const [decisionId, zoneId] of scenarios) {
      const view = deriveMotorboatScenePresentation(snapshot({ currentDecision: { id: decisionId, prompt: "", options: [] } }));
      expect(view?.zoneId).toBe(zoneId);
    }
  });

  it("produces identical shared staging for viewers with different private fuel options", () => {
    const publicState = {
      ...baseRoute,
      node: "fuel-choice" as const,
      discovered: true,
      fuelAvailability: "known-private" as const,
    };
    const common = {
      phase: "privateChoice" as const,
      currentDecision: null,
      motorboat: publicState,
      activePrivateChoice: { id: "private-fuel", kind: "fuel-discovery" as const, deadlineAt: 16_000 },
    };
    const finderView = deriveMotorboatScenePresentation(snapshot({
      ...common,
      viewerPrivateChoice: { canRespond: true, optionIds: ["share", "hide", "transfer"], transferableTargetCharacterIds: ["cast-samantha"] },
    }));
    const observerView = deriveMotorboatScenePresentation(snapshot(common));
    expect(finderView).toEqual(observerView);
    expect(finderView?.publicActorCharacterId).toBeUndefined();
    expect(finderView?.passengerCharacterIds).toEqual([]);
    expect(JSON.stringify(finderView)).not.toContain("cast-samantha");
  });

  it("stages only the explicitly public custodian during a private launch choice", () => {
    const view = deriveMotorboatScenePresentation(snapshot({
      phase: "privateChoice", currentDecision: null,
      motorboat: { ...baseRoute, node: "launch", discovered: true, hull: "sound", engine: "sturdy", fuelAvailability: "shared", fuelCharges: 1 },
      activePrivateChoice: { id: "private-launch", kind: "launch-custodian", deadlineAt: 16_000, publicActorCharacterId: "cast-daniel" },
    }));
    expect(view?.zoneId).toBe("motorboat_launch");
    expect(view?.publicActorCharacterId).toBe("cast-daniel");
    expect(getMotorboatStageRole(view, "cast-daniel")).toBe("motorboat-actor");
    expect(getMotorboatStageRole(view, "cast-samantha")).toBeUndefined();
  });

  it("uses public repair and passenger facts for one-shot reactions", () => {
    const repair = routeEvent("repaired-sturdy", {
      assignment: { id: "assignment", actorCharacterId: "cast-daniel", roleLabel: "repair the boat", selectionMethod: "group-nomination", result: "accepted" },
    });
    const repairView = deriveMotorboatScenePresentation(snapshot({ phase: "reveal", currentDecision: null, eventHistory: [repair], motorboat: { ...baseRoute, node: "repair", discovered: true, hull: "sound", engine: "sturdy" } }));
    expect(repairView?.zoneId).toBe("motorboat_repair");
    expect(getMotorboatAnimation(repairView, "cast-daniel")).toEqual({ name: "agree", once: true });
    expect(getMotorboatAnimation(repairView, "cast-samantha")).toBeNull();

    const escape = routeEvent("escaped", {
      motorboat: { node: "complete", boatChange: "escaped", passengerCharacterIds: ["cast-samantha"], endingCause: "solo-launch", fuelConsumed: true },
    });
    const escapeView = deriveMotorboatScenePresentation(snapshot({ phase: "ending", currentDecision: null, eventHistory: [escape], motorboat: { ...baseRoute, node: "complete", discovered: true, hull: "sound", engine: "sturdy", completion: "solo-escape" } }));
    expect(escapeView?.passengerCharacterIds).toEqual(["cast-samantha"]);
    expect(getMotorboatAnimation(escapeView, "cast-samantha")).toEqual({ name: "cheer", once: true });
    expect(getMotorboatAnimation(escapeView, "cast-daniel")).toBeNull();
  });

  it("does not carry a prior repair actor or passenger reaction into a later decision", () => {
    const repair = routeEvent("repaired-sturdy", {
      assignment: { id: "assignment", actorCharacterId: "cast-daniel", roleLabel: "repair the boat", selectionMethod: "group-nomination", result: "accepted" },
      motorboat: { node: "repair", boatChange: "repaired-sturdy", passengerCharacterIds: ["cast-samantha"] },
    });
    const laterDecision = deriveMotorboatScenePresentation(snapshot({
      phase: "decision",
      currentDecision: { id: "motorboat-group-launch", prompt: "Launch?", options: [] },
      eventHistory: [repair],
      motorboat: { ...baseRoute, node: "launch", discovered: true, hull: "sound", engine: "sturdy", fuelAvailability: "shared", fuelCharges: 1 },
    }));
    expect(laterDecision).toMatchObject({ zoneId: "motorboat_launch", cue: null, passengerCharacterIds: [] });
    expect(laterDecision?.publicActorCharacterId).toBeUndefined();
    expect(getMotorboatAnimation(laterDecision, "cast-daniel")).toBeNull();
    expect(getMotorboatStageRole(laterDecision, "cast-samantha")).toBeUndefined();
  });

  it("maps a terminal storm to the storm shore and derives visuals only from public condition fields", () => {
    const storm = routeEvent("storm-destroyed", {
      motorboat: { node: "terminal", boatChange: "storm-destroyed", missNumber: 3, endingCause: "storm-surge" },
    });
    const route = { ...baseRoute, node: "terminal" as const, discovered: true, hull: "leaking" as const, engine: "fragile" as const, fuelAvailability: "known-private" as const, warningLevel: 2 as const, missCount: 3, completion: "no-survivors" as const };
    const view = deriveMotorboatScenePresentation(snapshot({ phase: "ending", currentDecision: null, eventHistory: [storm], motorboat: route }));
    expect(view?.zoneId).toBe("motorboat_storm");
    expect(view?.cue).toBe("storm-destroyed");
    expect(getMotorboatPropAppearance(route, view!.cue)).toEqual({
      visible: true, hullColor: "#876052", engineColor: "#b48645", showLeakPatch: true,
      warningColor: "#d85d45", warningPennants: 2, destroyed: true,
    });
  });

  it("reads standalone private-choice route events without treating them as private actor data", () => {
    const view = deriveMotorboatScenePresentation(snapshot({
      phase: "reveal", currentDecision: null,
      motorboat: { ...baseRoute, node: "repair", discovered: true, hull: "sound", engine: "broken", fuelAvailability: "shared", fuelCharges: 3 },
      eventHistory: [{ id: "fuel-shared", text: "Fuel was added to shared supplies.", createdAt: 10, motorboat: { node: "repair", boatChange: "fuel-shared", actorCharacterId: "cast-daniel" } }],
    }));
    expect(view).toMatchObject({ zoneId: "motorboat_cove", cue: "fuel-shared", eventId: "fuel-shared", passengerCharacterIds: [] });
    expect(view?.publicActorCharacterId).toBe("cast-daniel");
    expect(getMotorboatAnimation(view, "cast-daniel")).toEqual({ name: "agree", once: true });
  });
});
