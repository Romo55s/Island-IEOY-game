import { create } from "zustand";

import type { PublicGameSnapshot } from "../shared/domain";
import type { CommandErrorCode } from "../shared/protocol";

export type ConnectionStatus = "idle" | "connecting" | "connected" | "reconnecting" | "failed" | "expired";

export interface CommandRejection {
  commandId: string;
  code: CommandErrorCode;
  message: string;
}

export interface GameStoreState {
  connectionStatus: ConnectionStatus;
  snapshot: PublicGameSnapshot | null;
  pendingCommandIds: ReadonlySet<string>;
  lastCommandRejection: CommandRejection | null;
  protocolWarning: string | null;
  serverClockOffsetMs: number | null;
  setConnectionStatus: (status: ConnectionStatus) => void;
  acceptSnapshot: (snapshot: PublicGameSnapshot) => boolean;
  addPendingCommand: (commandId: string) => void;
  settleCommand: (commandId: string, rejection?: Omit<CommandRejection, "commandId">) => void;
  clearPendingCommands: () => void;
  setProtocolWarning: (warning: string | null) => void;
  addClockSample: (serverNow: number, clientSentAt: number, clientReceivedAt: number) => void;
  reset: () => void;
}

const initialState = {
  connectionStatus: "idle" as const,
  snapshot: null,
  pendingCommandIds: new Set<string>() as ReadonlySet<string>,
  lastCommandRejection: null,
  protocolWarning: null,
  serverClockOffsetMs: null,
};

export const useGameStore = create<GameStoreState>((set, get) => ({
  ...initialState,
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  acceptSnapshot: (snapshot) => {
    const currentSnapshot = get().snapshot;
    if (currentSnapshot?.code === snapshot.code && snapshot.revision < currentSnapshot.revision) return false;
    set({ snapshot });
    return true;
  },
  addPendingCommand: (commandId) =>
    set((state) => ({ pendingCommandIds: new Set([...state.pendingCommandIds, commandId]) })),
  settleCommand: (commandId, rejection) =>
    set((state) => {
      const pendingCommandIds = new Set(state.pendingCommandIds);
      pendingCommandIds.delete(commandId);
      return {
        pendingCommandIds,
        lastCommandRejection: rejection ? { commandId, ...rejection } : state.lastCommandRejection,
      };
    }),
  clearPendingCommands: () => set({ pendingCommandIds: new Set<string>() }),
  setProtocolWarning: (protocolWarning) => set({ protocolWarning }),
  addClockSample: (serverNow, clientSentAt, clientReceivedAt) =>
    set((state) => {
      const midpoint = clientSentAt + (clientReceivedAt - clientSentAt) / 2;
      const sample = serverNow - midpoint;
      const current = state.serverClockOffsetMs;
      const serverClockOffsetMs = current === null || Math.abs(sample - current) > 1_000 ? sample : current * 0.8 + sample * 0.2;
      return { serverClockOffsetMs };
    }),
  reset: () => set({ ...initialState, pendingCommandIds: new Set<string>() }),
}));

export function selectEstimatedServerNow(state: Pick<GameStoreState, "serverClockOffsetMs">, clientNow = Date.now()): number {
  return clientNow + (state.serverClockOffsetMs ?? 0);
}

export function selectRemainingMs(deadline: number | null | undefined, state: Pick<GameStoreState, "serverClockOffsetMs">, clientNow = Date.now()): number {
  if (deadline == null) return 0;
  return Math.max(0, deadline - selectEstimatedServerNow(state, clientNow));
}

type SnapshotWithAuthoritativeDeadlines = PublicGameSnapshot & {
  phaseDeadlineAt?: number | null;
  votingOpensAt?: number | null;
  earliestResolveAt?: number | null;
};

export function selectPhaseRemainingMs(state: Pick<GameStoreState, "snapshot" | "serverClockOffsetMs">, clientNow = Date.now()): number {
  const snapshot = state.snapshot as SnapshotWithAuthoritativeDeadlines | null;
  return selectRemainingMs(snapshot?.phaseDeadlineAt ?? snapshot?.phaseEndsAt, state, clientNow);
}

export function selectVotingOpensInMs(state: Pick<GameStoreState, "snapshot" | "serverClockOffsetMs">, clientNow = Date.now()): number {
  const snapshot = state.snapshot as SnapshotWithAuthoritativeDeadlines | null;
  return selectRemainingMs(snapshot?.votingOpensAt, state, clientNow);
}

