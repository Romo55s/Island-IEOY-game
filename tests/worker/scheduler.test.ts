import { describe, expect, it } from "vitest";

import { sequenceRandom } from "../../src/shared/rules/random";
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
});
