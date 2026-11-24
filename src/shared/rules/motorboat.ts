import type { EscapeResult, MotorboatEventFacts, MotorboatRouteState, PendingPrivateChoice, PrivateChoiceOptionId, PrivateRoomState } from "../domain";
import type { RandomSource } from "./random";
import { randomIndex } from "./random";

export const PRIVATE_CHOICE_DURATION_MS = 15_000;

export function initialMotorboatRoute(): MotorboatRouteState {
  return { node: "discovery", discovered: false, hull: "unknown", engine: "unknown", fuelCharges: 0, fuelVisibility: "none", missedOpportunityIds: [], warningLevel: 0, completion: "active", repairParts: false, engineDiagnosed: false };
}

export function livingCharacterIds(state: PrivateRoomState): string[] {
  return Object.values(state.characters).filter(({ status }) => status === "alive").map(({ characterId }) => characterId).sort();
}

function playerForCharacter(state: PrivateRoomState, characterId: string) {
  return Object.values(state.players).find((player) => player.characterId === characterId);
}

export function createFuelChoice(state: PrivateRoomState, now: number, random: RandomSource): PendingPrivateChoice | null {
  const living = livingCharacterIds(state); if (!living.length) return null;
  const actorCharacterId = living[randomIndex(living.length, random)]!;
  const actorPlayerId = playerForCharacter(state, actorCharacterId)!.id;
  return { id: `fuel-${state.code}-${(state.resolutionSequence ?? 0) + 1}`, kind: "fuel-discovery", actorPlayerId, actorCharacterId, createdAt: now, deadlineAt: now + PRIVATE_CHOICE_DURATION_MS, allowedOptionIds: ["share", "hide", "transfer"], defaultOptionId: "share", response: null };
}

export function createLaunchChoice(state: PrivateRoomState, now: number): PendingPrivateChoice | null {
  const route = state.motorboat; if (!route) return null;
  const living = livingCharacterIds(state); if (!living.length || route.fuelCharges <= 0 || !["sturdy", "fragile"].includes(route.engine)) return null;
  let actorCharacterId = route.fuelOwnerCharacterId && living.includes(route.fuelOwnerCharacterId) ? route.fuelOwnerCharacterId : route.repairActorCharacterId && living.includes(route.repairActorCharacterId) ? route.repairActorCharacterId : living[0]!;
  const actorPlayerId = playerForCharacter(state, actorCharacterId)!.id;
  const opportunityId = route.activeOpportunityId ?? `motorboat-opportunity-${route.missedOpportunityIds.length + 1}`;
  const allowedOptionIds: PrivateChoiceOptionId[] = ["wake", "solo", ...(route.fuelOwnerCharacterId === actorCharacterId ? ["quiet" as const] : [])];
  return { id: `launch-${state.code}-${opportunityId}`, kind: "launch-custodian", actorPlayerId, actorCharacterId, publicActorCharacterId: actorCharacterId, createdAt: now, deadlineAt: now + PRIVATE_CHOICE_DURATION_MS, allowedOptionIds, defaultOptionId: "wake", response: null };
}

export function dropFuelFromDeadOwner(state: PrivateRoomState): PrivateRoomState {
  const route = state.motorboat; if (!route?.fuelOwnerCharacterId || state.characters[route.fuelOwnerCharacterId]?.status === "alive") return state;
  return { ...state, motorboat: { ...route, fuelVisibility: "shared", fuelOwnerCharacterId: undefined } };
}

export function recordMiss(route: MotorboatRouteState, opportunityId: string): { route: MotorboatRouteState; counted: boolean; terminal: boolean } {
  if (route.missedOpportunityIds.includes(opportunityId)) return { route, counted: false, terminal: route.missedOpportunityIds.length >= 3 };
  const missedOpportunityIds = [...route.missedOpportunityIds, opportunityId];
  return { route: { ...route, node: missedOpportunityIds.length >= 3 ? "terminal" : "repair", missedOpportunityIds, warningLevel: Math.min(2, missedOpportunityIds.length) as 0|1|2, activeOpportunityId: undefined }, counted: true, terminal: missedOpportunityIds.length >= 3 };
}

/**
 * Tense-but-fair motorboat tuning: cooperation keeps the best odds, while no
 * launch is safe enough to erase the recovery and storm branches.
 */
const LAUNCH_BASE_CHANCE_BPS = {
  group: { sturdy: 6_500, fragile: 5_000 },
  solo: { sturdy: 5_500, fragile: 3_500 },
} as const;

export function launchChanceBps(engine: "sturdy"|"fragile", mode: "group"|"solo", missCount: number): number {
  return Math.max(500, LAUNCH_BASE_CHANCE_BPS[mode][engine] - missCount * 1_000);
}

export function launchSucceeds(engine: "sturdy"|"fragile", mode: "group"|"solo", missCount: number, random: RandomSource): boolean {
  return Math.floor(random.next() * 10_000) < launchChanceBps(engine, mode, missCount);
}

export function createEscapeResult(state: PrivateRoomState, type: "group-escape"|"solo-escape", passengers: string[]): EscapeResult {
  const dead = Object.values(state.characters).filter(({ status }) => status === "ghost").map(({ characterId }) => characterId).sort();
  const escaped = [...passengers].sort();
  const stranded = livingCharacterIds(state).filter((id) => !escaped.includes(id));
  return { type, escapedCharacterIds: escaped, strandedCharacterIds: stranded, deadCharacterIds: dead, cause: type === "group-escape" ? "group-launch" : "solo-launch", epilogueId: type === "group-escape" ? "motorboat-group-aftermath-v1" : "motorboat-selfish-aftermath-v1" };
}

export function stormEnding(state: PrivateRoomState): PrivateRoomState {
  const characters = Object.fromEntries(Object.entries(state.characters).map(([id,c]) => [id, c.status === "alive" ? {...c,status:"ghost" as const,resources:{...c.resources,health:0}} : c]));
  const players = Object.fromEntries(Object.entries(state.players).map(([id,p]) => [id, p.status === "alive" ? {...p,status:"ghost" as const} : p]));
  const dead = Object.keys(characters).sort();
  return { ...state, players, characters, phase:"ending", phaseStartedAt: state.phaseStartedAt, phaseDeadlineAt:null, phaseEndsAt:null, votingOpensAt:null, earliestResolveAt:null, currentDecisionId:null, pendingPrivateChoice:undefined, pendingAssignment:undefined, desperation:state.desperation?{...state.desperation,active:undefined,nightCheckDue:false}:undefined, endingId:"no-survivors", campaign:state.campaign?{...state.campaign,node:"complete"}:undefined, escapeResult:{type:"no-survivors",escapedCharacterIds:[],strandedCharacterIds:[],deadCharacterIds:dead,cause:"storm-surge",epilogueId:"motorboat-storm-aftermath-v1"}, motorboat:{...state.motorboat!,node:"complete",completion:"no-survivors"} };
}

export function routeFacts(route: MotorboatRouteState, extra: Partial<MotorboatEventFacts> = {}): MotorboatEventFacts { return { node: route.node, ...extra }; }
