import { describe, expect, it } from "vitest";

import { DECISION_CARDS } from "../../src/shared/content/decisionCards";
import type { Player, PrivateRoomState } from "../../src/shared/domain";
import { toPublicSnapshot } from "../../src/shared/protocol";
import { sequenceRandom } from "../../src/shared/rules/random";
import { beginDecision, deriveEndingId, resolveCurrentDecision, startGame } from "../../src/shared/rules/stateMachine";

function player(id: string, characterId: string, joinedAt: number): Player {
  return { id, displayName: id, status: "alive", characterId, ready: true, connected: true, joinedAt };
}

function lobby(): PrivateRoomState {
  return {
    code: "ABC234", revision: 0, phase: "lobby", createdAt: 0, lastActivityAt: 0, hostPlayerId: "p_a",
    phaseStartedAt: 0, phaseDeadlineAt: null, votingOpensAt: null, earliestResolveAt: null, phaseEndsAt: null,
    players: { p_a: player("p_a", "cast-ember", 1), p_b: player("p_b", "cast-moss", 2), p_c: player("p_c", "cast-sun", 3) },
    characters: {
      "cast-ember": { characterId: "cast-ember", status: "alive" },
      "cast-moss": { characterId: "cast-moss", status: "alive" },
      "cast-sun": { characterId: "cast-sun", status: "alive" },
    },
    resources: { food: 50, health: 50, morale: 50, shelter: 50 }, deck: [], decisionIndex: 0,
    currentDecisionId: null, votesByPlayer: {}, eligibleVoterIds: [], eventHistory: [],
  };
}

describe("authoritative game progression", () => {
  it("starts with a synchronized intro and exact decision windows", () => {
    const started = startGame(lobby(), 10_000, DECISION_CARDS, sequenceRandom(Array(9).fill(0)));
    expect(started.phase).toBe("intro");
    expect(started.phaseDeadlineAt).toBe(40_000);
    const decision = beginDecision(started, 0, 40_000);
    expect(decision.votingOpensAt).toBe(65_000);
    expect(decision.earliestResolveAt).toBe(75_000);
    expect(decision.phaseDeadlineAt).toBe(80_000);
  });

  it("reveals only anonymous totals and respects a replacement vote", () => {
    const base = { ...lobby(), deck: [DECISION_CARDS[2]!], phase: "decision" as const, currentDecisionId: DECISION_CARDS[2]!.id, votingOpensAt: 0, earliestResolveAt: 0, phaseDeadlineAt: 15_000, phaseEndsAt: 15_000, eligibleVoterIds: ["p_a", "p_b", "p_c"] };
    const [a, b] = DECISION_CARDS[2]!.options;
    base.votesByPlayer = { p_a: b!.id, p_b: a!.id, p_c: b!.id };
    base.votesByPlayer.p_a = a!.id;
    const privateSnapshot = toPublicSnapshot(base, "p_a");
    expect(privateSnapshot.viewer.hasVoted).toBe(true);
    expect(privateSnapshot).not.toHaveProperty("resolvedOptionCounts");
    expect(JSON.stringify(privateSnapshot)).not.toContain("votesByPlayer");

    const revealed = resolveCurrentDecision(base, 12_000, sequenceRandom([0]));
    expect(revealed.winningOptionId).toBe(a!.id);
    expect(revealed.resolvedOptionCounts).toMatchObject({ [a!.id]: 2, [b!.id]: 1 });
    const publicReveal = toPublicSnapshot(revealed, "p_b");
    expect(publicReveal.resolvedOptionCounts).toEqual(revealed.resolvedOptionCounts);
    expect(JSON.stringify(publicReveal)).not.toContain("p_a\":\"");
  });

  it("derives all four stable ending bands", () => {
    const state = lobby();
    state.resources = { food: 70, health: 70, morale: 70, shelter: 70 };
    expect(deriveEndingId(state)).toBe("rescued-inexplicably");
    state.resources = { food: 30, health: 30, morale: 30, shelter: 30 };
    expect(deriveEndingId(state)).toBe("alive-technically");
    state.resources = { food: 10, health: 10, morale: 10, shelter: 10 };
    expect(deriveEndingId(state)).toBe("island-management");
    for (const candidate of Object.values(state.players)) candidate.status = "ghost";
    expect(deriveEndingId(state)).toBe("ghost-committee");
  });
});
