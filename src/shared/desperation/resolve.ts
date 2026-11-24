import { CHARACTER_CATALOG, type PrivateRoomState, type ResolvedResourceChange, type ResolvedStatusChange } from "../domain";
import { clampResource } from "../rules/outcomes";
import type { RandomSource } from "../rules/random";
import { DESPERATION as C } from "./config";
import type { DesperationEventFacts, DesperationOutcomeId } from "./types";

export interface DesperationRequest {
  opportunityId: string;
  kind: "group" | "night";
  action: "search" | "attempt" | "sleep";
  actorCharacterId?: string;
  targetCharacterId?: string;
}
export interface DesperationResolution {
  state: PrivateRoomState;
  facts: DesperationEventFacts;
  text: string;
  resourceChanges: ResolvedResourceChange[];
  statusChanges: ResolvedStatusChange[];
}
export function pickAttemptOutcome(kind: "group" | "night", random: RandomSource): DesperationOutcomeId {
  const [a,b] = kind === "group" ? C.groupWeights : C.nightWeights;
  const roll = random.next() * 100;
  return kind === "group" ? roll < a ? "group-succeeded" : roll < a+b ? "target-fought-free" : "group-backed-down"
    : roll < a ? "night-succeeded" : roll < a+b ? "night-caught" : "night-regretted";
}
export function resolveDesperation(state: PrivateRoomState, request: DesperationRequest, random: RandomSource): DesperationResolution {
  if ((request.kind === "group" && request.action === "sleep") || (request.kind === "night" && request.action === "search")) throw new Error("Invalid hunger action");
  const actor = request.actorCharacterId, target = request.targetCharacterId;
  const living = Object.values(state.characters).filter(c => c.status === "alive").map(c => c.characterId);
  const valid = request.action !== "attempt" || (living.length >= 2 && Boolean(target && living.includes(target)) && (request.kind === "group" || Boolean(actor && living.includes(actor) && actor !== target)));
  const outcomeId: DesperationOutcomeId = !valid ? "attempt-cancelled" : request.action === "sleep" ? "slept"
    : request.action === "search" ? random.next() * 10000 < C.searchChanceBps ? "food-found" : "search-failed" : pickAttemptOutcome(request.kind, random);
  const characters = Object.fromEntries(Object.entries(state.characters).map(([id,c]) => [id, { ...c, resources: { ...c.resources } }]));
  const players = { ...state.players };
  const change = (ids: string[], resource: "health" | "food" | "morale", delta: number) => ids.forEach(id => { characters[id]!.resources[resource] = clampResource(characters[id]!.resources[resource] + delta); });
  const kill = (id: string) => { characters[id]!.resources.health = 0; };
  const others = living.filter(id => id !== target);
  switch (outcomeId) {
    case "food-found": change(living, "food", C.searchFood); break;
    case "search-failed": change(living, "morale", C.searchMorale); break;
    case "group-succeeded": kill(target!); change(others, "food", C.groupFood); change(others, "morale", C.groupMorale); break;
    case "target-fought-free": characters[target!]!.resources.health = Math.max(1, characters[target!]!.resources.health - C.resistanceDamage); change(living, "morale", C.resistanceMorale); break;
    case "group-backed-down": change(living, "morale", C.backDownMorale); break;
    case "night-succeeded": kill(target!); change([actor!], "food", C.nightFood); change([actor!], "morale", C.actorMorale); change(others.filter(id => id !== actor), "morale", C.witnessMorale); break;
    case "night-caught": change([actor!], "health", -C.knockoutDamage); change([actor!], "morale", C.actorMorale); break;
    case "night-regretted": change([actor!], "morale", C.actorMorale); break;
  }
  const resourceChanges: ResolvedResourceChange[] = [], statusChanges: ResolvedStatusChange[] = [];
  for (const id of living) {
    const before = state.characters[id]!, after = characters[id]!;
    for (const resource of ["health", "food", "morale", "water"] as const) {
      const delta = after.resources[resource] - before.resources[resource];
      if (delta) resourceChanges.push({ scope: "character", characterId: id, resource, before: before.resources[resource], after: after.resources[resource], delta, cause: "outcome" });
    }
    if (after.resources.health === 0) {
      after.status = "ghost";
      statusChanges.push({ characterId: id, before: "alive", after: "ghost", cause: "outcome" });
      for (const [pid,p] of Object.entries(players)) if (p.characterId === id) players[pid] = { ...p, status: "ghost" };
    }
  }
  const name = (id?: string) => CHARACTER_CATALOG.find(c => c.id === id)?.displayName ?? id ?? "Someone";
  const text: Record<DesperationOutcomeId, string> = {
    "group-succeeded": `The crew chose to eat ${name(target)}. ${name(target)} died; the survivors gained food, at a terrible cost to morale.`,
    "target-fought-free": `The crew tried to eat ${name(target)}, who fought free and survived. Nobody gained food.`,
    "group-backed-down": `The crew tried to eat ${name(target)}, then backed down. Everyone survived; nobody gained food.`,
    "night-succeeded": `${name(actor)} ate ${name(target)} while the camp slept. ${name(target)} died; ${name(actor)} gained food. The attempt is now known to everyone.`,
    "night-caught": `${name(actor)} tried to eat ${name(target)} while they slept. ${name(target)} woke up and struck back. ${characters[actor ?? ""]?.status === "ghost" ? `${name(actor)} died from the injury.` : `${name(actor)} was knocked out.`} Nobody gained food.`,
    "night-regretted": `${name(actor)} tried to eat ${name(target)} while they slept, failed, and regretted the decision. Everyone now knows; nobody gained food.`,
    "food-found": "The crew searched together and found food. Everyone living shares the supplies.",
    "search-failed": "The food search came up empty. Morale falls, but nobody was harmed.",
    "slept": "The camp rests through the night.",
    "attempt-cancelled": "The attempt was cancelled because its participants were no longer available. Nobody gained food or suffered new damage.",
  };
  return { state: { ...state, characters, players }, text: text[outcomeId], facts: { opportunityId: request.opportunityId, kind: request.kind, outcomeId,
    ...(request.action === "attempt" && valid ? { ...(actor ? { actorCharacterId: actor } : {}), targetCharacterId: target } : {}) }, resourceChanges, statusChanges };
}
