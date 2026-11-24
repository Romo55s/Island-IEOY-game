import { initialDesperationState } from "../../src/shared/desperation/opportunities";
import type { ApiErrorCode } from "../../src/shared/protocol";
import type { PrivateRoomState } from "../../src/shared/domain";
import { initialMotorboatRoute } from "../../src/shared/rules/motorboat";

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
  const room = (await storage.get<PersistedRoomState>(ROOM_STORAGE_KEY)) ?? null;
  return room ? normalizeLoadedRoom(room) : null;
}

function inferLegacySignalPosition(events: PrivateRoomState["eventHistory"]): "unselected" | "low" | "ridge" {
  const approach = [...events].reverse().find((event) => event.decisionId === "campaign-signal-approach");
  if (approach?.outcomeId === "ridge-position" || approach?.outcomeId === "rope-ridge-position" || approach?.outcomeId === "surveyed-horizon") return "ridge";
  if (approach?.outcomeId === "low-path-position") return "low";
  return "unselected";
}

export function normalizeLoadedRoom(room: PersistedRoomState): PersistedRoomState {
  const legacyEnding = room.endingId && !["group-escape", "solo-escape", "signal-rescue", "no-survivors"].includes(room.endingId as string);
  const livingCharacterIds = Object.values(room.characters).filter(({ status }) => status === "alive").map(({ characterId }) => characterId).sort();
  const deadCharacterIds = Object.values(room.characters).filter(({ status }) => status === "ghost").map(({ characterId }) => characterId).sort();
  // Old builds did not store enough ending detail to reconstruct the original
  // epilogue. Preserve a coherent terminal state instead of falsely declaring
  // living players dead when that archived session is opened on protocol v4.
  const legacyEscapeResult = livingCharacterIds.length > 0
    ? {
      type: "group-escape" as const,
      escapedCharacterIds: livingCharacterIds,
      strandedCharacterIds: [],
      deadCharacterIds,
      cause: "group-launch" as const,
      epilogueId: "motorboat-group-aftermath-v1" as const,
    }
    : {
      type: "no-survivors" as const,
      escapedCharacterIds: [],
      strandedCharacterIds: [],
      deadCharacterIds,
      cause: "all-dead" as const,
      epilogueId: "motorboat-all-dead-aftermath-v1" as const,
    };
  return {
    ...room,
    ...(room.campaign ? { campaign: {
      ...room.campaign,
      signalPosition: room.campaign.signalPosition ?? inferLegacySignalPosition(room.eventHistory),
      coveReached: room.campaign.coveReached ?? (Boolean(room.motorboat?.discovered) || room.eventHistory.some((event) => event.decisionId === "campaign-coastal-hazard")),
      storyFlags: room.campaign.storyFlags ?? [],
      decisionsSinceFoodTick: room.campaign.decisionsSinceFoodTick ?? 0,
    } } : {}),
    desperation: room.desperation ?? initialDesperationState(),
    targetNominationsByPlayer: room.targetNominationsByPlayer ?? {},
    assignmentNominationsByPlayer: room.assignmentNominationsByPlayer ?? {},
    resolutionSequence: room.resolutionSequence ?? 0,
    ...(room.phase !== "lobby" ? { motorboat: room.motorboat ?? initialMotorboatRoute() } : {}),
    ...(legacyEnding ? {
      endingId: legacyEscapeResult.type,
      escapeResult: legacyEscapeResult,
      motorboat: {
        ...(room.motorboat ?? initialMotorboatRoute()),
        node: "complete",
        completion: legacyEscapeResult.type,
      },
    } : {}),
  };
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
    resources: { shelter: 50 },
    deck: [],
    decisionIndex: 0,
    currentDecisionId: null,
    votesByPlayer: {},
    eligibleVoterIds: [],
    eventHistory: [],
    assignmentNominationsByPlayer: {},
    resolutionSequence: 0,
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
