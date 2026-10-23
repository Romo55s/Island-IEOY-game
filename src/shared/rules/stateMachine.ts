import { CHARACTER_CATALOG, type DecisionCard, type DecisionOption, type EndingId, type EventEntry, type MotorboatEventFacts, type Outcome, type PrivateChoiceOptionId, type PrivateRoomState, type ResolvedAssignment } from "../domain";
import { MOTORBOAT_DISCOVERY_CARD, createMotorboatGroupLaunchCard, createMotorboatRepairCard } from "../content/motorboatRoute";
import { SURVIVAL_ITEMS } from "../content/items";
import { applyOutcome, pickWeightedOutcome } from "./outcomes";
import { resolveCrashBatch } from "./crashRescue";
import { drawStartingItemOffer } from "./itemOffers";
import type { RandomSource } from "./random";
import { randomIndex } from "./random";
import { createResolvedDecision } from "./resolvedEvents";
import { resolveWinningOption } from "./resolveVote";
import { applyDailySurvival } from "./survival";
import { didRefusalSucceed, resolveAssignedActor } from "./assignments";
import { PRIVATE_CHOICE_DURATION_MS, createEscapeResult, createFuelChoice, createLaunchChoice, dropFuelFromDeadOwner, initialMotorboatRoute, launchSucceeds, livingCharacterIds, recordMiss, stormEnding } from "./motorboat";

export const INTRO_DURATION_MS = 30_000;
export const CRASH_ITEM_CHOICE_DURATION_MS = 20_000;
export const CRASH_RESCUE_CHOICE_DURATION_MS = 20_000;
export const CRASH_RESOLUTION_DURATION_MS = 12_000;
export const DECISION_READING_DURATION_MS = 25_000;
export const VOTING_DURATION_MS = 15_000;
export const EARLIEST_RESOLVE_AFTER_OPEN_MS = 10_000;
export const REVEAL_DURATION_MS = 20_000;
export const ASSIGNMENT_RESPONSE_DURATION_MS = 15_000;

export function shuffleDeck(cards: readonly DecisionCard[], random: RandomSource): DecisionCard[] {
  const result = [...cards];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1, random);
    [result[index], result[swapIndex]] = [result[swapIndex]!, result[index]!];
  }
  return result;
}

export function startGame(state: PrivateRoomState, now: number, deck: readonly DecisionCard[], random: RandomSource): PrivateRoomState {
  const shuffled = shuffleDeck(deck, random);
  const itemOffers = Object.fromEntries(Object.keys(state.players).sort().map((playerId) => [playerId, drawStartingItemOffer(SURVIVAL_ITEMS, random).map(({ id }) => id)]));
  return {
    ...state,
    revision: state.revision + 1,
    phase: "intro",
    phaseStartedAt: now,
    phaseDeadlineAt: now + INTRO_DURATION_MS,
    votingOpensAt: null,
    earliestResolveAt: null,
    phaseEndsAt: now + INTRO_DURATION_MS,
    deck: shuffled,
    decisionIndex: 0,
    currentDecisionId: null,
    votesByPlayer: {},
    eligibleVoterIds: Object.keys(state.players),
    crashItemOffersByPlayer: itemOffers,
    crashItemsByPlayer: {},
    rescueTargetsByPlayer: {},
    crashResolution: undefined,
    resolvedOptionCounts: undefined,
    winningOptionId: undefined,
    endingId: undefined,
    assignmentNominationsByPlayer: {},
    pendingAssignment: undefined,
    resolutionSequence: 0,
    motorboat: initialMotorboatRoute(),
    pendingPrivateChoice: undefined,
    escapeResult: undefined,
  };
}

export function beginCrashItemChoice(state: PrivateRoomState, now: number): PrivateRoomState {
  return {
    ...state,
    revision: state.revision + 1,
    phase: "crashItemChoice",
    phaseStartedAt: now,
    phaseDeadlineAt: now + CRASH_ITEM_CHOICE_DURATION_MS,
    votingOpensAt: null,
    earliestResolveAt: null,
    phaseEndsAt: now + CRASH_ITEM_CHOICE_DURATION_MS,
  };
}

export function beginCrashRescueChoice(state: PrivateRoomState, now: number): PrivateRoomState {
  const items = { ...(state.crashItemsByPlayer ?? {}) };
  for (const [playerId, offer] of Object.entries(state.crashItemOffersByPlayer ?? {})) {
    if (!items[playerId] && offer[0]) items[playerId] = offer[0];
  }
  const characters = { ...state.characters };
  for (const [playerId, itemId] of Object.entries(items)) {
    const characterId = state.players[playerId]?.characterId;
    if (characterId && characters[characterId]) characters[characterId] = { ...characters[characterId]!, startingItemId: itemId };
  }
  return {
    ...state,
    revision: state.revision + 1,
    phase: "crashRescueChoice",
    phaseStartedAt: now,
    phaseDeadlineAt: now + CRASH_RESCUE_CHOICE_DURATION_MS,
    votingOpensAt: null,
    earliestResolveAt: null,
    phaseEndsAt: now + CRASH_RESCUE_CHOICE_DURATION_MS,
    crashItemsByPlayer: items,
    characters,
  };
}

export function resolveCrashChoices(state: PrivateRoomState, now: number, random: RandomSource): PrivateRoomState {
  const items = { ...(state.crashItemsByPlayer ?? {}) };
  const characters = { ...state.characters };
  for (const [playerId, offer] of Object.entries(state.crashItemOffersByPlayer ?? {})) {
    if (!items[playerId] && offer[0]) items[playerId] = offer[0];
    const characterId = state.players[playerId]?.characterId;
    if (characterId && items[playerId] && characters[characterId]) characters[characterId] = { ...characters[characterId]!, startingItemId: items[playerId]! };
  }
  const livingCharacterIds = Object.values(state.players)
    .filter(({ status, characterId }) => status === "alive" && characterId !== null)
    .map(({ characterId }) => characterId!);
  const submissions = Object.entries(state.rescueTargetsByPlayer ?? {}).flatMap(([playerId, targetCharacterId]) => {
    const player = state.players[playerId];
    if (!player || player.status !== "alive" || !player.characterId) return [];
    return [{ rescuerCharacterId: player.characterId, targetCharacterId, itemId: items[playerId] ?? null }];
  });
  const crashResolution = resolveCrashBatch(livingCharacterIds, submissions, random);
  const players = { ...state.players };
  for (const characterId of crashResolution.eliminatedCharacterIds) {
    if (characters[characterId]) characters[characterId] = { ...characters[characterId]!, status: "ghost", resources: { ...characters[characterId]!.resources, health: 0 } };
    for (const [playerId, player] of Object.entries(players)) if (player.characterId === characterId) players[playerId] = { ...player, status: "ghost" };
  }
  const eventHistory = [...state.eventHistory, { id: `crash-rescue-${now}`, text: crashResolution.summary, createdAt: now, deathCharacterIds: [...crashResolution.eliminatedCharacterIds] }].slice(-20);
  return {
    ...state,
    revision: state.revision + 1,
    phase: "crashResolution",
    phaseStartedAt: now,
    phaseDeadlineAt: now + CRASH_RESOLUTION_DURATION_MS,
    votingOpensAt: null,
    earliestResolveAt: null,
    phaseEndsAt: now + CRASH_RESOLUTION_DURATION_MS,
    players,
    characters,
    crashItemsByPlayer: items,
    crashResolution,
    eventHistory,
  };
}

export function beginDecision(state: PrivateRoomState, index: number, now: number): PrivateRoomState {
  const card = state.deck[index];
  if (!card) return enterEnding(state, now);
  const votingOpensAt = now + DECISION_READING_DURATION_MS;
  const phaseDeadlineAt = votingOpensAt + VOTING_DURATION_MS;
  return {
    ...state,
    revision: state.revision + 1,
    phase: "decision",
    phaseStartedAt: now,
    phaseDeadlineAt,
    votingOpensAt,
    earliestResolveAt: votingOpensAt + EARLIEST_RESOLVE_AFTER_OPEN_MS,
    phaseEndsAt: phaseDeadlineAt,
    decisionIndex: index,
    currentDecisionId: card.id,
    votesByPlayer: {},
    eligibleVoterIds: Object.keys(state.players),
    resolvedOptionCounts: undefined,
    winningOptionId: undefined,
    assignmentNominationsByPlayer: {},
    pendingAssignment: undefined,
  };
}

function beginAuthoredDecision(state: PrivateRoomState, card: DecisionCard, now: number): PrivateRoomState {
  return beginDecision({ ...state, deck: [card], decisionIndex: 0 }, 0, now);
}

export function beginNextMotorboatStep(input: PrivateRoomState, now: number, random: RandomSource): PrivateRoomState {
  let state = dropFuelFromDeadOwner(input);
  if (livingCharacterIds(state).length === 0) return enterNoSurvivors(state, now, "all-dead");
  const route = state.motorboat ?? initialMotorboatRoute();
  state = { ...state, motorboat: route };
  if (route.completion !== "active" || route.node === "terminal" || route.node === "complete") return state;
  if (route.node === "discovery") return beginAuthoredDecision(state, MOTORBOAT_DISCOVERY_CARD, now);
  if (route.node === "fuel-choice") {
    const choice = createFuelChoice(state, now, random);
    if (!choice) return enterNoSurvivors(state, now, "all-dead");
    return { ...state, revision: state.revision + 1, phase:"privateChoice", phaseStartedAt:now, phaseDeadlineAt:choice.deadlineAt, phaseEndsAt:choice.deadlineAt, votingOpensAt:null, earliestResolveAt:null, currentDecisionId:null, pendingPrivateChoice:choice };
  }
  if (route.node === "repair") return beginAuthoredDecision(state, createMotorboatRepairCard(route, state.resources.shelter, Object.values(state.characters).filter(({status})=>status==="alive").flatMap(({startingItemId})=>startingItemId?[startingItemId]:[])), now);
  const activeOpportunityId=route.activeOpportunityId ?? `motorboat-opportunity-${route.missedOpportunityIds.length+1}`;
  state={...state,motorboat:{...route,activeOpportunityId}};
  const choice = createLaunchChoice(state, now);
  if (!choice) {
    if (livingCharacterIds(state).length===0) return enterNoSurvivors(state,now,"all-dead");
    if (!["sturdy","fragile"].includes(route.engine)) return beginNextMotorboatStep({...state,motorboat:{...route,node:"repair",activeOpportunityId:undefined}},now,random);
    return stormEnding({...state,motorboat:{...route,node:"terminal",activeOpportunityId}});
  }
  return { ...state, revision:state.revision+1, phase:"privateChoice",phaseStartedAt:now,phaseDeadlineAt:choice.deadlineAt,phaseEndsAt:choice.deadlineAt,votingOpensAt:null,earliestResolveAt:null,currentDecisionId:null,pendingPrivateChoice:choice };
}

function optionCounts(state: PrivateRoomState, card: DecisionCard): Record<string, number> {
  const counts = Object.fromEntries(card.options.map(({ id }) => [id, 0])) as Record<string, number>;
  for (const optionId of Object.values(state.votesByPlayer)) {
    if (optionId in counts) counts[optionId] = (counts[optionId] ?? 0) + 1;
  }
  return counts;
}

export function resolveDecisionVote(state: PrivateRoomState, now: number, random: RandomSource): PrivateRoomState {
  if (state.phase !== "decision") return state;
  const card = state.deck.find(({ id }) => id === state.currentDecisionId);
  if (!card) return state;
  const counts = optionCounts(state, card);
  const winningOptionId = resolveWinningOption(counts, card.options.map(({ id }) => id), random);
  const option = card.options.find(({ id }) => id === winningOptionId)!;
  if (option.assignment) {
    const actor = resolveAssignedActor(state, winningOptionId, random);
    if (!actor) return enterEnding(state, now);
    const sequence = (state.resolutionSequence ?? 0) + 1;
    const deadlineAt = now + ASSIGNMENT_RESPONSE_DURATION_MS;
    return {
      ...state,
      revision: state.revision + 1,
      phase: "assignmentResponse",
      phaseStartedAt: now,
      phaseDeadlineAt: deadlineAt,
      votingOpensAt: null,
      earliestResolveAt: null,
      phaseEndsAt: deadlineAt,
      resolvedOptionCounts: counts,
      winningOptionId,
      assignmentNominationsByPlayer: {},
      resolutionSequence: sequence,
      pendingAssignment: {
        id: `assignment-${state.code}-${sequence}`,
        decisionId: card.id,
        optionId: option.id,
        actorCharacterId: actor.actorCharacterId,
        actorPlayerId: actor.actorPlayerId,
        roleLabel: option.assignment.roleLabel,
        selectionMethod: actor.selectionMethod,
        createdAt: now,
        deadlineAt,
        response: null,
      },
    };
  }
  const outcome = withEliminationFallback(state, pickWeightedOutcome(option.outcomes, random));
  return finalizeDecisionOutcome(state, now, random, card, option, outcome, counts);
}

export function resolveCurrentDecision(state: PrivateRoomState, now: number, random: RandomSource): PrivateRoomState {
  return resolveDecisionVote(state, now, random);
}

export function resolvePendingAssignment(state: PrivateRoomState, now: number, random: RandomSource): PrivateRoomState {
  if (state.phase !== "assignmentResponse" || !state.pendingAssignment) return state;
  const pending = state.pendingAssignment;
  const actor = state.characters[pending.actorCharacterId];
  const actorIsLiving = actor?.status === "alive" && state.players[pending.actorPlayerId]?.status === "alive";
  if (pending.response === null && now < pending.deadlineAt && actorIsLiving) return state;
  const card = state.deck.find(({ id }) => id === pending.decisionId);
  const option = card?.options.find(({ id }) => id === pending.optionId);
  if (!card || !option?.assignment || !state.resolvedOptionCounts) return state;
  let result: ResolvedAssignment["result"];
  let outcomes: Outcome[];
  if (!actorIsLiving) {
    result = "actor-unavailable";
    outcomes = option.assignment.refusal.successOutcomes;
  } else if (pending.response === null) {
    result = "timeout-accepted";
    outcomes = option.outcomes;
  } else if (pending.response === "accept") {
    result = "accepted";
    outcomes = option.outcomes;
  } else if (didRefusalSucceed(option.assignment.refusal.successChanceBps, random) && (!state.motorboat || state.resources.shelter >= 15)) {
    result = "refusal-succeeded";
    outcomes = option.assignment.refusal.successOutcomes;
  } else {
    result = "refusal-failed";
    outcomes = option.outcomes;
  }
  const outcome = withEliminationFallback(state, pickWeightedOutcome(outcomes, random));
  const assignment: ResolvedAssignment = {
    id: pending.id,
    actorCharacterId: pending.actorCharacterId,
    roleLabel: pending.roleLabel,
    selectionMethod: pending.selectionMethod,
    result,
  };
  return finalizeDecisionOutcome(state, now, random, card, option, outcome, state.resolvedOptionCounts, assignment);
}

function finalizeDecisionOutcome(
  state: PrivateRoomState,
  now: number,
  random: RandomSource,
  card: DecisionCard,
  option: DecisionOption,
  outcome: Outcome,
  counts: Record<string, number>,
  assignment?: ResolvedAssignment,
): PrivateRoomState {
  const afterOutcome = applyOutcome(state, outcome, random, assignment?.actorCharacterId);
  const survival = applyDailySurvival(afterOutcome);
  let deathCharacterIds = [...new Set([
    ...Object.values(state.characters).flatMap((character) => character.status === "alive" && afterOutcome.characters[character.characterId]?.status === "ghost" ? [character.characterId] : []),
    ...survival.newlyGhostCharacterIds,
  ])];
  const catalogNames = new Map(CHARACTER_CATALOG.map(({ id, displayName }) => [id, displayName]));
  const shortNames = (ids: string[]) => ids.slice(0, 3).map((id) => catalogNames.get(id) ?? id).join(", ") + (ids.length > 3 ? ` and ${ids.length - 3} more` : "");
  const depletedCharacterIds = Object.values(state.characters).flatMap((character) => {
    const afterTick = survival.state.characters[character.characterId];
    return character.status === "alive" && (afterOutcome.characters[character.characterId]?.resources.food ?? 0) > 0 && afterTick?.resources.food === 0 ? [character.characterId] : [];
  });
  const starvationGroups = new Map<number, string[]>();
  for (const [characterId, damage] of Object.entries(survival.starvationDamageByCharacterId)) {
    if (damage <= 0) continue;
    starvationGroups.set(damage, [...(starvationGroups.get(damage) ?? []), characterId]);
  }
  const starvationMessages = [...starvationGroups.entries()].map(([damage, ids]) => `Starvation costs ${shortNames(ids)} ${damage} health.`);
  const stillHungryIds = Object.values(survival.state.characters)
    .filter(({ status, resources }) => status === "alive" && resources.food === 0)
    .map(({ characterId }) => characterId);
  const hungerMessages = [
    ...(depletedCharacterIds.length > 0 ? [`Food runs out for ${shortNames(depletedCharacterIds)}.`] : []),
    ...starvationMessages,
    ...(stillHungryIds.length > 0 ? [`${shortNames(stillHungryIds)} ${stillHungryIds.length === 1 ? "is" : "are"} starving; each further foodless day costs up to 20 health.`] : []),
    ...(deathCharacterIds.length === 1
      ? [`${shortNames(deathCharacterIds)} becomes a ghost.`]
      : deathCharacterIds.length > 1 ? [`${shortNames(deathCharacterIds)} become ghosts.`] : []),
  ];
  const suffix = hungerMessages.length > 0 ? ` ${hungerMessages.join(" ")}` : "";
  const boundedSuffix = suffix.slice(0, 220);
  const choiceContext = `The crew chose “${option.label}.” `;
  const narrative = `${choiceContext}${outcome.text}`;
  const text = `${narrative.slice(0, Math.max(0, 280 - boundedSuffix.length))}${boundedSuffix}`;
  const deltas = Object.values(outcome.resourceDeltas ?? {});
  const gain = deltas.reduce((sum, delta) => sum + Math.max(0, delta), 0);
  const loss = deltas.reduce((sum, delta) => sum + Math.max(0, -delta), 0);
  const socialCue: EventEntry["socialCue"] = deathCharacterIds.length > 0 || survival.starvedCharacterIds.length > 0 || (outcome.resourceDeltas?.health ?? 0) < 0
    ? "danger"
    : depletedCharacterIds.length > 0 || loss > gain ? "setback"
      : gain > loss ? "success" : "neutral";
  let routed = livingCharacterIds(survival.state).length===0 ? {state:enterNoSurvivors(survival.state,now,"all-dead"),facts:{node:"complete" as const,endingCause:"all-dead" as const}} : applyMotorboatEffect(survival.state, outcome, assignment, now);
  routed={...routed,state:dropFuelFromDeadOwner(routed.state)};
  if (routed.facts?.endingCause === "storm-surge") deathCharacterIds=[...new Set([...deathCharacterIds,...Object.values(survival.state.characters).flatMap((character)=>character.status==="alive"&&routed.state.characters[character.characterId]?.status==="ghost"?[character.characterId]:[])])];
  const resolution = createResolvedDecision({
    before: state,
    afterOutcome,
    afterSurvival: survival.state,
    card,
    option,
    outcome,
    optionCounts: counts,
    presentationCue: socialCue,
    assignment,
  });
  if (routed.facts) resolution.motorboat = routed.facts;
  if (routed.facts?.endingCause === "storm-surge") {
    const stormDeaths = Object.values(survival.state.characters).flatMap((character) => character.status === "alive" && routed.state.characters[character.characterId]?.status === "ghost" ? [{ characterId: character.characterId, before:"alive" as const, after:"ghost" as const, cause:"storm-surge" as const }] : []);
    resolution.statusChanges.push(...stormDeaths);
    resolution.affectedCharacterIds = [...new Set([...resolution.affectedCharacterIds, ...stormDeaths.map(({characterId})=>characterId)])].sort();
  }
  const sequence = assignment ? (state.resolutionSequence ?? 0) : (state.resolutionSequence ?? 0) + 1;
  const eventHistory = [...routed.state.eventHistory, {
    id: `event-${state.code}-${sequence}`, text, createdAt: now, decisionId: card.id, winningOptionId: option.id, outcomeId: outcome.id, socialCue,
    ...(deathCharacterIds.length > 0 ? { deathCharacterIds } : {}),
    resolution,
  }].slice(-20);
  const revealed: PrivateRoomState = {
    ...routed.state,
    revision: routed.state.revision,
    phase: "reveal",
    phaseStartedAt: now,
    phaseDeadlineAt: now + REVEAL_DURATION_MS,
    votingOpensAt: null,
    earliestResolveAt: null,
    phaseEndsAt: now + REVEAL_DURATION_MS,
    resolvedOptionCounts: counts,
    winningOptionId: option.id,
    eventHistory,
    pendingAssignment: undefined,
    assignmentNominationsByPlayer: {},
    resolutionSequence: sequence,
  };
  if (routed.state.phase === "ending") return { ...revealed, phase:"ending", phaseDeadlineAt:null, phaseEndsAt:null, currentDecisionId:null, endingId:routed.state.endingId, escapeResult:routed.state.escapeResult };
  return revealed;
}

function applyMotorboatEffect(state: PrivateRoomState, outcome: Outcome, assignment: ResolvedAssignment | undefined, now: number): { state: PrivateRoomState; facts?: MotorboatEventFacts } {
  const effect = outcome.motorboatEffect; const route = state.motorboat;
  if (!effect || !route) return { state };
  if (effect.type === "discovery") {
    const next = { ...route, node:"fuel-choice" as const, discovered:true, hull:effect.hull, engine:"broken" as const, fuelCharges:3 as const, fuelVisibility:"known-private" as const, repairParts:effect.repairParts, engineDiagnosed:effect.engineDiagnosed };
    return { state:{...state,motorboat:next}, facts:{node:"discovery",boatChange:"discovered"} };
  }
  if (effect.type === "repair") {
    const next = { ...route, node:"launch" as const, engine:effect.engine, repairActorCharacterId: assignment?.actorCharacterId ?? route.repairActorCharacterId };
    return { state:{...state,motorboat:next}, facts:{node:"repair",boatChange:effect.engine === "sturdy" ? "repaired-sturdy":"repaired-fragile"} };
  }
  const opportunityId = route.activeOpportunityId ?? `motorboat-opportunity-${route.missedOpportunityIds.length + 1}`;
  if (effect.type === "launch") {
    const fuelCharges = Math.max(0, route.fuelCharges - 1) as 0|1|2|3;
    const passengers = livingCharacterIds(state);
    if (passengers.length === 0) return { state:enterNoSurvivors(state,now,"all-dead"), facts:{node:"complete",endingCause:"all-dead"} };
    if (effect.result === "success") {
      const escapeResult = createEscapeResult(state,"group-escape",passengers);
      return { state:{...state,phase:"ending",endingId:"group-escape",escapeResult,motorboat:{...route,node:"complete",fuelCharges,completion:"group-escape",activeOpportunityId:undefined}}, facts:{node:"complete",boatChange:"escaped",opportunityId,passengerCharacterIds:passengers,endingCause:"group-launch",fuelConsumed:true} };
    }
    const missed = recordMiss({...route,fuelCharges},opportunityId);
    if (missed.terminal) { const ended=stormEnding({...state,motorboat:missed.route}); return {state:{...ended,phaseStartedAt:now},facts:{node:"terminal",boatChange:"storm-destroyed",opportunityId,passengerCharacterIds:passengers,missNumber:3,endingCause:"storm-surge",fuelConsumed:true}}; }
    return {state:{...state,motorboat:missed.route},facts:{node:"repair",boatChange:"launch-failed",opportunityId,passengerCharacterIds:passengers,missNumber:missed.route.missedOpportunityIds.length,fuelConsumed:true}};
  }
  const missed = recordMiss(route,opportunityId);
  if (missed.terminal) { const ended=stormEnding({...state,motorboat:missed.route}); return {state:{...ended,phaseStartedAt:now},facts:{node:"terminal",boatChange:"storm-destroyed",opportunityId,missNumber:3,endingCause:"storm-surge"}}; }
  return {state:{...state,motorboat:missed.route},facts:{node:"repair",opportunityId,missNumber:missed.route.missedOpportunityIds.length}};
}

export function resolvePendingPrivateChoice(state: PrivateRoomState, now: number, random: RandomSource): PrivateRoomState {
  if (state.phase !== "privateChoice" || !state.pendingPrivateChoice) return state;
  const choice=state.pendingPrivateChoice;
  if (!choice.response && now < choice.deadlineAt) return state;
  const optionId: PrivateChoiceOptionId = choice.response?.optionId ?? choice.defaultOptionId;
  const route=state.motorboat!;
  if (choice.kind === "fuel-discovery") {
    let fuelVisibility: "shared"|"known-private" = optionId === "share" ? "shared":"known-private";
    let fuelOwnerCharacterId = optionId === "share" ? undefined : choice.actorCharacterId;
    if (optionId === "transfer" && choice.response?.targetCharacterId && state.characters[choice.response.targetCharacterId]?.status === "alive") fuelOwnerCharacterId=choice.response.targetCharacterId;
    const sequence=(state.resolutionSequence??0)+1;
    const event: EventEntry={id:`event-${state.code}-${sequence}`,text:optionId==="share"?"The fuel finder reveals the sealed can and adds it to the shared supplies.":"Someone quietly keeps the sealed fuel under private control.",createdAt:now,socialCue:optionId==="share"?"success":"neutral",motorboat:{node:"fuel-choice",boatChange:optionId==="share"?"fuel-shared":"fuel-kept-private",...(optionId==="share"?{actorCharacterId:choice.actorCharacterId}:{})}};
    const next={...state,revision:state.revision+1,pendingPrivateChoice:undefined,motorboat:{...route,node:"repair" as const,fuelVisibility,fuelOwnerCharacterId},resolutionSequence:sequence,eventHistory:[...state.eventHistory,event].slice(-20)};
    return beginNextMotorboatStep(next,now,random);
  }
  if (optionId === "wake") {
    const sequence=(state.resolutionSequence??0)+1;
    const next={...state,pendingPrivateChoice:undefined,resolutionSequence:sequence,eventHistory:[...state.eventHistory,{id:`event-${state.code}-${sequence}`,text:"The night-watch custodian wakes the crew for a launch vote.",createdAt:now,socialCue:"neutral" as const,motorboat:{node:"launch" as const,boatChange:"custodian-woke-group" as const,opportunityId:route.activeOpportunityId}}].slice(-20),motorboat:{...route,node:"launch" as const,activeOpportunityId:route.activeOpportunityId}};
    return beginAuthoredDecision(next,createMotorboatGroupLaunchCard(route),now);
  }
  if (optionId === "solo") {
    const fuelCharges=Math.max(0,route.fuelCharges-1) as 0|1|2|3;
    const success=launchSucceeds(route.engine as "sturdy"|"fragile","solo",route.missedOpportunityIds.length,random);
    const sequence=(state.resolutionSequence??0)+1;
    if (success) { const escapeResult=createEscapeResult(state,"solo-escape",[choice.actorCharacterId]); const event:EventEntry={id:`event-${state.code}-${sequence}`,text:"The custodian launches alone and escapes, leaving the crew behind.",createdAt:now,socialCue:"danger",motorboat:{node:"complete",boatChange:"escaped",opportunityId:route.activeOpportunityId,passengerCharacterIds:[choice.actorCharacterId],endingCause:"solo-launch",fuelConsumed:true}}; return {...state,revision:state.revision+1,phase:"ending",phaseStartedAt:now,phaseDeadlineAt:null,phaseEndsAt:null,votingOpensAt:null,earliestResolveAt:null,currentDecisionId:null,pendingPrivateChoice:undefined,endingId:"solo-escape",escapeResult,eventHistory:[...state.eventHistory,event].slice(-20),resolutionSequence:sequence,motorboat:{...route,node:"complete",completion:"solo-escape",fuelCharges,activeOpportunityId:undefined}}; }
    const characters={...state.characters}; const actor=characters[choice.actorCharacterId]!; const health=Math.max(0,actor.resources.health-15); characters[choice.actorCharacterId]={...actor,status:health===0?"ghost":"alive",resources:{...actor.resources,health}}; const players={...state.players}; if(health===0) players[choice.actorPlayerId]={...players[choice.actorPlayerId]!,status:"ghost"};
    const missed=recordMiss({...route,fuelCharges},route.activeOpportunityId!); const stormVictims=Object.values(characters).filter(({status})=>status==="alive").map(({characterId})=>characterId); const event:EventEntry={id:`event-${state.code}-${sequence}`,text:"A selfish solo launch fails in the surf. The would-be escapee limps back injured.",createdAt:now,socialCue:"danger",...(health===0||missed.terminal?{deathCharacterIds:[...new Set([...(health===0?[choice.actorCharacterId]:[]),...(missed.terminal?stormVictims:[])])]}:{}),motorboat:{node:missed.terminal?"terminal":"repair",boatChange:missed.terminal?"storm-destroyed":"solo-launch-failed",opportunityId:route.activeOpportunityId,passengerCharacterIds:[choice.actorCharacterId],missNumber:missed.route.missedOpportunityIds.length,fuelConsumed:true,...(missed.terminal?{endingCause:"storm-surge" as const,statusChanges:stormVictims.map((characterId)=>({characterId,before:"alive" as const,after:"ghost" as const,cause:"storm-surge" as const}))}:{})}}; const next={...state,players,characters,revision:state.revision+1,pendingPrivateChoice:undefined,motorboat:missed.route,eventHistory:[...state.eventHistory,event].slice(-20),resolutionSequence:sequence};
    if (missed.terminal) return stormEnding(next);
    return beginNextMotorboatStep(next,now,random);
  }
  const missed=recordMiss(route,route.activeOpportunityId!); const sequence=(state.resolutionSequence??0)+1; const stormVictims=livingCharacterIds(state); const event:EventEntry={id:`event-${state.code}-${sequence}`,text:"The custodian keeps quiet. The launch window closes while everyone else sleeps.",createdAt:now,socialCue:"setback",...(missed.terminal?{deathCharacterIds:stormVictims}:{}),motorboat:{node:missed.terminal?"terminal":"repair",boatChange:missed.terminal?"storm-destroyed":"quiet-miss",opportunityId:route.activeOpportunityId,missNumber:missed.route.missedOpportunityIds.length,...(missed.terminal?{endingCause:"storm-surge" as const,statusChanges:stormVictims.map((characterId)=>({characterId,before:"alive" as const,after:"ghost" as const,cause:"storm-surge" as const}))}:{})}}; const next={...state,revision:state.revision+1,pendingPrivateChoice:undefined,motorboat:missed.route,eventHistory:[...state.eventHistory,event].slice(-20),resolutionSequence:sequence};
  if (missed.terminal) return stormEnding(next);
  return beginNextMotorboatStep(next,now,random);
}

function withEliminationFallback(state: PrivateRoomState, outcome: Outcome): Outcome {
  if (!outcome.eliminateRandomLiving && !outcome.eliminateCharacterId) return outcome;
  const hasLivingTarget = state.eligibleVoterIds.some((playerId) => {
    const player = state.players[playerId];
    return player?.status === "alive" && player.characterId !== null &&
      (!outcome.eliminateCharacterId || player.characterId === outcome.eliminateCharacterId);
  });
  if (hasLivingTarget) return outcome;
  return {
    ...outcome,
    eliminateRandomLiving: false,
    eliminateCharacterId: undefined,
    resourceDeltas: { ...outcome.resourceDeltas, morale: (outcome.resourceDeltas?.morale ?? 0) - 10 },
  };
}

export function deriveEndingId(state: PrivateRoomState): EndingId { return state.escapeResult?.type ?? "no-survivors"; }

function enterNoSurvivors(state: PrivateRoomState, now: number, cause: "all-dead"|"storm-surge"): PrivateRoomState {
  const dead=Object.values(state.characters).filter(({status})=>status==="ghost").map(({characterId})=>characterId).sort();
  return {...state,revision:state.revision+1,phase:"ending",phaseStartedAt:now,phaseDeadlineAt:null,phaseEndsAt:null,votingOpensAt:null,earliestResolveAt:null,currentDecisionId:null,endingId:"no-survivors",escapeResult:{type:"no-survivors",escapedCharacterIds:[],strandedCharacterIds:[],deadCharacterIds:dead,cause,epilogueId:cause==="storm-surge"?"motorboat-storm-aftermath-v1":"motorboat-all-dead-aftermath-v1"},motorboat:{...(state.motorboat??initialMotorboatRoute()),node:"complete",completion:"no-survivors"}};
}

export function enterEnding(state: PrivateRoomState, now: number): PrivateRoomState {
  return {
    ...state,
    revision: state.revision + 1,
    phase: "ending",
    phaseStartedAt: now,
    phaseDeadlineAt: null,
    votingOpensAt: null,
    earliestResolveAt: null,
    phaseEndsAt: null,
    currentDecisionId: null,
    endingId: deriveEndingId(state),
  };
}

export function advancePhase(state: PrivateRoomState, now: number, random: RandomSource): PrivateRoomState {
  if (state.phaseDeadlineAt === null || now < state.phaseDeadlineAt) return state;
  if (state.phase === "intro") return state.crashItemOffersByPlayer ? beginCrashItemChoice(state, now) : beginDecision(state, 0, now);
  if (state.phase === "crashItemChoice") return beginCrashRescueChoice(state, now);
  if (state.phase === "crashRescueChoice") return resolveCrashChoices(state, now, random);
  if (state.phase === "crashResolution") return beginNextMotorboatStep({ ...state, motorboat: state.motorboat ?? initialMotorboatRoute() }, now, random);
  if (state.phase === "decision") return resolveCurrentDecision(state, now, random);
  if (state.phase === "assignmentResponse") return resolvePendingAssignment(state, now, random);
  if (state.phase === "privateChoice") return resolvePendingPrivateChoice(state, now, random);
  if (state.phase === "reveal" && state.motorboat) return beginNextMotorboatStep(state, now, random);
  if (state.phase === "reveal") return beginDecision(state, state.decisionIndex + 1, now);
  return state;
}
