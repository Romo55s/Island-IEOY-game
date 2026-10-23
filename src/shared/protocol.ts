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
const ResourceDeltaSchema = z.number().int().min(-100).max(100);

export const GamePhaseSchema = z.enum(["lobby", "intro", "crashItemChoice", "crashRescueChoice", "crashResolution", "decision", "assignmentResponse", "privateChoice", "reveal", "ending", "expired"]);
export const PlayerStatusSchema = z.enum(["alive", "ghost"]);
export const ResourcesSchema = z.object({ shelter: ResourceValueSchema }).strict();
export const CharacterResourcesSchema = z.object({ food: ResourceValueSchema, health: ResourceValueSchema, morale: ResourceValueSchema, water: ResourceValueSchema }).strict();
export const PlayerSchema = z.object({ id: IdSchema, displayName: boundedString(1, 24), status: PlayerStatusSchema, characterId: IdSchema.nullable(), ready: z.boolean(), connected: z.boolean(), joinedAt: TimestampSchema }).strict();
export const CharacterDefinitionSchema = z.object({ id: IdSchema, displayName: boundedString(1, 32), modelUrl: boundedString(1, 256), tint: z.string().regex(/^#[0-9a-f]{6}$/i) }).strict();
export const CharacterStateSchema = z.object({ characterId: IdSchema, status: PlayerStatusSchema, resources: CharacterResourcesSchema, startingItemId: IdSchema.nullable().optional() }).strict();
const CrashAttemptResultSchema = z.object({
  rescuerCharacterId: IdSchema,
  targetCharacterId: IdSchema,
  itemId: IdSchema.nullable(),
  outcome: z.enum(["success", "miss", "rescuer-lost", "target-lost", "both-lost"]),
  complicationText: boundedString(1, 280).optional(),
}).strict();
export const CrashResolutionSchema = z.object({
  attempts: z.array(CrashAttemptResultSchema).max(8),
  savedCharacterIds: z.array(IdSchema).max(8),
  eliminatedCharacterIds: z.array(IdSchema).max(8),
  summary: boundedString(1, 500),
}).strict();
const ResolvedResourceChangeSchema = z.discriminatedUnion("scope", [
  z.object({ scope: z.literal("crew"), resource: z.literal("shelter"), before: ResourceValueSchema, after: ResourceValueSchema, delta: ResourceDeltaSchema, cause: z.literal("outcome") }).strict(),
  z.object({ scope: z.literal("character"), characterId: IdSchema, resource: z.enum(["food", "health", "morale", "water"]), before: ResourceValueSchema, after: ResourceValueSchema, delta: ResourceDeltaSchema, cause: z.enum(["outcome", "daily-consumption", "starvation"]) }).strict(),
]);
const ResolvedStatusChangeSchema = z.object({ characterId: IdSchema, before: PlayerStatusSchema, after: PlayerStatusSchema, cause: z.enum(["outcome", "starvation", "storm-surge"]) }).strict();
const MotorboatNodeSchema = z.enum(["discovery", "fuel-choice", "repair", "launch", "terminal", "complete"]);
const EndingIdSchemaInternal = z.enum(["group-escape", "solo-escape", "no-survivors"]);
const MotorboatFactsSchema = z.object({
  node: MotorboatNodeSchema,
  actorCharacterId: IdSchema.optional(),
  boatChange: z.enum(["discovered", "fuel-shared", "fuel-kept-private", "repaired-sturdy", "repaired-fragile", "custodian-woke-group", "launch-failed", "solo-launch-failed", "quiet-miss", "escaped", "storm-destroyed"]).optional(),
  opportunityId: IdSchema.optional(), passengerCharacterIds: z.array(IdSchema).max(8).optional(), missNumber: z.number().int().min(1).max(3).optional(),
  endingCause: z.enum(["group-launch", "solo-launch", "storm-surge", "all-dead"]).optional(), fuelConsumed: z.boolean().optional(),
  statusChanges: z.array(ResolvedStatusChangeSchema).max(8).optional(),
}).strict();
const ResolvedAssignmentSchema = z.object({
  id: IdSchema,
  actorCharacterId: IdSchema,
  roleLabel: boundedString(1, 100),
  selectionMethod: z.enum(["group-nomination", "random-fallback"]),
  result: z.enum(["accepted", "timeout-accepted", "refusal-succeeded", "refusal-failed", "actor-unavailable"]),
}).strict();
const ResolvedDecisionSchema = z.object({
  decisionId: IdSchema,
  prompt: boundedString(1, 280),
  winningOptionId: IdSchema,
  winningOptionLabel: boundedString(1, 160),
  outcomeId: IdSchema,
  outcomeText: boundedString(1, 280),
  optionResults: z.array(z.object({ optionId: IdSchema, label: boundedString(1, 160), votes: z.number().int().nonnegative() }).strict()).min(1).max(4),
  resourceChanges: z.array(ResolvedResourceChangeSchema).max(100),
  statusChanges: z.array(ResolvedStatusChangeSchema).max(8),
  affectedCharacterIds: z.array(IdSchema).max(8),
  presentationCue: z.enum(["success", "setback", "danger", "neutral"]),
  assignment: ResolvedAssignmentSchema.optional(),
  motorboat: MotorboatFactsSchema.optional(),
}).strict().superRefine((resolution, context) => {
  for (const change of resolution.resourceChanges) {
    if (change.after - change.before !== change.delta) context.addIssue({ code: "custom", message: "Resource delta must match before and after values." });
  }
});
const EventEntrySchema = z.object({
  id: IdSchema, text: boundedString(1, 280), createdAt: TimestampSchema,
  decisionId: IdSchema.optional(), winningOptionId: IdSchema.optional(), outcomeId: IdSchema.optional(),
  socialCue: z.enum(["success", "setback", "danger", "neutral"]).optional(), deathCharacterIds: z.array(IdSchema).max(8).optional(),
  resolution: ResolvedDecisionSchema.optional(),
  motorboat: MotorboatFactsSchema.optional(),
}).strict().superRefine((event, context) => {
  if (!event.resolution) return;
  if (event.decisionId !== event.resolution.decisionId || event.winningOptionId !== event.resolution.winningOptionId || event.outcomeId !== event.resolution.outcomeId || event.socialCue !== event.resolution.presentationCue) {
    context.addIssue({ code: "custom", message: "Resolved event identifiers must match the compact history fields." });
  }
});
const PublicDecisionSchema = z.object({
  id: IdSchema,
  prompt: boundedString(1, 280),
  options: z.array(z.object({
    id: IdSchema,
    label: boundedString(1, 160),
    assignment: z.object({ roleLabel: boundedString(1, 100), eligibleCharacterIds: z.array(IdSchema).max(8) }).strict().optional(),
  }).strict()).min(1).max(4),
}).strict();
const ActiveAssignmentSchema = z.object({
  id: IdSchema,
  decisionId: IdSchema,
  optionId: IdSchema,
  actorCharacterId: IdSchema,
  roleLabel: boundedString(1, 100),
  deadlineAt: TimestampSchema,
}).strict();
export const EndingIdSchema = EndingIdSchemaInternal;
const PublicMotorboatSchema = z.object({ node: MotorboatNodeSchema, discovered:z.boolean(), hull:z.enum(["unknown","sound","leaking"]), engine:z.enum(["unknown","broken","sturdy","fragile"]), fuelAvailability:z.enum(["none","shared","known-private"]), fuelCharges:z.number().int().min(0).max(3).optional(), warningLevel:z.union([z.literal(0),z.literal(1),z.literal(2)]), missCount:z.number().int().min(0).max(3), completion:z.union([z.literal("active"),EndingIdSchemaInternal]) }).strict().superRefine((route,ctx)=>{ if(route.fuelAvailability!=="shared" && route.fuelCharges!==undefined) ctx.addIssue({code:"custom",message:"Private fuel charges must not be exposed."}); });
const ActivePrivateChoiceSchema = z.object({id:IdSchema,kind:z.enum(["fuel-discovery","launch-custodian"]),deadlineAt:TimestampSchema,publicActorCharacterId:IdSchema.optional()}).strict();
const ViewerPrivateChoiceSchema = z.object({canRespond:z.literal(true),optionIds:z.array(z.enum(["share","hide","transfer","wake","solo","quiet"])).min(1).max(3),transferableTargetCharacterIds:z.array(IdSchema).max(8).optional()}).strict();
const EscapeResultSchema = z.object({type:EndingIdSchemaInternal,escapedCharacterIds:z.array(IdSchema).max(8),strandedCharacterIds:z.array(IdSchema).max(8),deadCharacterIds:z.array(IdSchema).max(8),cause:z.enum(["group-launch","solo-launch","storm-surge","all-dead"]),epilogueId:z.enum(["motorboat-group-aftermath-v1","motorboat-selfish-aftermath-v1","motorboat-storm-aftermath-v1","motorboat-all-dead-aftermath-v1"])}).strict().superRefine((result,ctx)=>{
  const all=[...result.escapedCharacterIds,...result.strandedCharacterIds,...result.deadCharacterIds]; if(new Set(all).size!==all.length) ctx.addIssue({code:"custom",message:"Ending character sets must be disjoint and contain no duplicates."});
  const expected = result.type==="group-escape" ? ["group-launch","motorboat-group-aftermath-v1"] : result.type==="solo-escape" ? ["solo-launch","motorboat-selfish-aftermath-v1"] : result.cause==="storm-surge" ? ["storm-surge","motorboat-storm-aftermath-v1"] : ["all-dead","motorboat-all-dead-aftermath-v1"];
  if(result.cause!==expected[0]||result.epilogueId!==expected[1]) ctx.addIssue({code:"custom",message:"Ending type, cause, and epilogue must agree."});
  if(result.type==="group-escape"&&result.strandedCharacterIds.length) ctx.addIssue({code:"custom",message:"A group escape cannot strand living characters."});
  if(result.type==="solo-escape"&&result.escapedCharacterIds.length!==1) ctx.addIssue({code:"custom",message:"A solo escape has exactly one passenger."});
  if(result.type==="no-survivors"&&(result.escapedCharacterIds.length||result.strandedCharacterIds.length)) ctx.addIssue({code:"custom",message:"A no-survivor ending cannot list living characters."});
});

export const PublicGameSnapshotSchema = z.object({
  code: z.string().regex(/^[A-HJ-NP-Z2-9]{6}$/), revision: z.number().int().nonnegative(), phase: GamePhaseSchema,
  hostPlayerId: IdSchema, phaseStartedAt: TimestampSchema.nullable(), phaseDeadlineAt: TimestampSchema.nullable(),
  votingOpensAt: TimestampSchema.nullable(), earliestResolveAt: TimestampSchema.nullable(), phaseEndsAt: TimestampSchema.nullable(), players: z.array(PlayerSchema).max(8),
  characters: z.array(CharacterStateSchema).max(8), characterCatalog: z.array(CharacterDefinitionSchema).max(9),
  resources: ResourcesSchema, currentDecision: PublicDecisionSchema.nullable(), decisionNumber: z.number().int().min(0).max(10),
  totalDecisions: z.number().int().min(0).max(10), eligibleVoterIds: z.array(IdSchema).max(8), eventHistory: z.array(EventEntrySchema).max(50),
  viewer: z.object({ playerId: IdSchema, hasVoted: z.boolean() }).strict(),
  crashItemOffer: z.array(IdSchema).length(3).refine((items) => new Set(items).size === 3, "Item offers must contain three distinct items.").optional(),
  viewerCrashChoices: z.object({ hasSelectedItem: z.boolean(), hasSelectedRescueTarget: z.boolean(), selectedItemId: IdSchema.optional(), selectedTargetCharacterId: IdSchema.optional() }).strict().optional(),
  crashResolution: CrashResolutionSchema.optional(),
  resolvedOptionCounts: z.record(IdSchema, z.number().int().nonnegative()).optional(), winningOptionId: IdSchema.optional(), endingId: EndingIdSchema.optional(),
  activeAssignment: ActiveAssignmentSchema.optional(),
  viewerAssignment: z.object({ canRespond: z.literal(true), qualitativeRisk: z.enum(["favorable", "uncertain", "risky"]) }).strict().optional(),
  motorboat: PublicMotorboatSchema.optional(), activePrivateChoice:ActivePrivateChoiceSchema.optional(), viewerPrivateChoice:ViewerPrivateChoiceSchema.optional(), escapeResult:EscapeResultSchema.optional(),
}).strict().superRefine((snapshot, context) => {
  const mayRevealVotes = snapshot.phase === "assignmentResponse" || snapshot.phase === "reveal" || snapshot.phase === "ending";
  if (!mayRevealVotes && (snapshot.resolvedOptionCounts !== undefined || snapshot.winningOptionId !== undefined)) context.addIssue({ code: "custom", message: "Vote totals are private until reveal." });
  if (snapshot.phase === "reveal" && (!snapshot.resolvedOptionCounts || !snapshot.winningOptionId)) context.addIssue({ code: "custom", message: "Reveal snapshots require totals and a winner." });
  if ((snapshot.phase === "ending") !== (snapshot.endingId !== undefined)) context.addIssue({ code: "custom", message: "Ending IDs are exposed only for ending snapshots." });
  if (snapshot.crashItemOffer && snapshot.phase !== "crashItemChoice") context.addIssue({ code: "custom", message: "Private item offers are exposed only during item choice." });
  if (snapshot.phase === "crashResolution" && !snapshot.crashResolution) context.addIssue({ code: "custom", message: "Crash resolution snapshots require the committed crash report." });
  if (snapshot.crashResolution && ["intro", "crashItemChoice", "crashRescueChoice"].includes(snapshot.phase)) context.addIssue({ code: "custom", message: "Crash results remain private until crash resolution." });
  if (snapshot.phase === "assignmentResponse" && (!snapshot.activeAssignment || !snapshot.resolvedOptionCounts || !snapshot.winningOptionId)) context.addIssue({ code: "custom", message: "Assignment response snapshots require the assignment and committed vote result." });
  if (snapshot.phase !== "assignmentResponse" && (snapshot.activeAssignment || snapshot.viewerAssignment)) context.addIssue({ code: "custom", message: "Active assignment data is exposed only during assignment response." });
  if (snapshot.viewerAssignment && !snapshot.activeAssignment) context.addIssue({ code: "custom", message: "Viewer assignment controls require an active assignment." });
  if (snapshot.viewerAssignment && snapshot.activeAssignment) {
    const viewerCharacterId = snapshot.players.find(({ id }) => id === snapshot.viewer.playerId)?.characterId;
    if (viewerCharacterId !== snapshot.activeAssignment.actorCharacterId) context.addIssue({ code: "custom", message: "Assignment response controls belong only to the assigned character's player." });
  }
  if (snapshot.phase !== "privateChoice" && (snapshot.activePrivateChoice || snapshot.viewerPrivateChoice)) context.addIssue({code:"custom",message:"Private choice data is exposed only during its phase."});
  if (snapshot.viewerPrivateChoice && !snapshot.activePrivateChoice) context.addIssue({code:"custom",message:"Viewer controls require an active private choice."});
  if(snapshot.viewerPrivateChoice&&snapshot.activePrivateChoice){ const opts=snapshot.viewerPrivateChoice.optionIds; const allowed=snapshot.activePrivateChoice.kind==="fuel-discovery"?["share","hide","transfer"]:["wake","solo","quiet"]; if(opts.some((id)=>!allowed.includes(id))) context.addIssue({code:"custom",message:"Private choice options must match their choice kind."}); if((snapshot.viewerPrivateChoice.transferableTargetCharacterIds!==undefined)!==(snapshot.activePrivateChoice.kind==="fuel-discovery")) context.addIssue({code:"custom",message:"Transfer targets belong only to fuel choices."}); }
  if(snapshot.escapeResult){ const represented=new Set([...snapshot.escapeResult.escapedCharacterIds,...snapshot.escapeResult.strandedCharacterIds,...snapshot.escapeResult.deadCharacterIds]); const selected=snapshot.characters.map(({characterId})=>characterId); if(selected.some((id)=>!represented.has(id))||represented.size!==selected.length) context.addIssue({code:"custom",message:"Ending sets must cover every selected character exactly once."}); }
});

const CommandBase = { protocolVersion: z.literal(PROTOCOL_VERSION), commandId: boundedString(1, 64) };
export const ClientCommandSchema = z.discriminatedUnion("type", [
  z.object({ ...CommandBase, type: z.literal("character.select"), payload: z.object({ characterId: IdSchema }).strict() }).strict(),
  z.object({ ...CommandBase, type: z.literal("room.remove-player"), payload: z.object({ playerId: IdSchema }).strict() }).strict(),
  z.object({ ...CommandBase, type: z.literal("room.set-ready"), payload: z.object({ ready: z.boolean() }).strict() }).strict(),
  z.object({ ...CommandBase, type: z.literal("room.start"), payload: z.object({}).strict() }).strict(),
  z.object({ ...CommandBase, type: z.literal("vote.submit"), payload: z.object({ optionId: IdSchema, assignedCharacterId: IdSchema.optional() }).strict() }).strict(),
  z.object({ ...CommandBase, type: z.literal("assignment.respond"), payload: z.object({ assignmentId: IdSchema, response: z.enum(["accept", "try-refuse"]) }).strict() }).strict(),
  z.object({ ...CommandBase, type: z.literal("private-choice.respond"), payload: z.object({ choiceId: IdSchema, optionId: z.enum(["share","hide","transfer","wake","solo","quiet"]), targetCharacterId:IdSchema.optional() }).strict() }).strict(),
  z.object({ ...CommandBase, type: z.literal("crash.item.submit"), payload: z.object({ itemId: IdSchema }).strict() }).strict(),
  z.object({ ...CommandBase, type: z.literal("crash.rescue.submit"), payload: z.object({ targetCharacterId: IdSchema }).strict() }).strict(),
  z.object({ ...CommandBase, type: z.literal("client.ping"), payload: z.object({ sentAt: TimestampSchema }).strict() }).strict(),
]);
export const CommandErrorCodeSchema = z.enum(["INVALID_MESSAGE", "UNAUTHORIZED", "WRONG_PHASE", "INVALID_CHARACTER", "CHARACTER_TAKEN", "INVALID_OPTION", "INVALID_ASSIGNMENT", "INVALID_PRIVATE_CHOICE", "INVALID_ITEM", "INVALID_RESCUE_TARGET", "SESSION_FULL", "SESSION_EXPIRED"]);
const WelcomePayloadSchema = z.object({ playerId: IdSchema, resumeToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/).optional() }).strict();
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
  const revealVotes = state.phase === "assignmentResponse" || state.phase === "reveal" || state.phase === "ending";
  const viewerCrashItemOffer = state.phase === "crashItemChoice" ? state.crashItemOffersByPlayer?.[viewerPlayerId] : undefined;
  const revealCrashResolution = state.phase === "crashResolution" || state.phase === "decision" || state.phase === "assignmentResponse" || state.phase === "privateChoice" || state.phase === "reveal" || state.phase === "ending";
  const visibleCharacters = Object.values(state.characters).map((character) => {
    if (revealCrashResolution) return character;
    const { startingItemId: _privateStartingItemId, ...publicCharacter } = character;
    return publicCharacter;
  });
  const snapshot = {
    code: state.code, revision: state.revision, phase: state.phase, hostPlayerId: state.hostPlayerId,
    phaseStartedAt: state.phaseStartedAt, phaseDeadlineAt: state.phaseDeadlineAt, votingOpensAt: state.votingOpensAt,
    earliestResolveAt: state.earliestResolveAt, phaseEndsAt: state.phaseEndsAt,
    players: Object.values(state.players), characters: visibleCharacters, characterCatalog, resources: state.resources,
    currentDecision: activeCard ? {
      id: activeCard.id,
      prompt: activeCard.prompt,
      options: activeCard.options.map(({ id, label, assignment }) => ({
        id,
        label,
        ...(assignment ? {
          assignment: {
            roleLabel: assignment.roleLabel,
            eligibleCharacterIds: Object.values(state.characters).filter(({ status }) => status === "alive").map(({ characterId }) => characterId).sort(),
          },
        } : {}),
      })),
    } : null,
    decisionNumber: state.currentDecisionId ? state.decisionIndex + 1 : 0, totalDecisions: state.deck.length,
    eligibleVoterIds: [...state.eligibleVoterIds], eventHistory: [...state.eventHistory],
    viewer: { playerId: viewerPlayerId, hasVoted: viewerPlayerId in state.votesByPlayer },
    ...(viewerCrashItemOffer ? { crashItemOffer: [...viewerCrashItemOffer] } : {}),
    viewerCrashChoices: {
      hasSelectedItem: viewerPlayerId in (state.crashItemsByPlayer ?? {}),
      hasSelectedRescueTarget: viewerPlayerId in (state.rescueTargetsByPlayer ?? {}),
      ...(state.crashItemsByPlayer?.[viewerPlayerId] ? { selectedItemId: state.crashItemsByPlayer[viewerPlayerId] } : {}),
      ...(state.rescueTargetsByPlayer?.[viewerPlayerId] ? { selectedTargetCharacterId: state.rescueTargetsByPlayer[viewerPlayerId] } : {}),
    },
    ...(revealCrashResolution && state.crashResolution ? { crashResolution: state.crashResolution } : {}),
    ...(revealVotes && state.resolvedOptionCounts && state.winningOptionId ? { resolvedOptionCounts: { ...state.resolvedOptionCounts }, winningOptionId: state.winningOptionId } : {}),
    ...(state.phase === "ending" && state.endingId ? { endingId: state.endingId } : {}),
    ...(state.motorboat ? { motorboat: {
      node: state.motorboat.node, discovered: state.motorboat.discovered, hull: state.motorboat.hull, engine: state.motorboat.engine,
      fuelAvailability: state.motorboat.fuelVisibility,
      ...(state.motorboat.fuelVisibility === "shared" ? { fuelCharges: state.motorboat.fuelCharges } : {}),
      warningLevel: state.motorboat.warningLevel, missCount: state.motorboat.missedOpportunityIds.length, completion: state.motorboat.completion,
    } } : {}),
    ...(state.phase === "ending" && state.escapeResult ? { escapeResult: state.escapeResult } : {}),
    ...(state.phase === "assignmentResponse" && state.pendingAssignment ? {
      activeAssignment: {
        id: state.pendingAssignment.id,
        decisionId: state.pendingAssignment.decisionId,
        optionId: state.pendingAssignment.optionId,
        actorCharacterId: state.pendingAssignment.actorCharacterId,
        roleLabel: state.pendingAssignment.roleLabel,
        deadlineAt: state.pendingAssignment.deadlineAt,
      },
      ...(state.pendingAssignment.actorPlayerId === viewerPlayerId ? {
        viewerAssignment: {
          canRespond: true as const,
          qualitativeRisk: activeCard?.options.find(({ id }) => id === state.pendingAssignment?.optionId)?.assignment?.refusal.qualitativeRisk ?? "uncertain" as const,
        },
      } : {}),
    } : {}),
    ...(state.phase === "privateChoice" && state.pendingPrivateChoice ? {
      activePrivateChoice: {
        id: state.pendingPrivateChoice.id, kind: state.pendingPrivateChoice.kind, deadlineAt: state.pendingPrivateChoice.deadlineAt,
        ...(state.pendingPrivateChoice.publicActorCharacterId ? { publicActorCharacterId: state.pendingPrivateChoice.publicActorCharacterId } : {}),
      },
      ...(state.pendingPrivateChoice.actorPlayerId === viewerPlayerId ? { viewerPrivateChoice: {
        canRespond: true as const, optionIds: [...state.pendingPrivateChoice.allowedOptionIds],
        ...(state.pendingPrivateChoice.kind === "fuel-discovery" ? { transferableTargetCharacterIds: Object.values(state.characters).filter(({status,characterId})=>status==="alive" && characterId!==state.pendingPrivateChoice?.actorCharacterId).map(({characterId})=>characterId).sort() } : {}),
      } } : {}),
    } : {}),
  } satisfies PublicGameSnapshot;
  return snapshot;
}
