import { beforeEach, describe, expect, it } from "vitest";

import type { PublicGameSnapshot } from "../../src/shared/domain";
import {
  selectPhaseRemainingMs,
  useGameStore,
  type ConnectionStatus,
} from "../../src/client/useGameStore";

function snapshotAtRevision(revision: number, phaseEndsAt: number | null = null): PublicGameSnapshot {
  return {
    code: "ABC234",
    revision,
    phase: "lobby",
    hostPlayerId: "p_ana",
    phaseStartedAt: null,
    phaseDeadlineAt: phaseEndsAt,
    votingOpensAt: null,
    earliestResolveAt: null,
    phaseEndsAt,
    players: [],
    characters: [],
    characterCatalog: [],
    resources: { food: 50, health: 50, morale: 50, shelter: 50 },
    currentDecision: null,
    decisionNumber: 0,
    totalDecisions: 10,
    eligibleVoterIds: [],
    eventHistory: [],
    viewer: { playerId: "p_ana", hasVoted: false },
  };
}

describe("game client store", () => {
  beforeEach(() => useGameStore.getState().reset());

  it("ignores stale snapshots by authoritative revision", () => {
    useGameStore.getState().acceptSnapshot(snapshotAtRevision(4));
    useGameStore.getState().acceptSnapshot(snapshotAtRevision(3));
    expect(useGameStore.getState().snapshot?.revision).toBe(4);
  });

  it("represents every transport state", () => {
    const statuses: ConnectionStatus[] = ["idle", "connecting", "connected", "reconnecting", "failed", "expired"];
    for (const status of statuses) {
      useGameStore.getState().setConnectionStatus(status);
      expect(useGameStore.getState().connectionStatus).toBe(status);
    }
  });

  it("tracks pending commands without optimistically changing gameplay", () => {
    const snapshot = snapshotAtRevision(1);
    useGameStore.getState().acceptSnapshot(snapshot);
    useGameStore.getState().addPendingCommand("cmd_one");

    expect(useGameStore.getState().pendingCommandIds.has("cmd_one")).toBe(true);
    expect(useGameStore.getState().snapshot).toBe(snapshot);

    useGameStore.getState().settleCommand("cmd_one", { code: "INVALID_MESSAGE", message: "No" });
    expect(useGameStore.getState().pendingCommandIds.has("cmd_one")).toBe(false);
    expect(useGameStore.getState().lastCommandRejection?.commandId).toBe("cmd_one");
  });

  it("renders the same server deadline for clocks five minutes fast and slow", () => {
    const serverNow = 1_000_000;
    const deadline = serverNow + 15_000;
    useGameStore.getState().acceptSnapshot(snapshotAtRevision(1, deadline));

    const fastClientNow = serverNow + 300_000;
    useGameStore.getState().addClockSample(serverNow, fastClientNow, fastClientNow);
    const fastRemaining = selectPhaseRemainingMs(useGameStore.getState(), fastClientNow);

    useGameStore.getState().reset();
    useGameStore.getState().acceptSnapshot(snapshotAtRevision(1, deadline));
    const slowClientNow = serverNow - 300_000;
    useGameStore.getState().addClockSample(serverNow, slowClientNow, slowClientNow);
    const slowRemaining = selectPhaseRemainingMs(useGameStore.getState(), slowClientNow);

    expect(fastRemaining).toBe(15_000);
    expect(slowRemaining).toBe(15_000);
    expect(useGameStore.getState().snapshot?.phase).toBe("lobby");
  });
});

