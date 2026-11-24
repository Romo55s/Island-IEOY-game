import { describe, expect, it } from "vitest";

import { sequenceRandom } from "../../src/shared/rules/random";
import { INITIAL_CHARACTER_RESOURCES, type DecisionCard } from "../../src/shared/domain";
import { nextAlarmAt, processDueEvents } from "../../worker/game/roomScheduler";
import { newPrivateRoom, type PersistedRoomState } from "../../worker/game/roomStorage";

function room(now = 1_000): PersistedRoomState {
  return newPrivateRoom({
    code: "ABC234",
    playerId: "p_host",
    now,
    passwordSalt: new Uint8Array(16),
    passwordDigest: new Uint8Array(32),
  });
}

describe("room scheduler", () => {
  it("selects the earliest absolute deadline", () => {
    const state = { ...room(), phaseDeadlineAt: 9_000, hostMigrationAt: 5_000, expiresAt: 12_000 };
    expect(nextAlarmAt(state)).toBe(5_000);
  });

  it("transfers host authority to the longest-connected eligible player", () => {
    const state = room();
    state.hostMigrationAt = 31_000;
    state.players = {
      p_host: { id: "p_host", displayName: "Host", status: "alive", characterId: null, ready: true, connected: false, joinedAt: 1 },
      p_newer: { id: "p_newer", displayName: "Newer", status: "alive", characterId: null, ready: true, connected: true, joinedAt: 30 },
      p_older: { id: "p_older", displayName: "Older", status: "alive", characterId: null, ready: true, connected: true, joinedAt: 20 },
    };
    const next = processDueEvents(state, 31_000, sequenceRandom([]));
    expect(next.hostPlayerId).toBe("p_older");
    expect(next.hostMigrationAt).toBeNull();
    expect(next.revision).toBe(1);
  });

  it("expires and clears active deadlines after two hours of inactivity", () => {
    const state = room();
    const next = processDueEvents(state, state.expiresAt, sequenceRandom([]));
    expect(next.phase).toBe("expired");
    expect(next.phaseDeadlineAt).toBeNull();
    expect(next.votingOpensAt).toBeNull();
    expect(next.earliestResolveAt).toBeNull();
  });

  it("resolves a decision as soon as every connected player has voted", () => {
    const state = room();
    const card: DecisionCard = { id: "quick-vote", prompt: "Choose.", options: [{ id: "go", label: "Go", outcomes: [{ id: "went", text: "The crew goes.", weight: 1 }] }] };
    state.phase = "decision";
    state.phaseStartedAt = 1_000;
    state.votingOpensAt = 2_000;
    state.earliestResolveAt = 2_000;
    state.phaseDeadlineAt = 30_000;
    state.phaseEndsAt = 30_000;
    state.players = {
      p_host: { id: "p_host", displayName: "Host", status: "alive", characterId: "cast-daniel", ready: true, connected: true, joinedAt: 1 },
      p_friend: { id: "p_friend", displayName: "Friend", status: "alive", characterId: "cast-samantha", ready: true, connected: true, joinedAt: 2 },
    };
    state.characters = {
      "cast-daniel": { characterId: "cast-daniel", status: "alive", resources: { ...INITIAL_CHARACTER_RESOURCES } },
      "cast-samantha": { characterId: "cast-samantha", status: "alive", resources: { ...INITIAL_CHARACTER_RESOURCES } },
    };
    state.deck = [card];
    state.currentDecisionId = card.id;
    state.votesByPlayer = { p_host: "go", p_friend: "go" };
    state.eligibleVoterIds = ["p_host", "p_friend"];

    const resolved = processDueEvents(state, 2_001, sequenceRandom([0]));
    expect(resolved.phase).toBe("reveal");
    expect(resolved.phaseDeadlineAt).toBeGreaterThan(2_001);
  });

  it("resolves an assignment response immediately and timeout acceptance at the exact deadline", () => {
    const makeAssignment = () => {
      const state = room();
      state.phase = "assignmentResponse";
      state.phaseStartedAt = 1_000;
      state.phaseDeadlineAt = 16_000;
      state.phaseEndsAt = 16_000;
      state.currentDecisionId = "cave";
      state.players = { p_host: { id: "p_host", displayName: "Host", status: "alive", characterId: "cast-daniel", ready: true, connected: true, joinedAt: 0 } };
      state.characters = { "cast-daniel": { characterId: "cast-daniel", status: "alive", resources: { food: 50, health: 100, morale: 50, water: 50 } } };
      state.deck = [{ id: "cave", prompt: "Who enters?", options: [{ id: "send", label: "Send", outcomes: [{ id: "entered", text: "Entered.", weight: 1, effectTarget: "assigned-actor", resourceDeltas: { health: -10 } }], assignment: { roleLabel: "enter", actorSelection: "group-nominated-living", refusal: { successChanceBps: 3_500, qualitativeRisk: "risky", successOutcomes: [{ id: "sealed", text: "Sealed.", weight: 1 }] } } }] }];
      state.resolvedOptionCounts = { send: 1 };
      state.winningOptionId = "send";
      state.resolutionSequence = 1;
      state.pendingAssignment = { id: "assignment-ABC234-1", decisionId: "cave", optionId: "send", actorCharacterId: "cast-daniel", actorPlayerId: "p_host", roleLabel: "enter", selectionMethod: "group-nomination", createdAt: 1_000, deadlineAt: 16_000, response: null };
      return state;
    };
    const accepted = makeAssignment();
    accepted.pendingAssignment!.response = "accept";
    const immediate = processDueEvents(accepted, 2_000, sequenceRandom([0]));
    expect(immediate.phase).toBe("reveal");
    expect(immediate.eventHistory).toHaveLength(1);

    const timedOut = processDueEvents(makeAssignment(), 16_000, sequenceRandom([0]));
    expect(timedOut.phase).toBe("reveal");
    expect(timedOut.eventHistory.at(-1)?.resolution?.assignment?.result).toBe("timeout-accepted");
    expect(processDueEvents(timedOut, 16_000, sequenceRandom([]))).toEqual(timedOut);
  });
});
