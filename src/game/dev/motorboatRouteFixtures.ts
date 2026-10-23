import {
  CHARACTER_CATALOG,
  type EscapeResult,
  type EventEntry,
  type MotorboatEventFacts,
  type PublicGameSnapshot,
  type PublicMotorboatRouteState,
  type ResolvedAssignment,
  type ResolvedStatusChange,
} from "../../shared/domain";

export type MotorboatPreviewScenarioId = "shared-group" | "hidden-solo" | "failed-recovery" | "third-miss-storm";

export interface MotorboatPreviewStep {
  id: string;
  label: string;
  snapshot: PublicGameSnapshot;
}

export interface MotorboatPreviewScenario {
  id: MotorboatPreviewScenarioId;
  label: string;
  description: string;
  steps: MotorboatPreviewStep[];
}

const FIXTURE_EPOCH = 1_800_000_000_000;
const catalog = CHARACTER_CATALOG.slice(0, 8);
const characterIds = catalog.map(({ id }) => id);
const [danielId, samanthaId] = characterIds as [string, string, ...string[]];

const defaultRoute: PublicMotorboatRouteState = {
  node: "discovery",
  discovered: true,
  hull: "sound",
  engine: "broken",
  fuelAvailability: "none",
  warningLevel: 0,
  missCount: 0,
  completion: "active",
};

function directEvent(id: string, index: number, text: string, motorboat: MotorboatEventFacts): EventEntry {
  return { id, text, createdAt: FIXTURE_EPOCH + index * 1_000, motorboat };
}

function decisionEvent(
  id: string,
  index: number,
  decisionId: string,
  text: string,
  motorboat: MotorboatEventFacts,
  assignment?: ResolvedAssignment,
): EventEntry {
  return {
    id,
    text,
    createdAt: FIXTURE_EPOCH + index * 1_000,
    decisionId,
    winningOptionId: "preview-choice",
    outcomeId: `${id}-outcome`,
    socialCue: motorboat.boatChange === "launch-failed" ? "setback" : motorboat.boatChange === "escaped" ? "success" : "neutral",
    resolution: {
      decisionId,
      prompt: "Deterministic motorboat preview",
      winningOptionId: "preview-choice",
      winningOptionLabel: "Preview choice",
      outcomeId: `${id}-outcome`,
      outcomeText: text,
      optionResults: [{ optionId: "preview-choice", label: "Preview choice", votes: 5 }],
      resourceChanges: [],
      statusChanges: motorboat.statusChanges ?? [],
      affectedCharacterIds: motorboat.statusChanges?.map(({ characterId }) => characterId) ?? [],
      presentationCue: motorboat.boatChange === "launch-failed" ? "setback" : motorboat.boatChange === "escaped" ? "success" : "neutral",
      ...(assignment ? { assignment } : {}),
      motorboat,
    },
  };
}

function snapshot({
  id,
  index,
  phase = "reveal",
  route,
  history,
  currentDecisionId,
  activePrivateChoice,
  viewerPrivateChoice,
  escapeResult,
  deadCharacterIds = [],
}: {
  id: string;
  index: number;
  phase?: PublicGameSnapshot["phase"];
  route: Partial<PublicMotorboatRouteState>;
  history: EventEntry[];
  currentDecisionId?: string;
  activePrivateChoice?: PublicGameSnapshot["activePrivateChoice"];
  viewerPrivateChoice?: PublicGameSnapshot["viewerPrivateChoice"];
  escapeResult?: EscapeResult;
  deadCharacterIds?: string[];
}): PublicGameSnapshot {
  const now = FIXTURE_EPOCH + index * 1_000;
  const dead = new Set(deadCharacterIds);
  const resolvedRoute = { ...defaultRoute, ...route };
  return {
    code: "BOAT23",
    revision: index + 1,
    phase,
    hostPlayerId: "motorboat-preview-0",
    phaseStartedAt: now,
    phaseDeadlineAt: phase === "decision" || phase === "privateChoice" ? now + 15_000 : null,
    votingOpensAt: phase === "decision" ? now : null,
    earliestResolveAt: phase === "decision" ? now + 1_000 : null,
    phaseEndsAt: phase === "decision" || phase === "privateChoice" ? now + 15_000 : null,
    players: catalog.map((character, playerIndex) => ({
      id: `motorboat-preview-${playerIndex}`,
      displayName: `Player ${playerIndex + 1}`,
      characterId: character.id,
      status: dead.has(character.id) ? "ghost" : "alive",
      ready: true,
      connected: true,
      joinedAt: FIXTURE_EPOCH + playerIndex,
    })),
    characters: catalog.map((character) => ({
      characterId: character.id,
      status: dead.has(character.id) ? "ghost" : "alive",
      resources: { health: dead.has(character.id) ? 0 : 72, food: dead.has(character.id) ? 0 : 38, water: dead.has(character.id) ? 0 : 41, morale: dead.has(character.id) ? 0 : 56 },
    })),
    characterCatalog: CHARACTER_CATALOG,
    resources: { shelter: 34 },
    currentDecision: currentDecisionId ? { id: currentDecisionId, prompt: `Preview ${currentDecisionId}`, options: [{ id: "preview-choice", label: "Preview choice" }] } : null,
    decisionNumber: Math.min(index + 1, 4),
    totalDecisions: 4,
    eligibleVoterIds: catalog.map((_, playerIndex) => `motorboat-preview-${playerIndex}`),
    eventHistory: history,
    viewer: { playerId: "motorboat-preview-0", hasVoted: false },
    motorboat: resolvedRoute,
    ...(activePrivateChoice ? { activePrivateChoice } : {}),
    ...(viewerPrivateChoice ? { viewerPrivateChoice } : {}),
    ...(escapeResult ? { endingId: escapeResult.type, escapeResult } : {}),
  };
}

const sharedFuel = directEvent("shared-fuel", 1, "Daniel puts all three fuel charges beside the campfire.", {
  node: "repair", actorCharacterId: danielId, boatChange: "fuel-shared",
});
const sturdyRepair = decisionEvent("sturdy-repair", 2, "motorboat-repair", "Samantha gets the engine running without adding any suspicious new noises.", {
  node: "launch", boatChange: "repaired-sturdy",
}, {
  id: "preview-repair-assignment", actorCharacterId: samanthaId, roleLabel: "repair the motorboat engine",
  selectionMethod: "group-nomination", result: "accepted",
});
const groupEscape = decisionEvent("group-escape", 3, "motorboat-group-launch", "The entire living crew clears the reef together.", {
  node: "complete", boatChange: "escaped", passengerCharacterIds: characterIds, endingCause: "group-launch", fuelConsumed: true,
});
const groupEscapeResult: EscapeResult = {
  type: "group-escape", escapedCharacterIds: characterIds, strandedCharacterIds: [], deadCharacterIds: [],
  cause: "group-launch", epilogueId: "motorboat-group-aftermath-v1",
};

const privateFuel = directEvent("private-fuel", 1, "The fuel remains in private hands.", {
  node: "repair", boatChange: "fuel-kept-private",
});
const soloEscape = directEvent("solo-escape", 3, "Daniel launches before the sleeping group can object.", {
  node: "complete", actorCharacterId: danielId, boatChange: "escaped", passengerCharacterIds: [danielId], endingCause: "solo-launch", fuelConsumed: true,
});
const soloEscapeResult: EscapeResult = {
  type: "solo-escape", escapedCharacterIds: [danielId], strandedCharacterIds: characterIds.filter((id) => id !== danielId), deadCharacterIds: [],
  cause: "solo-launch", epilogueId: "motorboat-selfish-aftermath-v1",
};

const failedLaunch = decisionEvent("failed-launch", 1, "motorboat-group-launch", "The engine coughs, the boat rotates once, and the tide deposits everyone back on shore.", {
  node: "repair", boatChange: "launch-failed", opportunityId: "tide-1", passengerCharacterIds: characterIds, missNumber: 1, fuelConsumed: true,
});
const fragileRecovery = decisionEvent("fragile-recovery", 3, "motorboat-recovery", "Samantha repairs the engine, although one bolt is now mostly optimism.", {
  node: "launch", boatChange: "repaired-fragile",
}, {
  id: "preview-recovery-assignment", actorCharacterId: samanthaId, roleLabel: "recover the motorboat engine",
  selectionMethod: "group-nomination", result: "timeout-accepted",
});

const secondMiss = directEvent("second-miss", 0, "Another safe tide passes in silence.", {
  node: "launch", boatChange: "quiet-miss", opportunityId: "tide-2", missNumber: 2,
});
const stormChanges: ResolvedStatusChange[] = characterIds.map((characterId) => ({
  characterId, before: "alive", after: "ghost", cause: "storm-surge",
}));
const storm = directEvent("third-miss-storm", 2, "The third missed tide invites the storm surge to chair the meeting.", {
  node: "terminal", boatChange: "storm-destroyed", opportunityId: "tide-3", missNumber: 3,
  endingCause: "storm-surge", statusChanges: stormChanges,
});
const stormResult: EscapeResult = {
  type: "no-survivors", escapedCharacterIds: [], strandedCharacterIds: [], deadCharacterIds: characterIds,
  cause: "storm-surge", epilogueId: "motorboat-storm-aftermath-v1",
};

export const MOTORBOAT_ROUTE_PREVIEW_SCENARIOS: MotorboatPreviewScenario[] = [
  {
    id: "shared-group",
    label: "Shared fuel → group escape",
    description: "Fuel becomes public, a nominated survivor repairs the engine, and the living crew escapes together.",
    steps: [
      { id: "share-fuel", label: "Share fuel", snapshot: snapshot({ id: "share-fuel", index: 1, route: { node: "repair", fuelAvailability: "shared", fuelCharges: 3 }, history: [sharedFuel] }) },
      { id: "sturdy-repair", label: "Sturdy repair", snapshot: snapshot({ id: "sturdy-repair", index: 2, route: { node: "launch", fuelAvailability: "shared", fuelCharges: 3, engine: "sturdy" }, history: [sharedFuel, sturdyRepair] }) },
      { id: "group-escape", label: "Group escape", snapshot: snapshot({ id: "group-escape", index: 3, phase: "ending", route: { node: "complete", fuelAvailability: "shared", fuelCharges: 2, engine: "sturdy", completion: "group-escape" }, history: [sharedFuel, sturdyRepair, groupEscape], escapeResult: groupEscapeResult }) },
    ],
  },
  {
    id: "hidden-solo",
    label: "Hidden fuel → solo escape",
    description: "The private fuel choice stays anonymous, then the publicly identified night custodian departs alone.",
    steps: [
      { id: "hide-choice", label: "Private fuel choice", snapshot: snapshot({ id: "hide-choice", index: 0, phase: "privateChoice", route: { node: "fuel-choice", fuelAvailability: "known-private" }, history: [], activePrivateChoice: { id: "preview-hide", kind: "fuel-discovery", deadlineAt: FIXTURE_EPOCH + 15_000 }, viewerPrivateChoice: { canRespond: true, optionIds: ["share", "hide", "transfer"], transferableTargetCharacterIds: characterIds.slice(1) } }) },
      { id: "fuel-hidden", label: "Fuel stays hidden", snapshot: snapshot({ id: "fuel-hidden", index: 1, route: { node: "repair", fuelAvailability: "known-private" }, history: [privateFuel] }) },
      { id: "solo-choice", label: "Public night custodian", snapshot: snapshot({ id: "solo-choice", index: 2, phase: "privateChoice", route: { node: "launch", engine: "sturdy", fuelAvailability: "known-private" }, history: [privateFuel], activePrivateChoice: { id: "preview-solo", kind: "launch-custodian", deadlineAt: FIXTURE_EPOCH + 17_000, publicActorCharacterId: danielId }, viewerPrivateChoice: { canRespond: true, optionIds: ["wake", "solo", "quiet"] } }) },
      { id: "solo-escape", label: "Solo escape", snapshot: snapshot({ id: "solo-escape", index: 3, phase: "ending", route: { node: "complete", engine: "sturdy", fuelAvailability: "known-private", completion: "solo-escape" }, history: [privateFuel, soloEscape], escapeResult: soloEscapeResult }) },
    ],
  },
  {
    id: "failed-recovery",
    label: "Failed launch → recovery",
    description: "A genuine launch failure raises the warning, then the recovery decision returns the route to launch.",
    steps: [
      { id: "failed-launch", label: "Failed launch", snapshot: snapshot({ id: "failed-launch", index: 1, route: { node: "repair", engine: "broken", fuelAvailability: "shared", fuelCharges: 2, warningLevel: 1, missCount: 1 }, history: [failedLaunch] }) },
      { id: "recovery-decision", label: "Recovery decision", snapshot: snapshot({ id: "recovery-decision", index: 2, phase: "decision", route: { node: "repair", engine: "broken", fuelAvailability: "shared", fuelCharges: 2, warningLevel: 1, missCount: 1 }, history: [failedLaunch], currentDecisionId: "motorboat-recovery" }) },
      { id: "fragile-recovery", label: "Fragile recovery", snapshot: snapshot({ id: "fragile-recovery", index: 3, route: { node: "launch", engine: "fragile", fuelAvailability: "shared", fuelCharges: 2, warningLevel: 1, missCount: 1 }, history: [failedLaunch, fragileRecovery] }) },
    ],
  },
  {
    id: "third-miss-storm",
    label: "Third miss → storm",
    description: "The last safe tide is visibly warned, and the third genuine miss ends the route in a terminal storm.",
    steps: [
      { id: "second-warning", label: "Second miss warning", snapshot: snapshot({ id: "second-warning", index: 0, route: { node: "launch", engine: "fragile", fuelAvailability: "shared", fuelCharges: 1, warningLevel: 2, missCount: 2 }, history: [secondMiss] }) },
      { id: "last-tide", label: "Last tide", snapshot: snapshot({ id: "last-tide", index: 1, phase: "decision", route: { node: "launch", engine: "fragile", fuelAvailability: "shared", fuelCharges: 1, warningLevel: 2, missCount: 2 }, history: [secondMiss], currentDecisionId: "motorboat-group-launch" }) },
      { id: "storm", label: "Third-miss storm", snapshot: snapshot({ id: "storm", index: 2, phase: "ending", route: { node: "terminal", hull: "leaking", engine: "fragile", fuelAvailability: "none", warningLevel: 2, missCount: 3, completion: "no-survivors" }, history: [secondMiss, storm], escapeResult: stormResult, deadCharacterIds: characterIds }) },
    ],
  },
];

export function getMotorboatPreviewScenario(id: MotorboatPreviewScenarioId): MotorboatPreviewScenario {
  return MOTORBOAT_ROUTE_PREVIEW_SCENARIOS.find((scenario) => scenario.id === id)!;
}
