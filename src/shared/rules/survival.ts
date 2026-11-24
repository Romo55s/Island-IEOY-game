import type { PrivateRoomState } from "../domain";

export const DAILY_FOOD_CONSUMPTION = 10;
export const STARVATION_HEALTH_DAMAGE = 20;
export const CAMPAIGN_DECISIONS_PER_DAY = 3;

export interface DailySurvivalResult {
  state: PrivateRoomState;
  starvedCharacterIds: string[];
  newlyGhostCharacterIds: string[];
  starvationDamageByCharacterId: Record<string, number>;
}

/** One in-game day consumes food; campaign pacing decides when the day tick applies. */
export function applyDailySurvival(state: PrivateRoomState): DailySurvivalResult {
  const players = { ...state.players };
  const characters = { ...state.characters };
  const starvedCharacterIds: string[] = [];
  const newlyGhostCharacterIds: string[] = [];
  const starvationDamageByCharacterId: Record<string, number> = {};

  for (const character of Object.values(state.characters)) {
    if (character.status !== "alive") continue;
    const wasStarving = character.resources.food === 0;
    if (wasStarving) starvedCharacterIds.push(character.characterId);
    const food = Math.max(0, character.resources.food - DAILY_FOOD_CONSUMPTION);
    const health = wasStarving ? Math.max(0, character.resources.health - STARVATION_HEALTH_DAMAGE) : character.resources.health;
    if (wasStarving) starvationDamageByCharacterId[character.characterId] = character.resources.health - health;
    const died = health === 0;
    if (died) newlyGhostCharacterIds.push(character.characterId);

    characters[character.characterId] = {
      ...character,
      status: died ? "ghost" : "alive",
      resources: { ...character.resources, food, health },
    };
    if (died) {
      for (const [playerId, player] of Object.entries(players)) {
        if (player.characterId === character.characterId) players[playerId] = { ...player, status: "ghost" };
      }
    }
  }

  if (Object.values(state.characters).some(({ status }) => status === "alive")) {
    return {
      state: { ...state, revision: state.revision + 1, players, characters },
      starvedCharacterIds,
      newlyGhostCharacterIds,
      starvationDamageByCharacterId,
    };
  }
  return { state, starvedCharacterIds, newlyGhostCharacterIds, starvationDamageByCharacterId };
}
