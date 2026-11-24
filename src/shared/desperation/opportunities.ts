import type { PrivateRoomState } from "../domain";
import { DESPERATION } from "./config";
import type { DesperationState } from "./types";

export function initialDesperationState(): DesperationState {
  return { day: 0, groupOfferCount: 0, nightOfferCount: 0, ordinaryDecisionsSinceGroup: 1, nightCheckDue: false };
}
export function nightOfferChanceBps(starving: number, living: number): number {
  if (!Number.isInteger(starving) || !Number.isInteger(living) || starving < 0 || living < starving) throw new Error("Invalid hunger counts");
  return living < 2 || starving === 0 ? 0 : starving === living ? 8500 : starving >= Math.ceil(living / 2) ? 6500 : 3500;
}
export function isCampBoundary(state: PrivateRoomState): boolean {
  if (["ending", "expired", "decision", "assignmentResponse", "privateChoice"].includes(state.phase) || state.pendingPrivateChoice || state.pendingAssignment || state.desperation?.active) return false;
  if (state.campaign?.node === "complete" || (state.motorboat && state.motorboat.completion !== "active")) return false;
  if (state.campaign && state.campaign.node !== "motorboat") return ["first-night", "daybreak-survey", "shelter-reinforcement", "crew-council", "storm-warning", "escape-project"].includes(state.campaign.node);
  return state.motorboat?.node === "repair";
}
export function canOfferGroupCrisis(state: PrivateRoomState): boolean {
  const d = state.desperation ?? initialDesperationState();
  const living = Object.values(state.characters).filter(c => c.status === "alive");
  return isCampBoundary(state) && living.length >= 2 && living.filter(c => c.resources.food === 0).length >= Math.ceil(living.length / 2)
    && d.groupOfferCount < DESPERATION.maxGroupOffers && d.lastGroupDay !== d.day && d.ordinaryDecisionsSinceGroup > 0;
}
