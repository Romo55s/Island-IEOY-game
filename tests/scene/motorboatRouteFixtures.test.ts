import { describe, expect, it } from "vitest";
import {
  MOTORBOAT_ROUTE_PREVIEW_SCENARIOS,
  getMotorboatPreviewScenario,
} from "../../src/game/dev/motorboatRouteFixtures";
import { toSessionScenePresentation } from "../../src/scene/sessionPresentation";

describe("deterministic motorboat route preview fixtures", () => {
  it("covers the four bounded route branches with fixed eight-player snapshots", () => {
    expect(MOTORBOAT_ROUTE_PREVIEW_SCENARIOS.map(({ id }) => id)).toEqual([
      "shared-group", "hidden-solo", "failed-recovery", "third-miss-storm",
    ]);
    for (const scenario of MOTORBOAT_ROUTE_PREVIEW_SCENARIOS) {
      expect(scenario.steps.length).toBeGreaterThanOrEqual(3);
      for (const { snapshot } of scenario.steps) {
        expect(snapshot.players).toHaveLength(8);
        expect(snapshot.characters).toHaveLength(8);
        expect(snapshot.phaseStartedAt).toBeGreaterThanOrEqual(1_800_000_000_000);
        expect(snapshot.code).toBe("BOAT23");
        expect(snapshot.motorboat).toBeDefined();
        expect(snapshot.phaseStartedAt! % 1_000).toBe(0);
        expect(snapshot.phaseStartedAt).toBeLessThanOrEqual(1_800_000_003_000);
        for (const event of snapshot.eventHistory) {
          expect(event.createdAt % 1_000).toBe(0);
          expect(event.id).toMatch(/^(shared-fuel|sturdy-repair|group-escape|private-fuel|solo-escape|failed-launch|fragile-recovery|second-miss|third-miss-storm)$/);
        }
      }
    }
  });

  it("presents shared fuel, a public repair actor, and all eight group passengers", () => {
    const scenario = getMotorboatPreviewScenario("shared-group");
    const shared = toSessionScenePresentation(scenario.steps[0]!.snapshot);
    const repair = toSessionScenePresentation(scenario.steps[1]!.snapshot);
    const ending = toSessionScenePresentation(scenario.steps[2]!.snapshot);
    expect(shared).toMatchObject({ zoneId: "motorboat_cove", motorboat: { cue: "fuel-shared", publicActorCharacterId: "cast-daniel" } });
    expect(repair).toMatchObject({ zoneId: "motorboat_repair", motorboat: { cue: "repaired-sturdy", publicActorCharacterId: "cast-samantha" } });
    expect(ending.motorboat?.passengerCharacterIds).toHaveLength(8);
    expect(scenario.steps[2]!.snapshot.escapeResult).toMatchObject({ type: "group-escape", cause: "group-launch" });
  });

  it("keeps the hidden fuel choice anonymous until the public solo departure", () => {
    const scenario = getMotorboatPreviewScenario("hidden-solo");
    const choice = toSessionScenePresentation(scenario.steps[0]!.snapshot);
    const hidden = toSessionScenePresentation(scenario.steps[1]!.snapshot);
    const custodian = toSessionScenePresentation(scenario.steps[2]!.snapshot);
    const ending = toSessionScenePresentation(scenario.steps[3]!.snapshot);
    expect(choice.motorboat?.publicActorCharacterId).toBeUndefined();
    expect(choice.members.every(({ stageRole }) => stageRole === undefined)).toBe(true);
    expect(hidden.motorboat?.publicActorCharacterId).toBeUndefined();
    expect(JSON.stringify(hidden.motorboat)).not.toContain("cast-daniel");
    expect(custodian.motorboat?.publicActorCharacterId).toBe("cast-daniel");
    expect(ending.motorboat?.passengerCharacterIds).toEqual(["cast-daniel"]);
    expect(scenario.steps[3]!.snapshot.escapeResult).toMatchObject({ type: "solo-escape", cause: "solo-launch" });
  });

  it("returns a failed launch to recovery without clearing its genuine miss", () => {
    const scenario = getMotorboatPreviewScenario("failed-recovery");
    const failed = toSessionScenePresentation(scenario.steps[0]!.snapshot);
    const recovery = toSessionScenePresentation(scenario.steps[1]!.snapshot);
    const repaired = toSessionScenePresentation(scenario.steps[2]!.snapshot);
    expect(failed).toMatchObject({ zoneId: "motorboat_launch", motorboat: { cue: "launch-failed" } });
    expect(scenario.steps[0]!.snapshot.motorboat).toMatchObject({ node: "repair", missCount: 1, warningLevel: 1 });
    expect(recovery).toMatchObject({ zoneId: "motorboat_repair", motorboat: { cue: null } });
    expect(repaired).toMatchObject({ zoneId: "motorboat_repair", motorboat: { cue: "repaired-fragile" } });
    expect(scenario.steps[2]!.snapshot.motorboat).toMatchObject({ node: "launch", missCount: 1, warningLevel: 1, engine: "fragile" });
  });

  it("stages the third genuine miss at the storm shore with eight authoritative deaths", () => {
    const scenario = getMotorboatPreviewScenario("third-miss-storm");
    expect(scenario.steps[0]!.snapshot.motorboat).toMatchObject({ missCount: 2, warningLevel: 2 });
    const lastTide = toSessionScenePresentation(scenario.steps[1]!.snapshot);
    expect(lastTide).toMatchObject({ zoneId: "motorboat_launch", motorboat: { cue: null } });
    const stormSnapshot = scenario.steps[2]!.snapshot;
    const storm = toSessionScenePresentation(stormSnapshot);
    expect(storm).toMatchObject({ zoneId: "motorboat_storm", livingCount: 0, ghostCount: 8, motorboat: { cue: "storm-destroyed" } });
    expect(storm.members.every(({ animationName }) => animationName === "fall")).toBe(true);
    expect(stormSnapshot.motorboat).toMatchObject({ node: "terminal", missCount: 3, completion: "no-survivors" });
    expect(stormSnapshot.escapeResult?.deadCharacterIds).toHaveLength(8);
  });
});
