import { z } from "zod";

import {
  CHARACTER_CATALOG,
  PROTOCOL_VERSION,
  type CharacterDefinition,
  type PrivateRoomState,
  type PublicGameSnapshot,
} from "./domain";

const withoutControlCharacters = (value: string) => !/[\u0000-\u001f\u007f-\u009f]/u.test(value);
const codePointLength = (value: string) => Array.from(value).length;
const boundedString = (minimum: number, maximum: number) =>
  z.string().refine((value) => codePointLength(value) >= minimum && codePointLength(value) <= maximum).refine(withoutControlCharacters);
const IdSchema = boundedString(1, 64);
const TimestampSchema = z.number().int().nonnegative();
const ResourceValueSchema = z.number().int().min(0).max(100);

export const GamePhaseSchema = z.enum(["lobby", "intro", "decision", "reveal", "ending", "expired"]);
export const PlayerStatusSchema = z.enum(["alive", "ghost"]);
export const ResourcesSchema = z.object({ food: ResourceValueSchema, health: ResourceValueSchema, morale: ResourceValueSchema, shelter: ResourceValueSchema }).strict();
export const PlayerSchema = z.object({ id: IdSchema, displayName: boundedString(1, 24), status: PlayerStatusSchema, characterId: IdSchema.nullable(), ready: z.boolean(), connected: z.boolean(), joinedAt: TimestampSchema }).strict();
export const CharacterDefinitionSchema = z.object({ id: IdSchema, displayName: boundedString(1, 32), modelUrl: boundedString(1, 256), tint: z.string().regex(/^#[0-9a-f]{6}$/i) }).strict();
export const CharacterStateSchema = z.object({ characterId: IdSchema, status: PlayerStatusSchema }).strict();
const EventEntrySchema = z.object({ id: IdSchema, text: boundedString(1, 280), createdAt: TimestampSchema }).strict();
const PublicDecisionSchema = z.object({ id: IdSchema, prompt: boundedString(1, 280), options: z.array(z.object({ id: IdSchema, label: boundedString(1, 160) }).strict()).min(2).max(4) }).strict();

export const PublicGameSnapshotSchema = z.object({
  code: z.string().regex(/^[A-HJ-NP-Z2-9]{6}$/), revision: z.number().int().nonnegative(), phase: GamePhaseSchema,
  hostPlayerId: IdSchema, phaseEndsAt: TimestampSchema.nullable(), players: z.array(PlayerSchema).max(8),
  characters: z.array(CharacterStateSchema).max(8), characterCatalog: z.array(CharacterDefinitionSchema).max(8),
  resources: ResourcesSchema, currentDecision: PublicDecisionSchema.nullable(), decisionNumber: z.number().int().min(0).max(10),
  totalDecisions: z.number().int().min(0).max(10), eligibleVoterIds: z.array(IdSchema).max(8), eventHistory: z.array(EventEntrySchema).max(50),
  viewer: z.object({ playerId: IdSchema, hasVoted: z.boolean() }).strict(),
  resolvedOptionCounts: z.record(IdSchema, z.number().int().nonnegative()).optional(), winningOptionId: IdSchema.optional(),
}).strict().superRefine((snapshot, context) => {
  const mayRevealVotes = snapshot.phase === "reveal" || snapshot.phase === "ending";
  if (!mayRevealVotes && (snapshot.resolvedOptionCounts !== undefined || snapshot.winningOptionId !== undefined)) context.addIssue({ code: "custom", message: "Vote totals are private until reveal." });
  if (snapshot.phase === "reveal" && (!snapshot.resolvedOptionCounts || !snapshot.winningOptionId)) context.addIssue({ code: "custom", message: "Reveal snapshots require totals and a winner." });
});

const CommandBase = { protocolVersion: z.literal(PROTOCOL_VERSION), commandId: boundedString(1, 64) };
export const ClientCommandSchema = z.discriminatedUnion("type", [
  z.object({ ...CommandBase, type: z.literal("character.select"), payload: z.object({ characterId: IdSchema }).strict() }).strict(),
  z.object({ ...CommandBase, type: z.literal("room.remove-player"), payload: z.object({ playerId: IdSchema }).strict() }).strict(),
  z.object({ ...CommandBase, type: z.literal("room.set-ready"), payload: z.object({ ready: z.boolean() }).strict() }).strict(),
  z.object({ ...CommandBase, type: z.literal("room.start"), payload: z.object({}).strict() }).strict(),
  z.object({ ...CommandBase, type: z.literal("vote.submit"), payload: z.object({ optionId: IdSchema }).strict() }).strict(),
  z.object({ ...CommandBase, type: z.literal("client.ping"), payload: z.object({ sentAt: TimestampSchema }).strict() }).strict(),
]);
export const CommandErrorCodeSchema = z.enum(["INVALID_COMMAND", "UNAUTHORIZED", "INVALID_PHASE", "CHARACTER_TAKEN", "PLAYER_NOT_FOUND", "VOTING_CLOSED"]);
const WelcomePayloadSchema = z.object({ playerId: IdSchema, resumeToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/) }).strict();
export const ServerEventSchema = z.discriminatedUnion("type", [
  z.object({ protocolVersion: z.literal(PROTOCOL_VERSION), type: z.literal("session.welcome"), payload: WelcomePayloadSchema.extend({ serverNow: TimestampSchema }).strict() }).strict(),
  z.object({ protocolVersion: z.literal(PROTOCOL_VERSION), type: z.literal("state.snapshot"), payload: PublicGameSnapshotSchema }).strict(),
  z.object({ protocolVersion: z.literal(PROTOCOL_VERSION), type: z.literal("command.rejected"), payload: z.object({ commandId: boundedString(1, 64), code: CommandErrorCodeSchema, message: boundedString(1, 200) }).strict() }).strict(),
  z.object({ protocolVersion: z.literal(PROTOCOL_VERSION), type: z.literal("server.pong"), payload: z.object({ sentAt: TimestampSchema, receivedAt: TimestampSchema }).strict() }).strict(),
]);

export const CreateSessionRequestSchema = z.object({ displayName: boundedString(1, 24), password: boundedString(4, 64) }).strict();
export const TicketRequestSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("join"), displayName: boundedString(1, 24), password: boundedString(4, 64) }).strict(),
  z.object({ mode: z.literal("resume"), resumeToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/) }).strict(),
]);
export const AdmissionResponseSchema = z.object({ code: z.string().regex(/^[A-HJ-NP-Z2-9]{6}$/), playerId: z.string().regex(/^p_[A-Za-z0-9_-]+$/), resumeToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/), ticket: z.string().regex(/^[A-Za-z0-9_-]{43}$/), ticketExpiresAt: TimestampSchema }).strict();
export const ApiErrorCodeSchema = z.enum(["BAD_REQUEST", "INVALID_PASSWORD", "ROOM_NOT_FOUND", "ROOM_FULL", "GAME_ALREADY_STARTED", "RATE_LIMITED", "CODE_GENERATION_EXHAUSTED", "TICKET_INVALID", "TICKET_EXPIRED"]);
export const ApiErrorResponseSchema = z.object({ error: z.object({ code: ApiErrorCodeSchema, message: boundedString(1, 200) }).strict() }).strict();

export type ClientCommand = z.infer<typeof ClientCommandSchema>;
export type ServerEvent = z.infer<typeof ServerEventSchema>;
export type CommandErrorCode = z.infer<typeof CommandErrorCodeSchema>;
export type CreateSessionRequest = z.infer<typeof CreateSessionRequestSchema>;
export type TicketRequest = z.infer<typeof TicketRequestSchema>;
export type AdmissionResponse = z.infer<typeof AdmissionResponseSchema>;
export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;
export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;

export function toPublicSnapshot(state: PrivateRoomState, viewerPlayerId: string, characterCatalog: CharacterDefinition[] = CHARACTER_CATALOG): PublicGameSnapshot {
  const activeCard = state.deck.find((candidate) => candidate.id === state.currentDecisionId) ?? null;
  const revealVotes = state.phase === "reveal" || state.phase === "ending";
  const snapshot = {
    code: state.code, revision: state.revision, phase: state.phase, hostPlayerId: state.hostPlayerId, phaseEndsAt: state.phaseEndsAt,
    players: Object.values(state.players), characters: Object.values(state.characters), characterCatalog, resources: state.resources,
    currentDecision: activeCard ? { id: activeCard.id, prompt: activeCard.prompt, options: activeCard.options.map(({ id, label }) => ({ id, label })) } : null,
    decisionNumber: state.currentDecisionId ? state.decisionIndex + 1 : 0, totalDecisions: state.deck.length,
    eligibleVoterIds: [...state.eligibleVoterIds], eventHistory: [...state.eventHistory],
    viewer: { playerId: viewerPlayerId, hasVoted: viewerPlayerId in state.votesByPlayer },
    ...(revealVotes && state.resolvedOptionCounts && state.winningOptionId ? { resolvedOptionCounts: { ...state.resolvedOptionCounts }, winningOptionId: state.winningOptionId } : {}),
  } satisfies PublicGameSnapshot;
  return snapshot;
}
