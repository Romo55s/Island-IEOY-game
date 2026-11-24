import { describe, expect, it } from "vitest";

import type { CampaignState, DecisionCard, PrivateRoomState } from "../../src/shared/domain";
import { createCampaignDecision, createCaveExpeditionCard, createCoastalHazardCard, createFreshwaterRunCard, createSignalAttemptCard, createSignalWindowCard, createStormWarningCard, nextCampaignNode } from "../../src/shared/content/campaignRoute";
import { createMotorboatDiscoveryCard, createMotorboatGroupLaunchCard } from "../../src/shared/content/motorboatRoute";
import { getStoryMapGraph } from "../../src/game/storyMap/storyMapData";
import { initialMotorboatRoute } from "../../src/shared/rules/motorboat";
import { beginNextCampaignStep, initialCampaignState, resolveCurrentDecision } from "../../src/shared/rules/stateMachine";

const successRandom = { next: () => 0 };

function campaignRoom(): PrivateRoomState {
  const ids = ["cast-daniel", "cast-samantha"];
  const players = Object.fromEntries(ids.map((characterId, index) => {
    const id = `p_${index}`;
    return [id, { id, displayName: `Player ${index}`, status: "alive" as const, characterId, ready: true, connected: true, joinedAt: index }];
  }));
  const characters = Object.fromEntries(ids.map((characterId) => [characterId, {
    characterId, status: "alive" as const, resources: { food: 50, health: 100, morale: 65, water: 50 },
  }]));
  return {
    code: "ABC234", revision: 0, phase: "reveal", createdAt: 0, lastActivityAt: 0, hostPlayerId: "p_0",
    phaseStartedAt: 0, phaseDeadlineAt: 0, votingOpensAt: null, earliestResolveAt: null, phaseEndsAt: 0,
    players, characters, resources: { shelter: 50 }, deck: [], decisionIndex: 0, currentDecisionId: null,
    votesByPlayer: {}, eligibleVoterIds: ["p_0", "p_1"], eventHistory: [], campaign: initialCampaignState(),
    motorboat: initialMotorboatRoute(), resolutionSequence: 0,
  };
}

function beginWithCard(state: PrivateRoomState, card: DecisionCard, optionId: string): PrivateRoomState {
  const decision = { ...state, deck: [card], decisionIndex: 0, currentDecisionId: card.id, phase: "decision" as const, phaseStartedAt: 0, phaseDeadlineAt: 40_000, votingOpensAt: 0, earliestResolveAt: 0, phaseEndsAt: 40_000, votesByPlayer: { p_0: optionId, p_1: optionId } };
  return decision;
}

describe("campaign coherence", () => {
  it("keeps a successful signal rescue terminal when the scheduled food tick would starve the crew", () => {
    const state = campaignRoom();
    state.campaign = { ...initialCampaignState(), node: "signal-attempt", decisionsSinceFoodTick: 2 };
    for (const character of Object.values(state.characters)) character.resources = { ...character.resources, food: 0, health: 10 };
    const started = beginNextCampaignStep(state, 0, successRandom);
    const resolved = resolveCurrentDecision(beginWithCard(started, started.deck[0]!, "smoke-beacon"), 1, successRandom);
    expect(resolved.phase).toBe("ending");
    expect(resolved.endingId).toBe("signal-rescue");
    expect(resolved.escapeResult?.escapedCharacterIds).toHaveLength(2);
    expect(Object.values(resolved.characters).every(({ status, resources }) => status === "alive" && resources.health === 10)).toBe(true);
  });

  it("keeps successful group launch terminal before the unrelated daily starvation tick", () => {
    const state = campaignRoom();
    state.campaign = { ...initialCampaignState(), node: "motorboat", decisionsSinceFoodTick: 2 };
    state.motorboat = { ...initialMotorboatRoute(), node: "launch", discovered: true, hull: "sound", engine: "sturdy" };
    for (const character of Object.values(state.characters)) character.resources = { ...character.resources, food: 0, health: 10 };
    const card = createMotorboatGroupLaunchCard(state.motorboat);
    const resolved = resolveCurrentDecision(beginWithCard(state, card, "launch-together"), 1, successRandom);
    expect(resolved.phase).toBe("ending");
    expect(resolved.endingId).toBe("group-escape");
    expect(resolved.escapeResult?.escapedCharacterIds).toHaveLength(2);
    expect(Object.values(resolved.characters).every(({ status, resources }) => status === "alive" && resources.health === 10)).toBe(true);
  });

  it("does not describe coastal knowledge as current signal position", () => {
    let campaign: CampaignState = { ...initialCampaignState(), storyFlags: ["coast-route-marked"] };
    const approach = createCampaignDecision({ campaign: { ...campaign, node: "signal-approach" }, startingItemIds: [] })!;
    const effect = approach.options.find(({ id }) => id === "use-low-path")!.outcomes[0]!.campaignEffect!;
    campaign = nextCampaignNode({ ...campaign, node: "signal-approach" }, effect);
    expect(campaign.signalPosition).toBe("low");
    expect(createSignalWindowCard(campaign).prompt).not.toContain("From the ridge");
    expect(createSignalAttemptCard(campaign, false).options[0]!.outcomes[0]!.weight).toBe(40);
  });

  it("uses truthful state-dependent copy for water, shelter, injury and cove arrival", () => {
    const rain = createFreshwaterRunCard(initialCampaignState()).options.find(({ id }) => id === "collect-rain")!.outcomes[0]!.campaignEffect!;
    const wetCamp = nextCampaignNode(initialCampaignState(), rain);
    expect(createCaveExpeditionCard(wetCamp).prompt).not.toContain("spring trail");
    expect(createStormWarningCard(initialCampaignState()).options[0]!.label).toBe("Huddle in the driest part of camp");
    const reached = nextCampaignNode({ ...initialCampaignState(), node: "coastal-hazard" }, createCoastalHazardCard(initialCampaignState(), []).options[0]!.outcomes[0]!.campaignEffect!);
    expect(reached).toMatchObject({ coveReached: true, coveLocated: false });
    expect(createMotorboatDiscoveryCard(reached).prompt).toContain("reaches the cove");
  });

  it("keeps story-map edges attached to real nodes in every view", () => {
    for (const mode of ["route", "encounters", "mechanics"] as const) {
      const graph = getStoryMapGraph(mode);
      const ids = new Set(graph.nodes.map(({ id }) => id));
      expect(ids.size).toBe(graph.nodes.length);
      expect(graph.edges.filter(({ source, target }) => !ids.has(source) || !ids.has(target))).toEqual([]);
    }
  });
});
