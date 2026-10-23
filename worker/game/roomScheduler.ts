import { advancePhase, beginCrashRescueChoice, resolveCrashChoices, resolveCurrentDecision, resolvePendingAssignment, resolvePendingPrivateChoice } from "../../src/shared/rules/stateMachine";
import type { RandomSource } from "../../src/shared/rules/random";
import type { PersistedRoomState } from "./roomStorage";

export function nextAlarmAt(state: PersistedRoomState): number | null {
  const candidates = [state.phaseDeadlineAt, state.hostMigrationAt, state.expiresAt].filter(
    (value): value is number => value !== null,
  );
  return candidates.length > 0 ? Math.min(...candidates) : null;
}

export function allConnectedPlayersVoted(state: PersistedRoomState): boolean {
  const connected = Object.values(state.players).filter(({ connected }) => connected);
  return connected.length > 0 && connected.every(({ id }) => id in state.votesByPlayer);
}

export function allConnectedPlayersSelectedCrashItem(state: PersistedRoomState): boolean {
  const connected = Object.values(state.players).filter(({ connected }) => connected);
  return connected.length > 0 && connected.every(({ id }) => id in (state.crashItemsByPlayer ?? {}));
}

export function allConnectedLivingPlayersSelectedRescueTarget(state: PersistedRoomState): boolean {
  const connectedLiving = Object.values(state.players)
    .filter(({ connected, status, characterId }) => connected && status === "alive" && characterId !== null);
  return connectedLiving.length > 0 && connectedLiving.every(({ id }) => id in (state.rescueTargetsByPlayer ?? {}));
}

export function processDueEvents(state: PersistedRoomState, now: number, random: RandomSource): PersistedRoomState {
  let next = state;
  let guard = 0;
  while (guard < 32) {
    guard += 1;
    if (now >= next.expiresAt) {
      return {
        ...next,
        revision: next.revision + 1,
        phase: "expired",
        phaseStartedAt: now,
        phaseDeadlineAt: null,
        votingOpensAt: null,
        earliestResolveAt: null,
        phaseEndsAt: null,
      };
    }
    if (next.hostMigrationAt !== null && now >= next.hostMigrationAt) {
      const replacement = Object.values(next.players)
        .filter(({ connected, id }) => connected && id !== next.hostPlayerId)
        .sort((left, right) => left.joinedAt - right.joinedAt)[0];
      next = replacement
        ? { ...next, revision: next.revision + 1, hostPlayerId: replacement.id, hostMigrationAt: null, hostMigrationPending: false }
        : { ...next, hostMigrationAt: null, hostMigrationPending: true };
      continue;
    }
    const canResolveEarly = next.phase === "decision"
      && next.earliestResolveAt !== null
      && now >= next.earliestResolveAt
      && allConnectedPlayersVoted(next);
    if (canResolveEarly) {
      next = resolveCurrentDecision(next, now, random) as PersistedRoomState;
      continue;
    }
    if (next.phase === "assignmentResponse" && next.pendingAssignment && next.pendingAssignment.response !== null) {
      next = resolvePendingAssignment(next, now, random) as PersistedRoomState;
      continue;
    }
    if (next.phase === "privateChoice" && next.pendingPrivateChoice?.response !== null) {
      next = resolvePendingPrivateChoice(next, now, random) as PersistedRoomState;
      continue;
    }
    if (next.phase === "crashItemChoice" && allConnectedPlayersSelectedCrashItem(next)) {
      next = beginCrashRescueChoice(next, now) as PersistedRoomState;
      continue;
    }
    if (next.phase === "crashRescueChoice" && allConnectedLivingPlayersSelectedRescueTarget(next)) {
      next = resolveCrashChoices(next, now, random) as PersistedRoomState;
      continue;
    }
    if (next.phaseDeadlineAt !== null && now >= next.phaseDeadlineAt) {
      const advanced = advancePhase(next, now, random) as PersistedRoomState;
      if (advanced === next) break;
      next = advanced;
      continue;
    }
    break;
  }
  return next;
}
