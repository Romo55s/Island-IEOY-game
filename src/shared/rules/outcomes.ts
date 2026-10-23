import type { CharacterResourceKey, Outcome, PrivateRoomState, ResourceKey } from "../domain";
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

export function applyOutcome(state: PrivateRoomState, outcome: Outcome, random: RandomSource, assignedActorCharacterId?: string): PrivateRoomState {
  if (outcome.effectTarget === "assigned-actor" && !assignedActorCharacterId) {
    throw new Error("Actor-targeted outcomes require an assigned actor.");
  }
  const effectiveOutcome = outcome.effectTarget === "assigned-actor"
    ? {
      ...outcome,
      affectedCharacterId: assignedActorCharacterId,
      eliminateRandomLiving: false,
      ...(outcome.eliminateRandomLiving ? { eliminateCharacterId: assignedActorCharacterId } : {}),
    }
    : outcome;
  const resources = { ...state.resources };
  const players = { ...state.players };
  const characters = { ...state.characters };
  const characterDeltas = Object.entries(effectiveOutcome.resourceDeltas ?? {}).filter(([key]) => key !== "shelter") as Array<[CharacterResourceKey, number]>;
  for (const [key, delta] of Object.entries(effectiveOutcome.resourceDeltas ?? {}) as Array<[ResourceKey, number]>) {
    if (key === "shelter") resources.shelter = clampResource(resources.shelter + delta);
  }
  const affectedIds = effectiveOutcome.affectedCharacterId
    ? [effectiveOutcome.affectedCharacterId]
    : Object.values(state.characters).filter(({ status }) => status === "alive").map(({ characterId }) => characterId);
  for (const characterId of affectedIds) {
    const character = characters[characterId];
    if (!character || character.status !== "alive") continue;
    const nextResources = { ...character.resources };
    for (const [key, delta] of characterDeltas) nextResources[key] = clampResource(nextResources[key] + delta);
    characters[characterId] = { ...character, resources: nextResources };
  }
  const deadCharacterIds = new Set(Object.values(characters)
    .filter(({ status, resources: characterResources }) => status === "alive" && characterResources.health === 0)
    .map(({ characterId }) => characterId));
  if (effectiveOutcome.eliminateRandomLiving || effectiveOutcome.eliminateCharacterId) {
    const livingPlayerIds = state.eligibleVoterIds.filter((playerId) => {
      const player = state.players[playerId];
      return player?.status === "alive" && player.characterId !== null &&
        (!effectiveOutcome.eliminateCharacterId || player.characterId === effectiveOutcome.eliminateCharacterId);
    });
    if (livingPlayerIds.length > 0) {
      const playerId = effectiveOutcome.eliminateCharacterId ? livingPlayerIds[0]! : livingPlayerIds[randomIndex(livingPlayerIds.length, random)]!;
      const player = state.players[playerId]!;
      const characterId = player.characterId!;
      deadCharacterIds.add(characterId);
    }
  }
  for (const characterId of deadCharacterIds) {
    const character = characters[characterId];
    if (character) characters[characterId] = { ...character, status: "ghost", resources: { ...character.resources, health: 0 } };
    for (const [playerId, player] of Object.entries(players)) {
      if (player.characterId === characterId) players[playerId] = { ...player, status: "ghost" };
    }
  }
  return { ...state, revision: state.revision + 1, players, characters, resources };
}
