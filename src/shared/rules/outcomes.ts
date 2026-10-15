import type { Outcome, PrivateRoomState, ResourceKey } from "../domain";
import type { RandomSource } from "./random";
import { randomIndex } from "./random";

export function clampResource(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function pickWeightedOutcome(outcomes: Outcome[], random: RandomSource): Outcome {
  if (outcomes.length === 0) throw new Error("An option requires at least one outcome.");
  if (outcomes.some(({ weight }) => !Number.isInteger(weight) || weight <= 0)) throw new Error("Outcome weights must be positive integers.");
  const totalWeight = outcomes.reduce((sum, outcome) => sum + outcome.weight, 0);
  const target = random.next() * totalWeight;
  let boundary = 0;
  for (const outcome of outcomes) {
    boundary += outcome.weight;
    if (target < boundary) return outcome;
  }
  return outcomes[outcomes.length - 1]!;
}

export function applyOutcome(state: PrivateRoomState, outcome: Outcome, random: RandomSource): PrivateRoomState {
  const resources = { ...state.resources };
  for (const [key, delta] of Object.entries(outcome.resourceDeltas ?? {}) as Array<[ResourceKey, number]>) resources[key] = clampResource(resources[key] + delta);
  const players = { ...state.players };
  const characters = { ...state.characters };
  if (outcome.eliminateRandomLiving) {
    const livingPlayerIds = state.eligibleVoterIds.filter((playerId) => {
      const player = state.players[playerId];
      return player?.status === "alive" && player.characterId !== null;
    });
    if (livingPlayerIds.length > 0) {
      const playerId = livingPlayerIds[randomIndex(livingPlayerIds.length, random)]!;
      const player = state.players[playerId]!;
      const characterId = player.characterId!;
      players[playerId] = { ...player, status: "ghost" };
      characters[characterId] = { ...characters[characterId]!, status: "ghost" };
    }
  }
  return { ...state, revision: state.revision + 1, players, characters, resources };
}
