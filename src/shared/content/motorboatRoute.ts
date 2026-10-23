import type { DecisionCard, MotorboatRouteState, Outcome } from "../domain";

export const MOTORBOAT_DECISION_IDS = {
  discovery: "motorboat-discovery",
  repair: "motorboat-repair",
  recovery: "motorboat-recovery",
  groupLaunch: "motorboat-group-launch",
} as const;

const repaired = (id: string, text: string, engine: "sturdy" | "fragile", weight: number, actor = true): Outcome => ({
  id, text, weight, ...(actor ? { effectTarget: "assigned-actor" as const } : {}), motorboatEffect: { type: "repair", engine },
});

const repairAssignment = {
  roleLabel: "repair the motorboat",
  actorSelection: "group-nominated-living" as const,
  refusal: {
    successChanceBps: 3_500,
    qualitativeRisk: "risky" as const,
    successOutcomes: [{ id: "motorboat-emergency-pull-start", text: "The refusal works. The crew burns shelter braces on an emergency pull-start.", weight: 1, resourceDeltas: { shelter: -15 }, motorboatEffect: { type: "repair" as const, engine: "fragile" as const } }],
  },
};

export const MOTORBOAT_DISCOVERY_CARD: DecisionCard = {
  id: MOTORBOAT_DECISION_IDS.discovery,
  prompt: "A battered motorboat is wedged in the mangroves. What does the crew do first?",
  options: [
    { id: "haul-clear", label: "Haul it above the tide", outcomes: [{ id: "hull-saved", text: "The hull survives the enthusiastic dragging. A sealed fuel can rolls free.", weight: 1, resourceDeltas: { health: -5 }, motorboatEffect: { type: "discovery", hull: "sound", repairParts: false, engineDiagnosed: false } }] },
    { id: "inspect-first", label: "Inspect it where it lies", outcomes: [{ id: "engine-diagnosed", text: "The engine is broken, but the careful inspection reveals exactly how.", weight: 1, motorboatEffect: { type: "discovery", hull: "sound", repairParts: false, engineDiagnosed: true } }] },
    { id: "strip-wreck", label: "Strip the nearby wreck for parts", outcomes: [{ id: "parts-salvaged", text: "Useful repair parts are found. The tide has time to chew a leak in the hull.", weight: 1, motorboatEffect: { type: "discovery", hull: "leaking", repairParts: true, engineDiagnosed: false } }] },
  ],
};

export function createMotorboatRepairCard(state: MotorboatRouteState, shelter: number, startingItemIds: readonly string[] = []): DecisionCard {
  const options: DecisionCard["options"] = [];
  if (state.repairParts || startingItemIds.some((id) => id === "knife" || id === "hatchet")) {
    const sturdyWeight = state.engineDiagnosed ? 85 : 75;
    options.push({ id: "careful-patch", label: state.repairParts ? "Make a careful parts patch" : "Repair the diagnosed fault", assignment: repairAssignment, outcomes: [repaired("careful-sturdy", "The patch holds with alarming competence.", "sturdy", sturdyWeight), repaired("careful-fragile", "The patch holds, provided nobody breathes near it.", "fragile", 100-sturdyWeight)] });
  }
  options.push({ id: "force-starter", label: "Force the starter", assignment: repairAssignment, outcomes: [repaired("force-sturdy", "Brute force and bad language wake the engine.", "sturdy", 45), { ...repaired("force-fragile", "The engine coughs awake and the mechanic pays in bruises.", "fragile", 55), resourceDeltas: { health: -10 } }] });
  if (shelter >= 15) options.push({ id: "shelter-braces", label: "Sacrifice shelter braces", assignment: repairAssignment, outcomes: [{ ...repaired("braces-sturdy", "Shelter beams become excellent engine braces.", "sturdy", 70), resourceDeltas: { shelter: -15 } }, { ...repaired("braces-fragile", "The braces work, though the shelter now has opinions about rain.", "fragile", 30), resourceDeltas: { shelter: -15 } }] });
  return { id: state.warningLevel > 0 ? MOTORBOAT_DECISION_IDS.recovery : MOTORBOAT_DECISION_IDS.repair, prompt: state.warningLevel > 0 ? "The last launch failed and the storm is closer. How will the crew repair the motorboat?" : "The engine needs a repair. Who gets the privilege?", options };
}

export function createMotorboatGroupLaunchCard(state: MotorboatRouteState): DecisionCard {
  const chance = Math.max(5, (state.engine === "sturdy" ? 80 : 60) - state.missedOpportunityIds.length * 10);
  return { id: MOTORBOAT_DECISION_IDS.groupLaunch, prompt: "The motorboat can launch now. Leave together or risk waiting?", options: [
    { id: "launch-together", label: "Launch together", outcomes: [
      { id: "group-launch-success", text: "Against probability and several safety recommendations, the motorboat clears the reef.", weight: chance, motorboatEffect: { type: "launch", mode: "group", result: "success" } },
      { id: "group-launch-failure", text: "The engine dies in the surf and the storm takes notes.", weight: 100 - chance, resourceDeltas: { health: -8 }, motorboatEffect: { type: "launch", mode: "group", result: "failure" } },
    ] },
    { id: "wait", label: "Wait for a better moment", outcomes: [{ id: "group-waited", text: "The crew waits. The storm does not.", weight: 1, motorboatEffect: { type: "miss", reason: "group-wait" } }] },
  ] };
}
