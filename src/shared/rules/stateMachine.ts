import type { DecisionCard, EndingId, Outcome, PrivateRoomState } from "../domain";
import { applyOutcome, pickWeightedOutcome } from "./outcomes";
import type { RandomSource } from "./random";
import { randomIndex } from "./random";
import { resolveWinningOption } from "./resolveVote";

export const INTRO_DURATION_MS = 30_000;
export const DECISION_READING_DURATION_MS = 25_000;
export const VOTING_DURATION_MS = 15_000;
export const EARLIEST_RESOLVE_AFTER_OPEN_MS = 10_000;
export const REVEAL_DURATION_MS = 20_000;

export function shuffleDeck(cards: readonly DecisionCard[], random: RandomSource): DecisionCard[] {
  const result = [...cards];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1, random);
    [result[index], result[swapIndex]] = [result[swapIndex]!, result[index]!];
  }
  return result;
}

export function startGame(state: PrivateRoomState, now: number, deck: readonly DecisionCard[], random: RandomSource): PrivateRoomState {
  const shuffled = shuffleDeck(deck, random);
  return {
    ...state,
    revision: state.revision + 1,
    phase: "intro",
    phaseStartedAt: now,
    phaseDeadlineAt: now + INTRO_DURATION_MS,
    votingOpensAt: null,
    earliestResolveAt: null,
    phaseEndsAt: now + INTRO_DURATION_MS,
    deck: shuffled,
    decisionIndex: 0,
    currentDecisionId: null,
    votesByPlayer: {},
    eligibleVoterIds: Object.keys(state.players),
    resolvedOptionCounts: undefined,
    winningOptionId: undefined,
    endingId: undefined,
  };
}

export function beginDecision(state: PrivateRoomState, index: number, now: number): PrivateRoomState {
  const card = state.deck[index];
  if (!card) return enterEnding(state, now);
  const votingOpensAt = now + DECISION_READING_DURATION_MS;
  const phaseDeadlineAt = votingOpensAt + VOTING_DURATION_MS;
  return {
    ...state,
    revision: state.revision + 1,
    phase: "decision",
    phaseStartedAt: now,
    phaseDeadlineAt,
    votingOpensAt,
    earliestResolveAt: votingOpensAt + EARLIEST_RESOLVE_AFTER_OPEN_MS,
    phaseEndsAt: phaseDeadlineAt,
    decisionIndex: index,
    currentDecisionId: card.id,
    votesByPlayer: {},
    eligibleVoterIds: Object.keys(state.players),
    resolvedOptionCounts: undefined,
    winningOptionId: undefined,
  };
}

export function resolveCurrentDecision(state: PrivateRoomState, now: number, random: RandomSource): PrivateRoomState {
  const card = state.deck.find(({ id }) => id === state.currentDecisionId);
  if (!card) return state;
  const counts = Object.fromEntries(card.options.map(({ id }) => [id, 0])) as Record<string, number>;
  for (const optionId of Object.values(state.votesByPlayer)) {
    if (optionId in counts) counts[optionId] = (counts[optionId] ?? 0) + 1;
  }
  const winningOptionId = resolveWinningOption(counts, card.options.map(({ id }) => id), random);
  const option = card.options.find(({ id }) => id === winningOptionId)!;
  const outcome = withEliminationFallback(state, pickWeightedOutcome(option.outcomes, random));
  const afterOutcome = applyOutcome(state, outcome, random);
  const eventHistory = [...afterOutcome.eventHistory, { id: `${card.id}-${now}`, text: outcome.text, createdAt: now }].slice(-20);
  return {
    ...afterOutcome,
    revision: afterOutcome.revision,
    phase: "reveal",
    phaseStartedAt: now,
    phaseDeadlineAt: now + REVEAL_DURATION_MS,
    votingOpensAt: null,
    earliestResolveAt: null,
    phaseEndsAt: now + REVEAL_DURATION_MS,
    resolvedOptionCounts: counts,
    winningOptionId,
    eventHistory,
  };
}

function withEliminationFallback(state: PrivateRoomState, outcome: Outcome): Outcome {
  if (!outcome.eliminateRandomLiving) return outcome;
  const hasLivingTarget = Object.values(state.players).some(({ status, characterId }) => status === "alive" && characterId !== null);
  if (hasLivingTarget) return outcome;
  return {
    ...outcome,
    eliminateRandomLiving: false,
    resourceDeltas: { ...outcome.resourceDeltas, morale: (outcome.resourceDeltas?.morale ?? 0) - 10 },
  };
}

export function deriveEndingId(state: PrivateRoomState): EndingId {
  const survivors = Object.values(state.players).filter(({ status }) => status === "alive").length;
  if (survivors === 0) return "ghost-committee";
  const values = Object.values(state.resources);
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  if (average >= 60) return "rescued-inexplicably";
  if (average >= 25) return "alive-technically";
  return "island-management";
}

export function enterEnding(state: PrivateRoomState, now: number): PrivateRoomState {
  return {
    ...state,
    revision: state.revision + 1,
    phase: "ending",
    phaseStartedAt: now,
    phaseDeadlineAt: null,
    votingOpensAt: null,
    earliestResolveAt: null,
    phaseEndsAt: null,
    currentDecisionId: null,
    endingId: deriveEndingId(state),
  };
}

export function advancePhase(state: PrivateRoomState, now: number, random: RandomSource): PrivateRoomState {
  if (state.phaseDeadlineAt === null || now < state.phaseDeadlineAt) return state;
  if (state.phase === "intro") return beginDecision(state, 0, now);
  if (state.phase === "decision") return resolveCurrentDecision(state, now, random);
  if (state.phase === "reveal") return beginDecision(state, state.decisionIndex + 1, now);
  return state;
}
