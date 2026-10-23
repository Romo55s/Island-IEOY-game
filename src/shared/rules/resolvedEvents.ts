import type {
  CharacterResourceKey,
  DecisionCard,
  DecisionOption,
  EventPresentationCue,
  Outcome,
  PrivateRoomState,
  ResolvedDecision,
  ResolvedAssignment,
  ResolvedResourceChange,
  ResolvedStatusChange,
} from "../domain";

const CHARACTER_RESOURCE_KEYS = ["food", "health", "morale", "water"] as const satisfies readonly CharacterResourceKey[];

interface ResolutionInput {
  before: PrivateRoomState;
  afterOutcome: PrivateRoomState;
  afterSurvival: PrivateRoomState;
  card: DecisionCard;
  option: DecisionOption;
  outcome: Outcome;
  optionCounts: Record<string, number>;
  presentationCue: EventPresentationCue;
  assignment?: ResolvedAssignment;
}

function characterResourceChanges(
  before: PrivateRoomState,
  after: PrivateRoomState,
  cause: ResolvedResourceChange["cause"],
): ResolvedResourceChange[] {
  const changes: ResolvedResourceChange[] = [];
  const characterIds = [...new Set([...Object.keys(before.characters), ...Object.keys(after.characters)])].sort();
  for (const characterId of characterIds) {
    const previous = before.characters[characterId];
    const next = after.characters[characterId];
    if (!previous || !next) continue;
    for (const resource of CHARACTER_RESOURCE_KEYS) {
      const previousValue = previous.resources[resource];
      const nextValue = next.resources[resource];
      if (previousValue === nextValue) continue;
      changes.push({
        scope: "character",
        characterId,
        resource,
        before: previousValue,
        after: nextValue,
        delta: nextValue - previousValue,
        cause,
      });
    }
  }
  return changes;
}

function statusChanges(before: PrivateRoomState, after: PrivateRoomState, cause: ResolvedStatusChange["cause"]): ResolvedStatusChange[] {
  const changes: ResolvedStatusChange[] = [];
  const characterIds = [...new Set([...Object.keys(before.characters), ...Object.keys(after.characters)])].sort();
  for (const characterId of characterIds) {
    const previous = before.characters[characterId];
    const next = after.characters[characterId];
    if (!previous || !next || previous.status === next.status) continue;
    changes.push({ characterId, before: previous.status, after: next.status, cause });
  }
  return changes;
}

/** Captures facts from states already resolved by the server; it never applies gameplay effects. */
export function createResolvedDecision(input: ResolutionInput): ResolvedDecision {
  const resourceChanges: ResolvedResourceChange[] = [];
  if (input.before.resources.shelter !== input.afterOutcome.resources.shelter) {
    resourceChanges.push({
      scope: "crew",
      resource: "shelter",
      before: input.before.resources.shelter,
      after: input.afterOutcome.resources.shelter,
      delta: input.afterOutcome.resources.shelter - input.before.resources.shelter,
      cause: "outcome",
    });
  }
  resourceChanges.push(...characterResourceChanges(input.before, input.afterOutcome, "outcome"));

  for (const change of characterResourceChanges(input.afterOutcome, input.afterSurvival, "daily-consumption")) {
    resourceChanges.push(change.resource === "health" ? { ...change, cause: "starvation" } : change);
  }

  const statusTransitions = [
    ...statusChanges(input.before, input.afterOutcome, "outcome"),
    ...statusChanges(input.afterOutcome, input.afterSurvival, "starvation"),
  ];
  const affectedCharacterIds = [...new Set([
    ...resourceChanges.flatMap((change) => change.scope === "character" ? [change.characterId] : []),
    ...statusTransitions.map(({ characterId }) => characterId),
    ...(input.assignment ? [input.assignment.actorCharacterId] : []),
  ])].sort();

  return {
    decisionId: input.card.id,
    prompt: input.card.prompt,
    winningOptionId: input.option.id,
    winningOptionLabel: input.option.label,
    outcomeId: input.outcome.id,
    outcomeText: input.outcome.text,
    optionResults: input.card.options.map(({ id, label }) => ({ optionId: id, label, votes: input.optionCounts[id] ?? 0 })),
    resourceChanges,
    statusChanges: statusTransitions,
    affectedCharacterIds,
    presentationCue: input.presentationCue,
    ...(input.assignment ? { assignment: input.assignment } : {}),
  };
}
