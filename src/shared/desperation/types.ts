export interface DesperationState {
  day: number;
  groupOfferCount: number;
  nightOfferCount: number;
  lastGroupDay?: number;
  lastAttemptDay?: number;
  lastNightCheckDay?: number;
  lastNightActorId?: string;
  ordinaryDecisionsSinceGroup: number;
  nightCheckDue: boolean;
  active?: { id: string; kind: "group" | "night"; day: number };
}
export type DesperationOutcomeId = "group-succeeded" | "target-fought-free" | "group-backed-down" | "night-succeeded" | "night-caught" | "night-regretted" | "food-found" | "search-failed" | "slept" | "attempt-cancelled";
export interface DesperationEventFacts {
  opportunityId: string;
  kind: "group" | "night";
  outcomeId: DesperationOutcomeId;
  actorCharacterId?: string;
  targetCharacterId?: string;
}
