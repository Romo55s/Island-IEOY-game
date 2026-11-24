import { createBearEncounterCard } from "../content/bearEncounter";
import { createHungerCrisisCard } from "../content/desperationCards";
import { prepareDesperation } from "../desperation/coordinator";
import { initialDesperationState } from "../desperation/opportunities";
import { resolveDesperation, type DesperationRequest } from "../desperation/resolve";
import { publicDialogueContext } from "../content/instigatorDialogue";
import { CHARACTER_CATALOG, type CampaignEventFacts, type CampaignState, type DecisionCard, type DecisionOption, type EndingId, type EventEntry, type MotorboatEventFacts, type Outcome, type PrivateChoiceOptionId, type PrivateRoomState, type ResolvedAssignment } from "../domain";
import { createMotorboatDiscoveryCard, createMotorboatGroupLaunchCard, createMotorboatRepairCard } from "../content/motorboatRoute";
import { createCampaignDecision, nextCampaignNode } from "../content/campaignRoute";
import { SURVIVAL_ITEMS } from "../content/items";
import { applyOutcome, pickWeightedOutcome } from "./outcomes";
import { selectDecisionPromptDialogue, selectResolvedCrewDialogue } from "../content/crewDialogue";
import { resolveCrashBatch } from "./crashRescue";
import { drawStartingItemOffer } from "./itemOffers";
import type { RandomSource } from "./random";
import { randomIndex } from "./random";
import { createResolvedDecision } from "./resolvedEvents";
import { resolveWinningOption } from "./resolveVote";
import { applyDailySurvival, CAMPAIGN_DECISIONS_PER_DAY } from "./survival";
import { didRefusalSucceed, resolveAssignedActor } from "./assignments";
import { PRIVATE_CHOICE_DURATION_MS, createEscapeResult, createFuelChoice, createLaunchChoice, dropFuelFromDeadOwner, initialMotorboatRoute, launchSucceeds, livingCharacterIds, recordMiss, stormEnding } from "./motorboat";

export const INTRO_DURATION_MS = 30_000;
export const CRASH_ITEM_CHOICE_DURATION_MS = 20_000;
export const CRASH_RESCUE_CHOICE_DURATION_MS = 20_000;
export const CRASH_RESOLUTION_DURATION_MS = 12_000;
export const VOTING_DURATION_MS = 40_000;
export const REVEAL_DURATION_MS = 20_000;
export const ASSIGNMENT_RESPONSE_DURATION_MS = 15_000;

function attachCrewDialogue(state: PrivateRoomState, event: EventEntry): EventEntry {
  const living = Object.values(state.characters).filter(({ status }) => status === "alive").map(({ characterId }) => characterId).sort();
  // Leave an all-ghost crew quiet; the selector never invents living speakers
  // or makes a casualty comment as if that character survived.
  if (living.length === 0) return event;
  const participants = living;
  const recentExchanges = [...state.eventHistory.flatMap(({ crewDialogue }) => crewDialogue ? [crewDialogue] : []), ...(state.activeCrewDialogue ? [state.activeCrewDialogue] : [])].slice(-5);
  const crewDialogue = selectResolvedCrewDialogue(state.code, event, participants, recentExchanges);
  return crewDialogue ? { ...event, crewDialogue } : event;
}

export function initialCampaignState(): CampaignState {
  return { node: "shoreline-priority", radioRecovered: false, radioRepaired: false, shelterSecured: false, coveLocated: false, lookoutSent: false, flareConsumed: false, signalAttempted: false, signalFailed: false, signalPosition: "unselected", coveReached: false, storyFlags: [], decisionsSinceFoodTick: 0 };
}

export function shuffleDeck(cards: readonly DecisionCard[], random: RandomSource): DecisionCard[] {
  const result = [...cards];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1, random);
    [result[index], result[swapIndex]] = [result[swapIndex]!, result[index]!];
  }
  return result;
}

export function startGame(state: PrivateRoomState, now: number, deck: readonly DecisionCard[], random: RandomSource): PrivateRoomState {
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
    deck: [...deck],
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
    campaign: initialCampaignState(),
    desperation: initialDesperationState(),
    targetNominationsByPlayer: {},
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
  const crashEvent = attachCrewDialogue({ ...state, characters, players }, { id: `crash-rescue-${now}`, text: crashResolution.summary, createdAt: now, deathCharacterIds: [...crashResolution.eliminatedCharacterIds], socialCue: crashResolution.eliminatedCharacterIds.length ? "danger" : "success" });
  const eventHistory = [...state.eventHistory, crashEvent].slice(-20);
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
    activeCrewDialogue: undefined,
  };
}

export function beginDecision(state: PrivateRoomState, index: number, now: number): PrivateRoomState {
  const card = state.deck[index];
  if (!card) return enterEnding(state, now);
  const votingOpensAt = now;
  const phaseDeadlineAt = votingOpensAt + VOTING_DURATION_MS;
  const recentPromptDialogues = state.recentPromptDialogues ?? [];
  const activeCrewDialogue = selectDecisionPromptDialogue(state.code, card.id, Object.values(state.characters).filter(({ status }) => status === "alive").map(({ characterId }) => characterId), publicDialogueContext(state, card.id), recentPromptDialogues);
  return {
    ...state,
    revision: state.revision + 1,
    phase: "decision",
    phaseStartedAt: now,
    phaseDeadlineAt,
    votingOpensAt,
    earliestResolveAt: votingOpensAt,
    phaseEndsAt: phaseDeadlineAt,
    decisionIndex: index,
    currentDecisionId: card.id,
    votesByPlayer: {},
    eligibleVoterIds: Object.keys(state.players),
    resolvedOptionCounts: undefined,
    winningOptionId: undefined,
    assignmentNominationsByPlayer: {},
    targetNominationsByPlayer: {},
    pendingAssignment: undefined,
    activeCrewDialogue,
    recentPromptDialogues: [...recentPromptDialogues, ...(activeCrewDialogue ? [activeCrewDialogue] : [])].slice(-3),
  };
}

function beginAuthoredDecision(state: PrivateRoomState, card: DecisionCard, now: number): PrivateRoomState {
  return beginDecision({ ...state, deck: [card], decisionIndex: 0 }, 0, now);
}

export function beginNextCampaignStep(input: PrivateRoomState, now: number, random: RandomSource): PrivateRoomState {
  const campaign = input.campaign;
  if (!campaign || campaign.node === "motorboat") return beginNextMotorboatStep(input, now, random);
  if (campaign.node === "complete") return input;
  if (livingCharacterIds(input).length === 0) return enterNoSurvivors(input, now, "all-dead");
  input = prepareDesperation(input, now, random);
  if (input.desperation?.active?.kind === "group") return beginAuthoredDecision(input, createHungerCrisisCard(), now);
  if (input.pendingPrivateChoice?.kind === "night-hunger") return input;
  const startingItemIds = livingCharacterIds(input).flatMap((characterId) => {
    const itemId = input.characters[characterId]?.startingItemId;
    return itemId ? [itemId] : [];
  });
  const card = campaign.node === "bear-encounter" ? createBearEncounterCard(input) : createCampaignDecision({ campaign, startingItemIds });
  return card ? beginAuthoredDecision(input, card, now) : beginNextMotorboatStep(input, now, random);
}

export function beginNextMotorboatStep(input: PrivateRoomState, now: number, random: RandomSource): PrivateRoomState {
  let state = dropFuelFromDeadOwner(input);
  if (livingCharacterIds(state).length === 0) return enterNoSurvivors(state, now, "all-dead");
  const route = state.motorboat ?? initialMotorboatRoute();
  state = { ...state, motorboat: route };
  if (route.completion !== "active" || route.node === "terminal" || route.node === "complete") return state;
  state = prepareDesperation(state, now, random);
  if (state.desperation?.active?.kind === "group") return beginAuthoredDecision(state, createHungerCrisisCard(), now);
  if (state.pendingPrivateChoice?.kind === "night-hunger") return state;
  if (route.node === "discovery") return beginAuthoredDecision(state, createMotorboatDiscoveryCard(state.campaign), now);
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
  if (card.kind === "hunger-crisis") {
    const living = livingCharacterIds(state);
    const nominations: Record<string, number> = {};
    for (const [playerId, vote] of Object.entries(state.votesByPlayer)) {
      const target = state.targetNominationsByPlayer?.[playerId];
      if (vote === option.id && target) nominations[target] = (nominations[target] ?? 0) + 1;
    }
    const nominated = Object.keys(nominations).sort();
    const target = option.id === "attempt" && living.length >= 2 ? resolveWinningOption(nominations, nominated.length ? nominated : living, random) : undefined;
    return revealDesperation(state, now, random, { opportunityId: state.desperation?.active?.id ?? `hunger-${state.code}-${state.resolutionSequence ?? 0}`, kind: "group", action: option.id === "search" ? "search" : "attempt", targetCharacterId: target }, counts, card, option);
  }
  if (option.assignment) {
    const actor = resolveAssignedActor(state, winningOptionId, random);
    if (!actor) {
      if (card.id === "campaign-bear-encounter") {
        const fallback = { ...option.assignment.refusal.successOutcomes[0]!, text: "The chosen approach no longer has an equipped living hunter. The crew retreats and abandons some supplies." };
        return finalizeDecisionOutcome(state, now, random, card, option, fallback, counts);
      }
      return enterEnding(state, now);
    }
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
  if (!actorIsLiving || (option.assignment.requiredStartingItemId && actor?.startingItemId !== option.assignment.requiredStartingItemId)) {
    result = "actor-unavailable";
    outcomes = option.assignment.refusal.successOutcomes;
  } else if (pending.response === null) {
    result = "timeout-accepted";
    outcomes = option.outcomes;
  } else if (pending.response === "accept") {
    result = "accepted";
    outcomes = option.outcomes;
  } else if (didRefusalSucceed(option.assignment.refusal.successChanceBps, random) && (!option.outcomes.some(outcome => outcome.motorboatEffect?.type === "repair") || state.resources.shelter >= 15)) {
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
  const campaign = state.campaign;
  const successfulEscape = (outcome.campaignEffect?.type === "signal-attempt" && outcome.campaignEffect.result === "success")
    || (outcome.motorboatEffect?.type === "launch" && outcome.motorboatEffect.mode === "group" && outcome.motorboatEffect.result === "success");
  const foodTickDue = !campaign || campaign.decisionsSinceFoodTick >= CAMPAIGN_DECISIONS_PER_DAY - 1;
  const survival = foodTickDue && !successfulEscape
    ? applyDailySurvival(afterOutcome)
    : { state: afterOutcome, starvedCharacterIds: [], newlyGhostCharacterIds: [], starvationDamageByCharacterId: {} };
  let countedCampaignState = survival.state.campaign
    ? { ...survival.state, campaign: { ...survival.state.campaign, decisionsSinceFoodTick: foodTickDue ? 0 as const : (campaign!.decisionsSinceFoodTick + 1) as 1 | 2 } }
    : survival.state;
  const desperation = state.desperation ?? initialDesperationState();
  countedCampaignState = { ...countedCampaignState, desperation: { ...desperation,
    day: desperation.day + (foodTickDue && !successfulEscape ? 1 : 0),
    nightCheckDue: desperation.nightCheckDue || (foodTickDue && !successfulEscape),
    ordinaryDecisionsSinceGroup: desperation.ordinaryDecisionsSinceGroup + 1,
  } };
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
    .filter(({ status, resources }) => foodTickDue && status === "alive" && resources.food === 0)
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
  let campaignFacts: CampaignEventFacts | undefined;
  let routed: { state: PrivateRoomState; facts?: MotorboatEventFacts };
  if (livingCharacterIds(countedCampaignState).length === 0) {
    routed = { state: enterNoSurvivors(countedCampaignState, now, "all-dead"), facts: { node: "complete", endingCause: "all-dead" } };
  } else if (outcome.campaignEffect) {
    const campaignResult = applyCampaignEffect(countedCampaignState, outcome.campaignEffect, now);
    routed = { state: campaignResult.state };
    campaignFacts = campaignResult.facts;
  } else {
    routed = applyMotorboatEffect(countedCampaignState, outcome, assignment, now);
  }
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
  if (campaignFacts) resolution.campaign = campaignFacts;
  if (routed.facts?.endingCause === "storm-surge") {
    const stormDeaths = Object.values(survival.state.characters).flatMap((character) => character.status === "alive" && routed.state.characters[character.characterId]?.status === "ghost" ? [{ characterId: character.characterId, before:"alive" as const, after:"ghost" as const, cause:"storm-surge" as const }] : []);
    resolution.statusChanges.push(...stormDeaths);
    resolution.affectedCharacterIds = [...new Set([...resolution.affectedCharacterIds, ...stormDeaths.map(({characterId})=>characterId)])].sort();
  }
  const sequence = assignment ? (state.resolutionSequence ?? 0) : (state.resolutionSequence ?? 0) + 1;
  const resolvedEvent = {
    id: `event-${state.code}-${sequence}`, text, createdAt: now, decisionId: card.id, winningOptionId: option.id, outcomeId: outcome.id, socialCue,
    ...(deathCharacterIds.length > 0 ? { deathCharacterIds } : {}),
    ...(campaignFacts ? { campaign: campaignFacts } : {}),
    resolution,
  };
  const eventWithDialogue = attachCrewDialogue(routed.state, { ...resolvedEvent, deathCharacterIds });
  const eventHistory = [...routed.state.eventHistory, eventWithDialogue].slice(-20);
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
    activeCrewDialogue: undefined,
    pendingAssignment: undefined,
    assignmentNominationsByPlayer: {},
    resolutionSequence: sequence,
  };
  if (routed.state.phase === "ending") return { ...revealed, pendingPrivateChoice: undefined, desperation: revealed.desperation ? { ...revealed.desperation, active: undefined, nightCheckDue: false } : undefined, phase:"ending", phaseDeadlineAt:null, phaseEndsAt:null, currentDecisionId:null, endingId:routed.state.endingId, escapeResult:routed.state.escapeResult };
  return revealed;
}

function applyCampaignEffect(state: PrivateRoomState, effect: NonNullable<Outcome["campaignEffect"]>, now: number): { state: PrivateRoomState; facts: CampaignEventFacts } {
  const campaign = state.campaign;
  if (!campaign) return { state, facts: { node: "complete", choice: "legacy-no-campaign" } };
  const facts: CampaignEventFacts = {
    node: campaign.node,
    choice: effect.type === "shoreline" ? `shoreline-${effect.choice}`
      : effect.type === "preparation" ? `preparation-${effect.choice}`
      : effect.type === "route-choice" ? `route-${effect.route}` : effect.type === "signal-attempt" ? `signal-${effect.method}` : `story-${effect.choice}`,
    ...(effect.type === "signal-attempt" ? { result: effect.result } : {}),
  };
  const nextCampaign = nextCampaignNode(campaign, effect);
  let next: PrivateRoomState = { ...state, campaign: nextCampaign };
  if (effect.type === "signal-attempt" && effect.result === "success") {
    const escapedCharacterIds = livingCharacterIds(state);
    const deadCharacterIds = Object.values(state.characters).filter(({ status }) => status === "ghost").map(({ characterId }) => characterId).sort();
    next = {
      ...next,
      phase: "ending",
      phaseStartedAt: now,
      phaseDeadlineAt: null,
      votingOpensAt: null,
      earliestResolveAt: null,
      phaseEndsAt: null,
      currentDecisionId: null,
      endingId: "signal-rescue",
      campaign: { ...nextCampaign, node: "complete" },
      motorboat: { ...(state.motorboat ?? initialMotorboatRoute()), node: "complete", completion: "signal-rescue" },
      escapeResult: { type: "signal-rescue", escapedCharacterIds, strandedCharacterIds: [], deadCharacterIds, cause: "signal-rescue", epilogueId: "signal-rescue-aftermath-v1" },
    };
  }
  return { state: next, facts };
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
      return { state:{...state,phase:"ending",endingId:"group-escape",escapeResult,campaign:state.campaign?{...state.campaign,node:"complete"}:undefined,motorboat:{...route,node:"complete",fuelCharges,completion:"group-escape",activeOpportunityId:undefined}}, facts:{node:"complete",boatChange:"escaped",opportunityId,passengerCharacterIds:passengers,endingCause:"group-launch",fuelConsumed:true} };
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
  if (choice.kind === "night-hunger") {
    const request: DesperationRequest = { opportunityId: choice.id, kind: "night", action: optionId === "attempt-eat" ? "attempt" : "sleep", actorCharacterId: choice.actorCharacterId, targetCharacterId: choice.response?.targetCharacterId };
    if (request.action === "sleep") {
      const d = state.desperation ?? initialDesperationState();
      return beginNextCampaignStep({ ...state, phase: "reveal", pendingPrivateChoice: undefined, desperation: { ...d, active: undefined } }, now, random);
    }
    return revealDesperation(state, now, random, request);
  }
  const route=state.motorboat!;
  if (choice.kind === "fuel-discovery") {
    let fuelVisibility: "shared"|"known-private" = optionId === "share" ? "shared":"known-private";
    let fuelOwnerCharacterId = optionId === "share" ? undefined : choice.actorCharacterId;
    if (optionId === "transfer" && choice.response?.targetCharacterId && state.characters[choice.response.targetCharacterId]?.status === "alive") fuelOwnerCharacterId=choice.response.targetCharacterId;
    const sequence=(state.resolutionSequence??0)+1;
    const event=attachCrewDialogue(state,{id:`event-${state.code}-${sequence}`,text:optionId==="share"?"The fuel finder reveals the sealed can and adds it to the shared supplies.":"Someone quietly keeps the sealed fuel under private control.",createdAt:now,socialCue:optionId==="share"?"success":"neutral",motorboat:{node:"fuel-choice",boatChange:optionId==="share"?"fuel-shared":"fuel-kept-private",...(optionId==="share"?{actorCharacterId:choice.actorCharacterId}:{})}});
    const next={...state,revision:state.revision+1,pendingPrivateChoice:undefined,motorboat:{...route,node:"repair" as const,fuelVisibility,fuelOwnerCharacterId},resolutionSequence:sequence,eventHistory:[...state.eventHistory,event].slice(-20)};
    return beginNextMotorboatStep(next,now,random);
  }
  if (optionId === "wake") {
    const sequence=(state.resolutionSequence??0)+1;
    const next={...state,pendingPrivateChoice:undefined,resolutionSequence:sequence,eventHistory:[...state.eventHistory,attachCrewDialogue(state,{id:`event-${state.code}-${sequence}`,text:"The night-watch custodian wakes the crew for a launch vote.",createdAt:now,socialCue:"neutral",motorboat:{node:"launch",boatChange:"custodian-woke-group",opportunityId:route.activeOpportunityId}})].slice(-20),motorboat:{...route,node:"launch" as const,activeOpportunityId:route.activeOpportunityId}};
    return beginAuthoredDecision(next,createMotorboatGroupLaunchCard(route),now);
  }
  if (optionId === "solo") {
    const fuelCharges=Math.max(0,route.fuelCharges-1) as 0|1|2|3;
    const success=launchSucceeds(route.engine as "sturdy"|"fragile","solo",route.missedOpportunityIds.length,random);
    const sequence=(state.resolutionSequence??0)+1;
    if (success) { const escapeResult=createEscapeResult(state,"solo-escape",[choice.actorCharacterId]); const event=attachCrewDialogue(state,{id:`event-${state.code}-${sequence}`,text:"The custodian launches alone and escapes, leaving the crew behind.",createdAt:now,socialCue:"danger",motorboat:{node:"complete",boatChange:"escaped",opportunityId:route.activeOpportunityId,passengerCharacterIds:[choice.actorCharacterId],endingCause:"solo-launch",fuelConsumed:true}}); return {...state,revision:state.revision+1,phase:"ending",phaseStartedAt:now,phaseDeadlineAt:null,phaseEndsAt:null,votingOpensAt:null,earliestResolveAt:null,currentDecisionId:null,pendingPrivateChoice:undefined,pendingAssignment:undefined,desperation:state.desperation?{...state.desperation,active:undefined,nightCheckDue:false}:undefined,endingId:"solo-escape",escapeResult,campaign:state.campaign?{...state.campaign,node:"complete"}:undefined,eventHistory:[...state.eventHistory,event].slice(-20),resolutionSequence:sequence,motorboat:{...route,node:"complete",completion:"solo-escape",fuelCharges,activeOpportunityId:undefined}}; }
    const characters={...state.characters}; const actor=characters[choice.actorCharacterId]!; const health=Math.max(0,actor.resources.health-15); characters[choice.actorCharacterId]={...actor,status:health===0?"ghost":"alive",resources:{...actor.resources,health}}; const players={...state.players}; if(health===0) players[choice.actorPlayerId]={...players[choice.actorPlayerId]!,status:"ghost"};
    const missed=recordMiss({...route,fuelCharges},route.activeOpportunityId!); const stormVictims=Object.values(characters).filter(({status})=>status==="alive").map(({characterId})=>characterId); const event=attachCrewDialogue({...state,players,characters},{id:`event-${state.code}-${sequence}`,text:"A selfish solo launch fails in the surf. The would-be escapee limps back injured.",createdAt:now,socialCue:"danger",...(health===0||missed.terminal?{deathCharacterIds:[...new Set([...(health===0?[choice.actorCharacterId]:[]),...(missed.terminal?stormVictims:[])])]}:{}),motorboat:{node:missed.terminal?"terminal":"repair",boatChange:missed.terminal?"storm-destroyed":"solo-launch-failed",opportunityId:route.activeOpportunityId,passengerCharacterIds:[choice.actorCharacterId],missNumber:missed.route.missedOpportunityIds.length,fuelConsumed:true,...(missed.terminal?{endingCause:"storm-surge" as const,statusChanges:stormVictims.map((characterId)=>({characterId,before:"alive" as const,after:"ghost" as const,cause:"storm-surge" as const}))}:{})}}); const next={...state,players,characters,revision:state.revision+1,pendingPrivateChoice:undefined,motorboat:missed.route,eventHistory:[...state.eventHistory,event].slice(-20),resolutionSequence:sequence};
    if (missed.terminal) return stormEnding(next);
    return beginNextMotorboatStep(next,now,random);
  }
  const missed=recordMiss(route,route.activeOpportunityId!); const sequence=(state.resolutionSequence??0)+1; const stormVictims=livingCharacterIds(state); const event=attachCrewDialogue(state,{id:`event-${state.code}-${sequence}`,text:"The custodian keeps quiet. The launch window closes while everyone else sleeps.",createdAt:now,socialCue:"setback",...(missed.terminal?{deathCharacterIds:stormVictims}:{}),motorboat:{node:missed.terminal?"terminal":"repair",boatChange:missed.terminal?"storm-destroyed":"quiet-miss",opportunityId:route.activeOpportunityId,missNumber:missed.route.missedOpportunityIds.length,...(missed.terminal?{endingCause:"storm-surge" as const,statusChanges:stormVictims.map((characterId)=>({characterId,before:"alive" as const,after:"ghost" as const,cause:"storm-surge" as const}))}:{})}}); const next={...state,revision:state.revision+1,pendingPrivateChoice:undefined,motorboat:missed.route,eventHistory:[...state.eventHistory,event].slice(-20),resolutionSequence:sequence};
  if (missed.terminal) return stormEnding(next);
  return beginNextMotorboatStep(next,now,random);
}

function revealDesperation(state: PrivateRoomState, now: number, random: RandomSource, request: DesperationRequest, counts: Record<string, number> = {}, card?: DecisionCard, option?: DecisionOption): PrivateRoomState {
  const resolved = resolveDesperation(state, request, random);
  const sequence = (state.resolutionSequence ?? 0) + 1;
  const d = state.desperation ?? initialDesperationState();
  const next = dropFuelFromDeadOwner({ ...resolved.state, desperation: { ...d, active: undefined, ...(request.action === "attempt" && request.kind === "group" ? { lastAttemptDay: d.day } : {}) } });
  const deaths = resolved.statusChanges.map(change => change.characterId);
  const cue = deaths.length || resolved.resourceChanges.some(change => change.resource === "health" && change.delta < 0) ? "danger" : request.action === "attempt" ? "setback" : resolved.facts.outcomeId === "food-found" ? "success" : "setback";
  const event: EventEntry = {
    id: `event-${state.code}-${sequence}`, text: resolved.text.slice(0, 280), createdAt: now,
    decisionId: card?.id ?? "camp-night-hunger", winningOptionId: option?.id ?? "attempt-eat", outcomeId: resolved.facts.outcomeId,
    socialCue: cue, deathCharacterIds: deaths, desperation: resolved.facts,
    resolution: { decisionId: card?.id ?? "camp-night-hunger", prompt: card?.prompt ?? "The crew settles down to sleep at camp.",
      winningOptionId: option?.id ?? "attempt-eat", winningOptionLabel: option?.label ?? "Try to eat someone", outcomeId: resolved.facts.outcomeId, outcomeText: resolved.text,
      optionResults: card?.options.map(o => ({ optionId: o.id, label: o.label, votes: counts[o.id] ?? 0 })) ?? [],
      resourceChanges: resolved.resourceChanges, statusChanges: resolved.statusChanges,
      affectedCharacterIds: [...new Set([...resolved.resourceChanges.flatMap(change => change.scope === "character" ? [change.characterId] : []), ...deaths])], presentationCue: cue, desperation: resolved.facts },
  };
  const revealed: PrivateRoomState = { ...next, revision: state.revision + 1, phase: "reveal", phaseStartedAt: now, phaseDeadlineAt: now + REVEAL_DURATION_MS, phaseEndsAt: now + REVEAL_DURATION_MS, votingOpensAt: null, earliestResolveAt: null,
    resolvedOptionCounts: counts, winningOptionId: option?.id ?? "attempt-eat", currentDecisionId: card?.id ?? null, resolutionSequence: sequence,
    pendingPrivateChoice: undefined, pendingAssignment: undefined, activeCrewDialogue: undefined, targetNominationsByPlayer: {},
    eventHistory: [...next.eventHistory, attachCrewDialogue(next, event)].slice(-20) };
  return livingCharacterIds(revealed).length ? revealed : enterNoSurvivors(revealed, now, "all-dead");
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
  return {...state, pendingPrivateChoice:undefined, pendingAssignment:undefined, desperation:state.desperation ? {...state.desperation,active:undefined,nightCheckDue:false}:undefined,revision:state.revision+1,phase:"ending",phaseStartedAt:now,phaseDeadlineAt:null,phaseEndsAt:null,votingOpensAt:null,earliestResolveAt:null,currentDecisionId:null,endingId:"no-survivors",campaign:state.campaign?{...state.campaign,node:"complete"}:undefined,escapeResult:{type:"no-survivors",escapedCharacterIds:[],strandedCharacterIds:[],deadCharacterIds:dead,cause,epilogueId:cause==="storm-surge"?"motorboat-storm-aftermath-v1":"motorboat-all-dead-aftermath-v1"},motorboat:{...(state.motorboat??initialMotorboatRoute()),node:"complete",completion:"no-survivors"}};
}

export function enterEnding(state: PrivateRoomState, now: number): PrivateRoomState {
  return {
    ...state,
    pendingPrivateChoice: undefined, pendingAssignment: undefined,
    desperation: state.desperation ? { ...state.desperation, active: undefined, nightCheckDue: false } : undefined,
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
  if (state.phase === "crashResolution") return state.campaign
    ? beginNextCampaignStep({ ...state, motorboat: state.motorboat ?? initialMotorboatRoute() }, now, random)
    : beginNextMotorboatStep({ ...state, motorboat: state.motorboat ?? initialMotorboatRoute() }, now, random);
  if (state.phase === "decision") return resolveCurrentDecision(state, now, random);
  if (state.phase === "assignmentResponse") return resolvePendingAssignment(state, now, random);
  if (state.phase === "privateChoice") return resolvePendingPrivateChoice(state, now, random);
  if (state.phase === "reveal" && state.campaign) return beginNextCampaignStep(state, now, random);
  if (state.phase === "reveal" && state.motorboat) return beginNextMotorboatStep(state, now, random);
  if (state.phase === "reveal") return beginDecision(state, state.decisionIndex + 1, now);
  return state;
}
