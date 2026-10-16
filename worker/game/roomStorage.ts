import type { ApiErrorCode } from "../../src/shared/protocol";
import type { PrivateRoomState } from "../../src/shared/domain";

export const ROOM_STORAGE_KEY = "room:v1";
export const SESSION_TTL_MS = 7_200_000;

export interface AdmissionTicketRecord {
  ticketDigest: string;
  playerId: string;
  resumeDigest: string;
  displayName: string;
  mode: "join" | "resume";
  expiresAt: number;
  consumedAt: number | null;
}

export interface PersistedRoomState extends PrivateRoomState {
  passwordSalt: Uint8Array;
  passwordDigest: Uint8Array;
  tickets: Record<string, AdmissionTicketRecord>;
  resumeDigestsByPlayer: Record<string, string>;
  failedAttemptsByAddress: Record<string, number[]>;
  processedCommandIdsByPlayer: Record<string, string[]>;
  hostMigrationAt: number | null;
  hostMigrationPending: boolean;
  expiresAt: number;
}

export type RoomErrorResult = {
  ok: false;
  status: 400 | 401 | 404 | 409 | 429 | 503;
  code: ApiErrorCode;
  message: string;
};

export type RoomResult<T> = { ok: true; value: T } | RoomErrorResult;

type StorageReaderWriter = Pick<DurableObjectStorage, "get" | "put">;

export async function loadRoom(storage: StorageReaderWriter): Promise<PersistedRoomState | null> {
  return (await storage.get<PersistedRoomState>(ROOM_STORAGE_KEY)) ?? null;
}

export async function saveRoom(storage: StorageReaderWriter, room: PersistedRoomState): Promise<void> {
  await storage.put(ROOM_STORAGE_KEY, room);
}

export function pruneTickets(room: PersistedRoomState, now: number): PersistedRoomState {
  const tickets = Object.fromEntries(
    Object.entries(room.tickets).filter(([, ticket]) => ticket.consumedAt === null && ticket.expiresAt > now),
  );
  return Object.keys(tickets).length === Object.keys(room.tickets).length ? room : { ...room, tickets };
}

export function newPrivateRoom(input: {
  code: string;
  playerId: string;
  now: number;
  passwordSalt: Uint8Array;
  passwordDigest: Uint8Array;
}): PersistedRoomState {
  return {
    code: input.code,
    revision: 0,
    phase: "lobby",
    createdAt: input.now,
    lastActivityAt: input.now,
    hostPlayerId: input.playerId,
    phaseStartedAt: input.now,
    phaseDeadlineAt: null,
    votingOpensAt: null,
    earliestResolveAt: null,
    phaseEndsAt: null,
    players: {},
    characters: {},
    resources: { food: 50, health: 50, morale: 50, shelter: 50 },
    deck: [],
    decisionIndex: 0,
    currentDecisionId: null,
    votesByPlayer: {},
    eligibleVoterIds: [],
    eventHistory: [],
    passwordSalt: input.passwordSalt,
    passwordDigest: input.passwordDigest,
    tickets: {},
    resumeDigestsByPlayer: {},
    failedAttemptsByAddress: {},
    processedCommandIdsByPlayer: {},
    hostMigrationAt: null,
    hostMigrationPending: false,
    expiresAt: input.now + SESSION_TTL_MS,
  };
}

export function markActivity(room: PersistedRoomState, now: number): PersistedRoomState {
  return { ...room, lastActivityAt: now, expiresAt: now + SESSION_TTL_MS };
}
