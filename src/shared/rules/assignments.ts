import type { PrivateRoomState } from "../domain";
import type { RandomSource } from "./random";
import { randomIndex } from "./random";
import { resolveWinningOption } from "./resolveVote";

export function eligibleLivingAssignments(state: PrivateRoomState, requiredStartingItemId?: string): Array<{ actorCharacterId: string; actorPlayerId: string }> {
  return Object.values(state.players)
    .filter((player) => player.status === "alive" && player.characterId !== null && state.characters[player.characterId]?.status === "alive")
    .filter(player => !requiredStartingItemId || state.characters[player.characterId!]?.startingItemId === requiredStartingItemId)
    .map((player) => ({ actorCharacterId: player.characterId!, actorPlayerId: player.id }))
    .sort((left, right) => left.actorCharacterId.localeCompare(right.actorCharacterId));
}

export function resolveAssignedActor(
  state: PrivateRoomState,
  winningOptionId: string,
  random: RandomSource,
): { actorCharacterId: string; actorPlayerId: string; selectionMethod: "group-nomination" | "random-fallback" } | null {
  const requiredItem = state.deck.find(card => card.id === state.currentDecisionId)?.options.find(option => option.id === winningOptionId)?.assignment?.requiredStartingItemId;
  const candidates = eligibleLivingAssignments(state, requiredItem);
  if (candidates.length === 0) return null;
  const byCharacterId = new Map(candidates.map((candidate) => [candidate.actorCharacterId, candidate]));
  const counts: Record<string, number> = {};
  for (const [playerId, optionId] of Object.entries(state.votesByPlayer)) {
    if (optionId !== winningOptionId) continue;
    const characterId = state.assignmentNominationsByPlayer?.[playerId];
    if (characterId && byCharacterId.has(characterId)) counts[characterId] = (counts[characterId] ?? 0) + 1;
  }
  const nominatedIds = Object.keys(counts).sort();
  if (nominatedIds.length > 0) {
    const actorCharacterId = resolveWinningOption(counts, nominatedIds, random);
    const actor = byCharacterId.get(actorCharacterId)!;
    return { ...actor, selectionMethod: "group-nomination" };
  }
  return { ...candidates[randomIndex(candidates.length, random)]!, selectionMethod: "random-fallback" };
}

export function didRefusalSucceed(successChanceBps: number, random: RandomSource): boolean {
  if (!Number.isInteger(successChanceBps) || successChanceBps < 0 || successChanceBps > 10_000) {
    throw new Error("Refusal chance must be an integer from 0 to 10,000 basis points.");
  }
  return random.next() * 10_000 < successChanceBps;
}
