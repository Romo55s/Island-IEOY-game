import { describe, expect, it } from "vitest";
import type { PrivateRoomState } from "../../src/shared/domain";
import { ApiErrorResponseSchema, ClientCommandSchema, CreateSessionRequestSchema, PublicGameSnapshotSchema, TicketRequestSchema, toPublicSnapshot } from "../../src/shared/protocol";

const validVote = { protocolVersion: 1, commandId: "command-1", type: "vote.submit", payload: { optionId: "option-1" } } as const;
const privateState: PrivateRoomState = {
  code: "ABC234", revision: 1, phase: "decision", createdAt: 0, lastActivityAt: 0, hostPlayerId: "p_ana", phaseEndsAt: 30_000,
  players: { p_ana: { id: "p_ana", displayName: "Ana", status: "alive", characterId: null, ready: true, connected: true, joinedAt: 0 } },
  characters: {}, resources: { food: 50, health: 50, morale: 50, shelter: 50 },
  deck: [{ id: "card-1", prompt: "Choose.", options: [{ id: "option-1", label: "Do it", outcomes: [] }, { id: "option-2", label: "Do not", outcomes: [] }] }],
  decisionIndex: 0, currentDecisionId: "card-1", votesByPlayer: { p_ana: "option-1" }, eligibleVoterIds: ["p_ana"], eventHistory: [],
};

describe("shared protocol", () => {
  it("validates versioned vote commands", () => {
    expect(ClientCommandSchema.safeParse(validVote).success).toBe(true);
    expect(ClientCommandSchema.safeParse({ ...validVote, protocolVersion: 2 }).success).toBe(false);
    expect(ClientCommandSchema.safeParse({ ...validVote, payload: { optionId: "" } }).success).toBe(false);
  });
  it("keeps passwords and individual votes out of public snapshots", () => {
    const snapshot = toPublicSnapshot(privateState, "p_ana");
    expect(snapshot.viewer.hasVoted).toBe(true);
    expect("resolvedOptionCounts" in snapshot).toBe(false);
    expect(PublicGameSnapshotSchema.safeParse({ ...snapshot, passwordHash: "secret" }).success).toBe(false);
    expect(PublicGameSnapshotSchema.safeParse({ ...snapshot, votesByPlayer: { p_ana: "option-1" } }).success).toBe(false);
  });
  it("validates shared HTTP contracts", () => {
    expect(CreateSessionRequestSchema.safeParse({ displayName: "Ana", password: "isla" }).success).toBe(true);
    expect(TicketRequestSchema.safeParse({ mode: "resume", resumeToken: "x".repeat(43) }).success).toBe(true);
    expect(ApiErrorResponseSchema.safeParse({ error: { code: "INVALID_PASSWORD", message: "No match" } }).success).toBe(true);
  });
});
