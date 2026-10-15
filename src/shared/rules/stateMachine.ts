import type { PrivateRoomState } from "../domain";
import type { RandomSource } from "./random";

export const INTRO_DURATION_MS = 30_000;
export const DECISION_READING_DURATION_MS = 25_000;
export const REVEAL_DURATION_MS = 20_000;

export function advancePhase(state: PrivateRoomState, now: number, _random: RandomSource): PrivateRoomState {
  if (state.phaseEndsAt === null || now < state.phaseEndsAt) return state;
  if (state.phase === "intro") return { ...state, revision: state.revision + 1, phase: "decision", currentDecisionId: state.deck[0]?.id ?? null, decisionIndex: 0, phaseEndsAt: now + DECISION_READING_DURATION_MS, votesByPlayer: {}, resolvedOptionCounts: undefined, winningOptionId: undefined };
  if (state.phase === "reveal") {
    const nextIndex = state.decisionIndex + 1;
    const nextCard = state.deck[nextIndex];
    if (!nextCard) return { ...state, revision: state.revision + 1, phase: "ending", phaseEndsAt: null };
    return { ...state, revision: state.revision + 1, phase: "decision", decisionIndex: nextIndex, currentDecisionId: nextCard.id, phaseEndsAt: now + DECISION_READING_DURATION_MS, votesByPlayer: {}, resolvedOptionCounts: undefined, winningOptionId: undefined };
  }
  return state;
}
