import type { PrivateRoomState } from "../domain";
import type { RandomSource } from "../rules/random";
import { randomIndex } from "../rules/random";
import { DESPERATION } from "./config";
import { canOfferGroupCrisis, initialDesperationState, isCampBoundary, nightOfferChanceBps } from "./opportunities";

/** Returns updated bookkeeping even when the single persisted nightly check produces no offer. */
export function prepareDesperation(state: PrivateRoomState, now: number, random: RandomSource): PrivateRoomState {
  if (!isCampBoundary(state)) return state;
  let d = state.desperation ?? initialDesperationState();
  const id = `hunger-${state.code}-${(state.resolutionSequence ?? 0) + 1}-${d.day}`;
  if (canOfferGroupCrisis(state)) return { ...state, desperation: { ...d, groupOfferCount: d.groupOfferCount + 1, lastGroupDay: d.day, ordinaryDecisionsSinceGroup: 0, active: { id, kind: "group", day: d.day } } };
  if (!d.nightCheckDue || d.lastNightCheckDay === d.day) return state;
  d = { ...d, nightCheckDue: false, lastNightCheckDay: d.day };
  const checked = { ...state, desperation: d };
  if (d.lastAttemptDay === d.day || d.nightOfferCount >= DESPERATION.maxNightOffers) return checked;
  const living = Object.values(state.characters).filter(c => c.status === "alive");
  const hungry = living.filter(c => c.resources.food === 0).sort((a,b) => a.characterId.localeCompare(b.characterId));
  const chance = nightOfferChanceBps(hungry.length, living.length);
  if (!chance || random.next() * 10000 >= chance) return checked;
  const candidates = hungry.length > 1 ? hungry.filter(c => c.characterId !== d.lastNightActorId) : hungry;
  const actor = candidates[randomIndex(candidates.length, random)]!;
  const player = Object.values(state.players).find(p => p.characterId === actor.characterId && p.status === "alive");
  if (!player) return checked;
  const deadlineAt = now + DESPERATION.privateDurationMs;
  return { ...checked, revision: state.revision + 1, phase: "privateChoice", phaseStartedAt: now, phaseDeadlineAt: deadlineAt, phaseEndsAt: deadlineAt, votingOpensAt: null, earliestResolveAt: null, currentDecisionId: null, activeCrewDialogue: undefined,
    desperation: { ...d, nightOfferCount: d.nightOfferCount + 1, lastNightActorId: actor.characterId, active: { id, kind: "night", day: d.day } },
    pendingPrivateChoice: { id, kind: "night-hunger", actorPlayerId: player.id, actorCharacterId: actor.characterId, createdAt: now, deadlineAt, allowedOptionIds: ["sleep", "attempt-eat"], defaultOptionId: "sleep", response: null } };
}
