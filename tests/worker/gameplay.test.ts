import { describe, expect, it } from "vitest";

import { DECISION_CARDS } from "../../src/shared/content/decisionCards";
import type { CampaignState, Player, PrivateRoomState } from "../../src/shared/domain";
import { createSignalAttemptCard } from "../../src/shared/content/campaignRoute";
import { initialMotorboatRoute } from "../../src/shared/rules/motorboat";
import { toPublicSnapshot } from "../../src/shared/protocol";
import { sequenceRandom } from "../../src/shared/rules/random";
import { advancePhase, beginDecision, beginNextMotorboatStep, deriveEndingId, initialCampaignState, resolveCrashChoices, resolveCurrentDecision, resolveDecisionVote, resolvePendingAssignment, startGame } from "../../src/shared/rules/stateMachine";

function player(id: string, characterId: string, joinedAt: number): Player {
  return { id, displayName: id, status: "alive", characterId, ready: true, connected: true, joinedAt };
}

function lobby(): PrivateRoomState {
  return {
    code: "ABC234", revision: 0, phase: "lobby", createdAt: 0, lastActivityAt: 0, hostPlayerId: "p_a",
    phaseStartedAt: 0, phaseDeadlineAt: null, votingOpensAt: null, earliestResolveAt: null, phaseEndsAt: null,
    players: { p_a: player("p_a", "cast-daniel", 1), p_b: player("p_b", "cast-samantha", 2), p_c: player("p_c", "cast-jim-young", 3) },
    characters: {
      "cast-daniel": { characterId: "cast-daniel", status: "alive", resources: { food: 50, health: 100, morale: 65, water: 50 } },
      "cast-samantha": { characterId: "cast-samantha", status: "alive", resources: { food: 50, health: 100, morale: 65, water: 50 } },
      "cast-jim-young": { characterId: "cast-jim-young", status: "alive", resources: { food: 50, health: 100, morale: 65, water: 50 } },
    },
    resources: { shelter: 50 }, deck: [], decisionIndex: 0,
    currentDecisionId: null, votesByPlayer: {}, eligibleVoterIds: [], eventHistory: [],
  };
}

describe("authoritative game progression", () => {
  it("starts with a synchronized intro and exact decision windows", () => {
    const started = startGame(lobby(), 10_000, DECISION_CARDS, sequenceRandom(Array(40).fill(0)));
    expect(started.phase).toBe("intro");
    expect(started.phaseDeadlineAt).toBe(40_000);
    const decision = beginDecision(started, 0, 40_000);
    expect(decision.votingOpensAt).toBe(40_000);
    expect(decision.earliestResolveAt).toBe(40_000);
    expect(decision.phaseDeadlineAt).toBe(80_000);
  });

  it("persists the chosen item and resolves duplicate rescue targets before the ten group decisions", () => {
    const started = startGame(lobby(), 10_000, DECISION_CARDS, sequenceRandom(Array(40).fill(0)));
    expect(Object.values(started.crashItemOffersByPlayer ?? {}).every((offer) => offer.length === 3 && new Set(offer).size === 3)).toBe(true);
    const itemIds = Object.fromEntries(Object.entries(started.crashItemOffersByPlayer ?? {}).map(([id, offer]) => [id, offer[0]! ]));
    const rescuing = {
      ...started,
      phase: "crashRescueChoice" as const,
      crashItemsByPlayer: itemIds,
      rescueTargetsByPlayer: { p_a: "cast-samantha", p_b: "cast-samantha" },
    };
    const resolved = resolveCrashChoices(rescuing, 70_000, sequenceRandom([0.1, 0.2]));
    expect(resolved.phase).toBe("crashResolution");
    expect(resolved.crashResolution?.attempts).toHaveLength(2);
    expect(resolved.crashResolution?.savedCharacterIds.filter((id) => id === "cast-samantha")).toHaveLength(1);
    expect(resolved.characters["cast-daniel"]?.startingItemId).toBe(itemIds.p_a);
    expect(resolved.characters["cast-samantha"]?.startingItemId).toBe(itemIds.p_b);
    const firstDecision = advancePhase(resolved, resolved.phaseDeadlineAt!, sequenceRandom([]));
    expect(firstDecision.phase).toBe("decision");
    expect(firstDecision.decisionIndex).toBe(0);
  });

  it("turns an opening-rescue casualty into a voting ghost immediately", () => {
    const started = startGame(lobby(), 10_000, DECISION_CARDS, sequenceRandom(Array(40).fill(0)));
    const itemIds = Object.fromEntries(Object.entries(started.crashItemOffersByPlayer ?? {}).map(([id, offer]) => [id, offer[0]! ]));
    const resolved = resolveCrashChoices({
      ...started,
      phase: "crashRescueChoice",
      crashItemsByPlayer: itemIds,
      rescueTargetsByPlayer: { p_a: "cast-samantha" },
    }, 70_000, sequenceRandom([0.6, 0.8]));
    expect(resolved.players.p_a?.status).toBe("ghost");
    expect(resolved.characters["cast-daniel"]?.status).toBe("ghost");
    expect(resolved.characters["cast-daniel"]?.resources.health).toBe(0);
    expect(resolved.eligibleVoterIds).toContain("p_a");
  });

  it("shows live group ballots and reveals aggregate totals after resolution", () => {
    const base = { ...lobby(), deck: [DECISION_CARDS[2]!], phase: "decision" as const, currentDecisionId: DECISION_CARDS[2]!.id, votingOpensAt: 0, earliestResolveAt: 0, phaseDeadlineAt: 40_000, phaseEndsAt: 40_000, eligibleVoterIds: ["p_a", "p_b", "p_c"] };
    const [a, b] = DECISION_CARDS[2]!.options;
    base.votesByPlayer = { p_a: b!.id, p_b: a!.id, p_c: b!.id };
    base.votesByPlayer.p_a = a!.id;
    const privateSnapshot = toPublicSnapshot(base, "p_a");
    expect(privateSnapshot.viewer.hasVoted).toBe(true);
    expect(privateSnapshot).not.toHaveProperty("resolvedOptionCounts");
    expect(privateSnapshot.liveVotes).toEqual([
      { playerId: "p_a", optionId: a!.id },
      { playerId: "p_b", optionId: a!.id },
      { playerId: "p_c", optionId: b!.id },
    ]);
    expect(JSON.stringify(privateSnapshot)).not.toContain("votesByPlayer");

    const revealed = resolveCurrentDecision(base, 12_000, sequenceRandom([0]));
    expect(revealed.winningOptionId).toBe(a!.id);
    expect(revealed.resolvedOptionCounts).toMatchObject({ [a!.id]: 2, [b!.id]: 1 });
    const publicReveal = toPublicSnapshot(revealed, "p_b");
    expect(publicReveal.resolvedOptionCounts).toEqual(revealed.resolvedOptionCounts);
    expect(publicReveal).not.toHaveProperty("liveVotes");
    expect(JSON.stringify(publicReveal)).not.toContain("p_a\":\"");
  });

  it("persists the same contextual exchange in each reveal snapshot and clears the prompt", () => {
    const cast = ["cast-daniel", "cast-samantha", "cast-jim-young", "cast-tim", "cast-walter", "cast-jessica-adlock", "cast-jorge"];
    const players = Object.fromEntries(cast.map((characterId, index) => [`p_${index}`, player(`p_${index}`, characterId, index)]));
    const characters = Object.fromEntries(cast.map((characterId) => [characterId, { characterId, status: "alive" as const, resources: { food: 50, health: 100, morale: 65, water: 50 } }]));
    const option = { id: "build-cover", label: "Secure shelter", outcomes: [{ id: "cover-secured", text: "The crew reaches cover above the tide.", weight: 1, resourceDeltas: { shelter: 10 } }] };
    const base: PrivateRoomState = {
      ...lobby(), players, characters,
      phase: "decision", deck: [{ id: "campaign-shelter-reinforcement", prompt: "Where will the crew sleep?", options: [option, { id: "wait", label: "Wait", outcomes: [{ id: "waited", text: "The crew waits.", weight: 1 }] }] }],
      currentDecisionId: "campaign-shelter-reinforcement", eligibleVoterIds: Object.keys(players), votesByPlayer: Object.fromEntries(Object.keys(players).map((id) => [id, option.id])),
      votingOpensAt: 0, earliestResolveAt: 0, phaseDeadlineAt: 40_000, phaseEndsAt: 40_000,
    };
    const opening = beginDecision(base, 0, 0);
    expect(opening.activeCrewDialogue?.lines).toHaveLength(2);
    const resolved = resolveCurrentDecision(opening, 1, sequenceRandom(Array(100).fill(0)));
    expect(resolved.activeCrewDialogue).toBeUndefined();
    expect(resolved.eventHistory.at(-1)?.crewDialogue?.templateId).toBe("shelter-ready-product-scope-v1");
    const firstClient = toPublicSnapshot(resolved, "p_0");
    const secondClient = toPublicSnapshot(resolved, "p_1");
    expect(firstClient.eventHistory.at(-1)?.crewDialogue).toEqual(secondClient.eventHistory.at(-1)?.crewDialogue);
  });

  it("derives the persisted route ending instead of aggregate resource bands", () => {
    const state = lobby();
    expect(deriveEndingId(state)).toBe("no-survivors");
    state.escapeResult = {type:"solo-escape",escapedCharacterIds:["cast-daniel"],strandedCharacterIds:["cast-samantha"],deadCharacterIds:[],cause:"solo-launch",epilogueId:"motorboat-selfish-aftermath-v1"};
    expect(deriveEndingId(state)).toBe("solo-escape");
  });

  it("starts the authored campaign at the shoreline decision", () => {
    const random = sequenceRandom(Array(2_000).fill(0.1));
    let state = startGame(lobby(), 0, DECISION_CARDS, sequenceRandom(Array(100).fill(0.1)));
    state = advancePhase(state, state.phaseDeadlineAt!, random);
    state = advancePhase(state, state.phaseDeadlineAt!, random);
    state = advancePhase(state, state.phaseDeadlineAt!, random);
    state = advancePhase(state, state.phaseDeadlineAt!, random);
    expect(state.phase).toBe("decision");
    expect(state.currentDecisionId).toBe("campaign-shoreline-priority");
  });

  it("routes a failed signal through the coast to the motorboat and exposes the storm recovery decision", () => {
    const campaign: CampaignState = {
      ...initialCampaignState(), node: "signal-attempt", signalPosition: "low",
      storyFlags: ["storm-gust"], signalAttempted: false, signalFailed: false,
      flareConsumed: true, decisionsSinceFoodTick: 0,
    };
    const signalCard = createSignalAttemptCard(campaign, false);
    const signalOption = signalCard.options.find(({ id }) => id === "smoke-beacon")!;
    let state = beginDecision({
      ...lobby(), campaign, motorboat: initialMotorboatRoute(),
      deck: [signalCard], currentDecisionId: signalCard.id, decisionIndex: 0,
      votesByPlayer: Object.fromEntries(Object.keys(lobby().players).map((id) => [id, signalOption.id])),
      eligibleVoterIds: Object.keys(lobby().players),
    }, 0, 0);

    state = resolveCurrentDecision(state, 1, sequenceRandom([0.999]));
    expect(state.campaign).toMatchObject({ node: "coastal-expedition", signalAttempted: true, signalFailed: true });
    expect(state.eventHistory.at(-1)).toMatchObject({ outcomeId: "smoke-beacon-failure", crewDialogue: { lines: expect.any(Array) } });

    state = advancePhase(state, state.phaseDeadlineAt!, sequenceRandom([0]));
    expect(state.currentDecisionId).toBe("campaign-coastal-expedition");
    expect(state.deck[0]?.prompt).toContain("The signal failed");
    const coastOption = state.deck[0]!.options.find(({ id }) => id === "follow-tide-marks")!;
    state = resolveCurrentDecision({ ...state, votesByPlayer: Object.fromEntries(Object.keys(state.players).map((id) => [id, coastOption.id])) }, state.phaseStartedAt! + 1, sequenceRandom([0]));

    state = advancePhase(state, state.phaseDeadlineAt!, sequenceRandom([0]));
    expect(state.currentDecisionId).toBe("campaign-coastal-hazard");
    const descentOption = state.deck[0]!.options[0]!;
    state = resolveCurrentDecision({ ...state, votesByPlayer: Object.fromEntries(Object.keys(state.players).map((id) => [id, descentOption.id])) }, state.phaseStartedAt! + 1, sequenceRandom([0]));

    state = advancePhase(state, state.phaseDeadlineAt!, sequenceRandom([0]));
    expect(state.currentDecisionId).toBe("motorboat-discovery");
    expect(state.campaign?.node).toBe("motorboat");

    const recovery = beginNextMotorboatStep({
      ...state,
      phase: "reveal",
      currentDecisionId: null,
      campaign: { ...state.campaign!, node: "complete" },
      motorboat: { ...state.motorboat!, node: "repair", discovered: true, warningLevel: 1, missedOpportunityIds: ["missed-test-window"] },
    }, state.phaseStartedAt! + 2, sequenceRandom([0]));
    expect(recovery.currentDecisionId).toBe("motorboat-recovery");
    expect(recovery.deck[0]?.prompt).toContain("The last launch failed and the storm is closer");
  });

  it("consumes one day of food after a decision and starvation death becomes a recorded ghost", () => {
    const base = lobby();
    base.phase = "decision";
    base.deck = [{ id: "test-card", prompt: "Choose.", options: [
      { id: "test-a", label: "A", outcomes: [{ id: "outcome-a", text: "The day passes.", weight: 1 }] },
      { id: "test-b", label: "B", outcomes: [{ id: "outcome-b", text: "The day also passes.", weight: 1 }] },
    ] }];
    base.currentDecisionId = "test-card";
    base.eligibleVoterIds = Object.keys(base.players);
    base.votingOpensAt = 0;
    base.earliestResolveAt = 0;
    base.phaseDeadlineAt = 10_000;
    base.phaseEndsAt = 10_000;
    base.characters["cast-daniel"]!.resources = { food: 0, health: 20, morale: 65, water: 50 };
    base.characters["cast-samantha"]!.resources = { food: 10, health: 100, morale: 65, water: 50 };
    const option = base.deck[0]!.options[0]!;
    base.votesByPlayer = Object.fromEntries(Object.keys(base.players).map((playerId) => [playerId, option.id]));

    const resolved = resolveCurrentDecision(base, 5_000, sequenceRandom([0, 0]));
    expect(resolved.characters["cast-daniel"]?.resources).toMatchObject({ food: 0, health: 0 });
    expect(resolved.characters["cast-daniel"]?.status).toBe("ghost");
    expect(resolved.players.p_a?.status).toBe("ghost");
    expect(resolved.eligibleVoterIds).toContain("p_a");
    expect(resolved.characters["cast-samantha"]?.resources).toMatchObject({ food: 0, health: 100 });
    expect(resolved.eventHistory.at(-1)?.deathCharacterIds).toContain("cast-daniel");
    expect(resolved.eventHistory.at(-1)).toMatchObject({ decisionId: "test-card", winningOptionId: "test-a", outcomeId: "outcome-a", socialCue: "danger" });
    expect(resolved.eventHistory.at(-1)?.resolution).toMatchObject({
      decisionId: "test-card",
      winningOptionId: "test-a",
      outcomeId: "outcome-a",
      optionResults: [{ optionId: "test-a", label: "A", votes: 3 }, { optionId: "test-b", label: "B", votes: 0 }],
      statusChanges: [{ characterId: "cast-daniel", before: "alive", after: "ghost", cause: "starvation" }],
      presentationCue: "danger",
    });
    expect(resolved.eventHistory.at(-1)?.resolution?.resourceChanges).toEqual(expect.arrayContaining([
      { scope: "character", characterId: "cast-daniel", resource: "health", before: 20, after: 0, delta: -20, cause: "starvation" },
      { scope: "character", characterId: "cast-samantha", resource: "food", before: 10, after: 0, delta: -10, cause: "daily-consumption" },
    ]));
    expect(resolved.eventHistory.at(-1)?.text).toContain("Starvation");
    expect(resolved.eventHistory.at(-1)?.text).toContain("Samantha is starving; each further foodless day costs up to 20 health.");
  });

  it("reports both the crew's selected shelter plan and the consequence that followed", () => {
    const base = lobby();
    const shelterCard = DECISION_CARDS.find(({ id }) => id === "shelter-politics")!;
    base.phase = "decision";
    base.deck = [shelterCard];
    base.currentDecisionId = shelterCard.id;
    base.eligibleVoterIds = Object.keys(base.players);
    const option = shelterCard.options[0]!;
    base.votesByPlayer = Object.fromEntries(Object.keys(base.players).map((playerId) => [playerId, option.id]));
    const resolved = resolveCurrentDecision(base, 5_000, sequenceRandom([0]));
    expect(resolved.eventHistory.at(-1)?.text).toContain("The crew chose “Build by the beach.”");
    expect(resolved.eventHistory.at(-1)?.text).toContain("The beach shelter goes up with an ocean view");
    expect(resolved.resources.shelter).toBe(55);
    expect(resolved.eventHistory.at(-1)?.resolution?.resourceChanges).toContainEqual({ scope: "crew", resource: "shelter", before: 50, after: 55, delta: 5, cause: "outcome" });
  });

  it("does not apply the same resolved event twice", () => {
    const base = lobby();
    const card = DECISION_CARDS[0]!;
    base.phase = "decision";
    base.deck = [card];
    base.currentDecisionId = card.id;
    base.eligibleVoterIds = Object.keys(base.players);
    base.votesByPlayer = Object.fromEntries(Object.keys(base.players).map((playerId) => [playerId, card.options[0]!.id]));
    const resolved = resolveCurrentDecision(base, 5_000, sequenceRandom([0]));
    expect(resolveCurrentDecision(resolved, 6_000, sequenceRandom([0]))).toBe(resolved);
  });

  it("reports the actual starvation damage and singular death state", () => {
    const base = lobby();
    base.phase = "decision";
    base.deck = [{ id: "test-card", prompt: "Choose.", options: [
      { id: "test-a", label: "A", outcomes: [{ id: "outcome-a", text: "The day passes.", weight: 1 }] },
    ] }];
    base.currentDecisionId = "test-card";
    base.eligibleVoterIds = Object.keys(base.players);
    base.characters["cast-daniel"]!.resources = { food: 0, health: 5, morale: 65, water: 50 };
    base.votesByPlayer = Object.fromEntries(Object.keys(base.players).map((playerId) => [playerId, "test-a"]));
    const resolved = resolveCurrentDecision(base, 5_000, sequenceRandom([0]));
    expect(resolved.eventHistory.at(-1)?.text).toContain("Starvation costs Daniel 5 health.");
    expect(resolved.eventHistory.at(-1)?.text).toContain("Daniel becomes a ghost.");
    expect(resolved.characters["cast-daniel"]?.resources.health).toBe(0);
  });

  it("commits an assigned actor before applying consequences, then accepts exactly once", () => {
    const base = lobby();
    base.phase = "decision";
    base.currentDecisionId = "assigned-cave";
    base.deck = [{ id: "assigned-cave", prompt: "Who enters?", options: [
      { id: "send", label: "Send one volunteer", outcomes: [{ id: "bats", text: "Bats object.", weight: 1, effectTarget: "assigned-actor", resourceDeltas: { health: -10 } }], assignment: { roleLabel: "enter the cave", actorSelection: "group-nominated-living", refusal: { successChanceBps: 3_500, qualitativeRisk: "risky", successOutcomes: [{ id: "sealed", text: "The cave is sealed.", weight: 1, resourceDeltas: { shelter: -5 } }] } } },
      { id: "wait", label: "Wait", outcomes: [{ id: "waited", text: "They wait.", weight: 1 }] },
    ] }];
    base.votesByPlayer = { p_a: "send", p_b: "send", p_c: "wait" };
    base.assignmentNominationsByPlayer = { p_a: "cast-samantha", p_b: "cast-samantha" };
    const pending = resolveDecisionVote(base, 1_000, sequenceRandom([]));
    expect(pending.phase).toBe("assignmentResponse");
    expect(pending.pendingAssignment).toMatchObject({ actorCharacterId: "cast-samantha", actorPlayerId: "p_b", deadlineAt: 16_000 });
    expect(pending.characters["cast-samantha"]?.resources.health).toBe(100);
    expect(pending.eventHistory).toHaveLength(0);

    pending.pendingAssignment!.response = "accept";
    const resolved = resolvePendingAssignment(pending, 2_000, sequenceRandom([0]));
    expect(resolved.phase).toBe("reveal");
    expect(resolved.characters["cast-samantha"]?.resources).toMatchObject({ health: 90, food: 40 });
    expect(resolved.characters["cast-daniel"]?.resources.health).toBe(100);
    expect(resolved.eventHistory.at(-1)?.resolution?.assignment?.result).toBe("accepted");
    expect(resolvePendingAssignment(resolved, 3_000, sequenceRandom([]))).toBe(resolved);
  });

  it("resolves timeout, successful refusal, failed refusal, and invalid actor through one authored branch", () => {
    const makePending = () => {
      const base = lobby();
      base.phase = "decision";
      base.currentDecisionId = "assigned-cave";
      base.deck = [{ id: "assigned-cave", prompt: "Who enters?", options: [
        { id: "send", label: "Send", outcomes: [{ id: "entered", text: "Entered.", weight: 1, effectTarget: "assigned-actor", resourceDeltas: { health: -10 } }], assignment: { roleLabel: "enter", actorSelection: "group-nominated-living", refusal: { successChanceBps: 3_500, qualitativeRisk: "risky", successOutcomes: [{ id: "sealed", text: "Sealed.", weight: 1, resourceDeltas: { shelter: -5 } }] } } },
      ] }];
      base.votesByPlayer = { p_a: "send" };
      base.assignmentNominationsByPlayer = { p_a: "cast-daniel" };
      return resolveDecisionVote(base, 1_000, sequenceRandom([]));
    };
    const timeout = resolvePendingAssignment(makePending(), 16_000, sequenceRandom([0]));
    expect(timeout.eventHistory.at(-1)?.resolution?.assignment?.result).toBe("timeout-accepted");
    expect(timeout.characters["cast-daniel"]?.resources.health).toBe(90);

    const refusing = makePending();
    refusing.pendingAssignment!.response = "try-refuse";
    const success = resolvePendingAssignment(refusing, 2_000, sequenceRandom([0.3499, 0]));
    expect(success.eventHistory.at(-1)?.resolution?.assignment?.result).toBe("refusal-succeeded");
    expect(success.resources.shelter).toBe(45);
    expect(success.characters["cast-daniel"]?.resources.health).toBe(100);

    const failing = makePending();
    failing.pendingAssignment!.response = "try-refuse";
    const failure = resolvePendingAssignment(failing, 2_000, sequenceRandom([0.35, 0]));
    expect(failure.eventHistory.at(-1)?.resolution?.assignment?.result).toBe("refusal-failed");
    expect(failure.characters["cast-daniel"]?.resources.health).toBe(90);

    const invalid = makePending();
    invalid.characters["cast-daniel"] = { ...invalid.characters["cast-daniel"]!, status: "ghost" };
    invalid.players.p_a = { ...invalid.players.p_a!, status: "ghost" };
    const fallback = resolvePendingAssignment(invalid, 2_000, sequenceRandom([0]));
    expect(fallback.eventHistory.at(-1)?.resolution?.assignment?.result).toBe("actor-unavailable");
    expect(fallback.resources.shelter).toBe(45);
  });
});
