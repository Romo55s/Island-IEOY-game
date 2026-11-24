import { Server, type Connection, type ConnectionContext, type WSMessage } from "partyserver";

import { CHARACTER_CATALOG, INITIAL_CHARACTER_RESOURCES, MAX_PLAYER_COUNT, PROTOCOL_VERSION, type PrivateRoomState } from "../../src/shared/domain";
import { DECISION_CARDS } from "../../src/shared/content/decisionCards";
import { SURVIVAL_ITEMS } from "../../src/shared/content/items";
import {
  ClientCommandSchema,
  toPublicSnapshot,
  type AdmissionResponse,
  type ClientCommand,
  type CommandErrorCode,
  type ServerEvent,
} from "../../src/shared/protocol";
import { cryptoRandom } from "../../src/shared/rules/random";
import { resolvePendingPrivateChoice, startGame } from "../../src/shared/rules/stateMachine";
import { derivePasswordDigest, verifyPassword } from "../auth/passwords";
import { isRateLimited, recordFailure } from "../auth/rateLimit";
import { deriveResumeToken, randomPlayerId, randomToken, TICKET_TTL_MS, tokenDigest } from "../auth/tickets";
import { allConnectedPlayersVoted, nextAlarmAt, processDueEvents } from "./roomScheduler";
import {
  loadRoom,
  markActivity,
  newPrivateRoom,
  pruneTickets,
  saveRoom,
  type AdmissionTicketRecord,
  type PersistedRoomState,
  type RoomResult,
} from "./roomStorage";

type ConnectionMetadata = { playerId: string; nonce: string };

export interface InitializeRoomInput {
  code: string;
  displayName: string;
  password: string;
  now: number;
}

export interface IssueTicketInput {
  mode: "join" | "resume";
  displayName?: string;
  password?: string;
  resumeToken?: string;
  address: string;
  now: number;
}

type InitializeResult = { created: false } | { created: true; admission: AdmissionResponse };

export class GameRoom extends Server<Env> {
  static options = { hibernate: true };

  async initialize(input: InitializeRoomInput): Promise<InitializeResult> {
    if (await loadRoom(this.ctx.storage)) return { created: false };
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const passwordDigest = await derivePasswordDigest(input.password, salt);
    const playerId = randomPlayerId();
    let room = newPrivateRoom({ code: input.code, playerId, now: input.now, passwordSalt: salt, passwordDigest });
    const issued = await this.addTicket(room, { playerId, displayName: input.displayName, mode: "join", now: input.now });
    room = issued.room;
    await saveRoom(this.ctx.storage, room);
    await this.schedule(room);
    return { created: true, admission: this.admission(room.code, issued.ticket, issued.resumeToken, issued.record) };
  }

  async issueTicket(input: IssueTicketInput): Promise<RoomResult<AdmissionResponse>> {
    let room = await loadRoom(this.ctx.storage);
    if (!room || room.phase === "expired" || input.now >= room.expiresAt) {
      return { ok: false, status: 404, code: "ROOM_NOT_FOUND", message: "That session does not exist or has expired." };
    }
    room = pruneTickets(room, input.now);

    let playerId: string;
    let displayName: string;
    if (input.mode === "join") {
      if (room.phase !== "lobby") return { ok: false, status: 409, code: "GAME_ALREADY_STARTED", message: "The game has already started." };
      if (Object.keys(room.players).length >= MAX_PLAYER_COUNT) return { ok: false, status: 409, code: "ROOM_FULL", message: `The session already has ${MAX_PLAYER_COUNT} players.` };
      if (isRateLimited(room.failedAttemptsByAddress[input.address], input.now)) {
        return { ok: false, status: 429, code: "RATE_LIMITED", message: "Too many password attempts. Try again shortly." };
      }
      const passwordMatches = await verifyPassword(input.password ?? "", room.passwordSalt, room.passwordDigest);
      if (!passwordMatches) {
        room.failedAttemptsByAddress[input.address] = recordFailure(room.failedAttemptsByAddress[input.address], input.now);
        await saveRoom(this.ctx.storage, room);
        return { ok: false, status: 401, code: "INVALID_PASSWORD", message: "The session password is incorrect." };
      }
      playerId = randomPlayerId();
      displayName = input.displayName!;
    } else {
      const resumeDigest = await tokenDigest(input.resumeToken ?? "");
      const match = Object.entries(room.resumeDigestsByPlayer).find(([, digest]) => digest === resumeDigest);
      const player = match ? room.players[match[0]] : undefined;
      if (!match || !player) return { ok: false, status: 401, code: "TICKET_INVALID", message: "The resume token is no longer valid." };
      playerId = match[0];
      displayName = player.displayName;
    }

    const issued = await this.addTicket(room, { playerId, displayName, mode: input.mode, now: input.now });
    room = issued.room;
    await saveRoom(this.ctx.storage, room);
    await this.schedule(room);
    return { ok: true, value: this.admission(room.code, issued.ticket, issued.resumeToken, issued.record) };
  }

  async consumeTicket(ticket: string, now: number): Promise<RoomResult<{ playerId: string; resumeToken: string }>> {
    const digest = await tokenDigest(ticket);
    const resumeToken = await deriveResumeToken(ticket);
    return this.ctx.storage.transaction(async (transaction) => {
      let room = await loadRoom(transaction);
      if (!room || room.phase === "expired" || now >= room.expiresAt) {
        return { ok: false, status: 404, code: "ROOM_NOT_FOUND", message: "That session does not exist or has expired." };
      }
      const record = room.tickets[digest];
      if (!record) return { ok: false, status: 401, code: "TICKET_INVALID", message: "The connection ticket is invalid." };
      if (record.consumedAt !== null) return { ok: false, status: 401, code: "TICKET_INVALID", message: "The connection ticket was already used." };
      if (record.expiresAt <= now) {
        room = pruneTickets(room, now);
        await saveRoom(transaction, room);
        return { ok: false, status: 401, code: "TICKET_EXPIRED", message: "The connection ticket has expired." };
      }

      const existingPlayer = room.players[record.playerId];
      if (record.mode === "join" && !existingPlayer) {
        if (room.phase !== "lobby") return { ok: false, status: 409, code: "GAME_ALREADY_STARTED", message: "The game has already started." };
        if (Object.keys(room.players).length >= MAX_PLAYER_COUNT) return { ok: false, status: 409, code: "ROOM_FULL", message: `The session already has ${MAX_PLAYER_COUNT} players.` };
        room.players[record.playerId] = {
          id: record.playerId,
          displayName: record.displayName,
          status: "alive",
          characterId: null,
          ready: false,
          connected: false,
          joinedAt: now,
        };
        if (Object.keys(room.players).length === 1) room.hostPlayerId = record.playerId;
      } else if (!existingPlayer) {
        return { ok: false, status: 401, code: "TICKET_INVALID", message: "That player identity is no longer admitted." };
      }

      room.tickets[digest] = { ...record, consumedAt: now };
      room.resumeDigestsByPlayer[record.playerId] = record.resumeDigest;
      room = markActivity({ ...room, revision: room.revision + 1 }, now);
      await saveRoom(transaction, room);
      return { ok: true, value: { playerId: record.playerId, resumeToken } };
    });
  }

  async onConnect(connection: Connection, context: ConnectionContext): Promise<void> {
    const ticket = context.request.headers.get("x-ieoy-ticket");
    if (!ticket) {
      connection.close(4003, "Missing connection ticket");
      return;
    }
    const consumed = await this.consumeTicket(ticket, Date.now());
    if (!consumed.ok) {
      connection.close(4003, consumed.code);
      return;
    }
    for (const other of this.getConnections<ConnectionMetadata>()) {
      if (other.id !== connection.id && other.state?.playerId === consumed.value.playerId) other.close(4000, "Replaced by a newer connection");
    }
    connection.setState({ playerId: consumed.value.playerId, nonce: randomToken(12) });

    let room = await loadRoom(this.ctx.storage);
    if (!room) return;
    if (room.hostMigrationPending && !this.onlinePlayerIds().has(room.hostPlayerId)) {
      room = { ...room, revision: room.revision + 1, hostPlayerId: consumed.value.playerId, hostMigrationPending: false };
      await saveRoom(this.ctx.storage, room);
    }
    this.sendEvent(connection, {
      protocolVersion: PROTOCOL_VERSION,
      type: "session.welcome",
      payload: { playerId: consumed.value.playerId, resumeToken: consumed.value.resumeToken, serverNow: Date.now() },
    });
    await this.sendViewerSnapshots(room);
    await this.schedule(this.withPresence(room));
  }

  async onMessage(connection: Connection<ConnectionMetadata>, message: WSMessage): Promise<void> {
    const metadata = connection.state;
    if (!metadata) return;
    if (typeof message !== "string" || new TextEncoder().encode(message).byteLength > 4_096) {
      this.reject(connection, "invalid", "INVALID_MESSAGE", "Messages must be UTF-8 JSON no larger than 4 KiB.");
      return;
    }
    let raw: unknown;
    try {
      raw = JSON.parse(message);
    } catch {
      this.reject(connection, "invalid", "INVALID_MESSAGE", "The message is not valid JSON.");
      return;
    }
    const parsed = ClientCommandSchema.safeParse(raw);
    if (!parsed.success) {
      const commandId = typeof raw === "object" && raw !== null && "commandId" in raw && typeof raw.commandId === "string" ? raw.commandId.slice(0, 64) : "invalid";
      this.reject(connection, commandId || "invalid", "INVALID_MESSAGE", "The command does not match the protocol.");
      return;
    }
    await this.applyCommand(connection, metadata.playerId, parsed.data, Date.now());
  }

  async onClose(connection: Connection<ConnectionMetadata>): Promise<void> {
    const playerId = connection.state?.playerId;
    if (!playerId) return;
    let room = await loadRoom(this.ctx.storage);
    if (!room || !room.players[playerId]) return;
    const presence = this.withPresence(room);
    room = { ...room, revision: room.revision + 1 };
    if (room.hostPlayerId === playerId && !presence.players[playerId]?.connected && room.hostMigrationAt === null) {
      room.hostMigrationAt = Date.now() + 30_000;
    }
    const due = processDueEvents({ ...room, players: presence.players }, Date.now(), cryptoRandom);
    room = this.withoutPresence(due);
    await saveRoom(this.ctx.storage, room);
    await this.sendViewerSnapshots(room);
    await this.schedule(this.withPresence(room));
  }

  async onAlarm(): Promise<void> {
    let room = await loadRoom(this.ctx.storage);
    if (!room) return;
    room = this.withoutPresence(processDueEvents(this.withPresence(room), Date.now(), cryptoRandom));
    await saveRoom(this.ctx.storage, room);
    await this.sendViewerSnapshots(room);
    if (room.phase === "expired") {
      for (const connection of this.getConnections()) connection.close(4001, "SESSION_EXPIRED");
      await this.ctx.storage.deleteAll();
      return;
    }
    await this.schedule(this.withPresence(room));
  }

  onRequest(): Response {
    return new Response("WebSocket upgrade required", { status: 426, headers: { Upgrade: "websocket" } });
  }

  private async applyCommand(connection: Connection<ConnectionMetadata>, playerId: string, command: ClientCommand, now: number): Promise<void> {
    let room = await loadRoom(this.ctx.storage);
    if (!room || room.phase === "expired") {
      this.reject(connection, command.commandId, "SESSION_EXPIRED", "The session has expired.");
      return;
    }
    const recentIds = room.processedCommandIdsByPlayer[playerId] ?? [];
    if (recentIds.includes(command.commandId)) {
      if (command.type === "client.ping") {
        this.sendEvent(connection, {
          protocolVersion: PROTOCOL_VERSION,
          type: "server.pong",
          payload: { sentAt: command.payload.sentAt, receivedAt: now },
        });
      } else {
        this.sendSnapshot(connection, room, playerId);
      }
      return;
    }
    const player = room.players[playerId];
    if (!player) {
      this.reject(connection, command.commandId, "UNAUTHORIZED", "This player is not admitted.");
      return;
    }

    if (command.type === "client.ping") {
      room.processedCommandIdsByPlayer[playerId] = [...recentIds, command.commandId].slice(-128);
      room = markActivity(room, now);
      await saveRoom(this.ctx.storage, room);
      this.sendEvent(connection, {
        protocolVersion: PROTOCOL_VERSION,
        type: "server.pong",
        payload: { sentAt: command.payload.sentAt, receivedAt: now },
      });
      await this.schedule(this.withPresence(room));
      return;
    }

    const revisionBeforeCommand = room.revision;
    const failure = this.mutateForCommand(room, playerId, command, now);
    if (failure) {
      this.reject(connection, command.commandId, failure.code, failure.message);
      return;
    }
    room = failure === null ? room : failure;
    room.processedCommandIdsByPlayer[playerId] = [...recentIds, command.commandId].slice(-128);
    room = markActivity(
      { ...room, revision: room.revision === revisionBeforeCommand ? revisionBeforeCommand + 1 : room.revision },
      now,
    );
    room = this.withoutPresence(processDueEvents(this.withPresence(room), now, cryptoRandom));
    await saveRoom(this.ctx.storage, room);
    await this.sendViewerSnapshots(room);
    await this.schedule(this.withPresence(room));
  }

  private mutateForCommand(
    room: PersistedRoomState,
    playerId: string,
    command: ClientCommand,
    now: number,
  ): null | { code: CommandErrorCode; message: string } {
    const player = room.players[playerId]!;
    if (command.type === "character.select") {
      if (room.phase !== "lobby") return { code: "WRONG_PHASE", message: "Characters can only be selected in the lobby." };
      if (!CHARACTER_CATALOG.some(({ id }) => id === command.payload.characterId)) return { code: "INVALID_CHARACTER", message: "That character does not exist." };
      const taken = Object.values(room.players).some(({ id, characterId }) => id !== playerId && characterId === command.payload.characterId);
      if (taken) return { code: "CHARACTER_TAKEN", message: "Another player already claimed that character." };
      if (player.characterId) delete room.characters[player.characterId];
      player.characterId = command.payload.characterId;
      player.ready = false;
      room.characters[command.payload.characterId] = { characterId: command.payload.characterId, status: player.status, resources: { ...INITIAL_CHARACTER_RESOURCES } };
      return null;
    }
    if (command.type === "room.set-ready") {
      if (room.phase !== "lobby") return { code: "WRONG_PHASE", message: "Ready state is only available in the lobby." };
      if (command.payload.ready && !player.characterId) return { code: "INVALID_CHARACTER", message: "Choose a character before becoming ready." };
      player.ready = command.payload.ready;
      return null;
    }
    if (command.type === "room.remove-player") {
      if (room.phase !== "lobby") return { code: "WRONG_PHASE", message: "Players can only be removed in the lobby." };
      if (room.hostPlayerId !== playerId || command.payload.playerId === playerId) return { code: "UNAUTHORIZED", message: "Only the host may remove another player." };
      const target = room.players[command.payload.playerId];
      if (!target) return { code: "UNAUTHORIZED", message: "That player is not in this session." };
      if (target.characterId) delete room.characters[target.characterId];
      delete room.resumeDigestsByPlayer[target.id];
      delete room.processedCommandIdsByPlayer[target.id];
      delete room.players[target.id];
      for (const targetConnection of this.getConnections<ConnectionMetadata>()) {
        if (targetConnection.state?.playerId === target.id) targetConnection.close(4004, "Removed by host");
      }
      return null;
    }
    if (command.type === "room.start") {
      if (room.phase !== "lobby") return { code: "WRONG_PHASE", message: "The session is not in the lobby." };
      if (room.hostPlayerId !== playerId) return { code: "UNAUTHORIZED", message: "Only the host may start the game." };
      const presence = this.withPresence(room);
      const connected = Object.values(presence.players).filter(({ connected }) => connected);
      if (connected.length < 2 || connected.length > MAX_PLAYER_COUNT) return { code: "SESSION_FULL", message: `Two to ${MAX_PLAYER_COUNT} connected players are required.` };
      if (Object.values(room.players).some(({ characterId }) => characterId === null)) return { code: "INVALID_CHARACTER", message: "Every player needs a character." };
      if (connected.some(({ ready }) => !ready)) return { code: "UNAUTHORIZED", message: "Every connected player must be ready." };
      const started = startGame(room, now, DECISION_CARDS, cryptoRandom) as PersistedRoomState;
      Object.assign(room, started);
      return null;
    }
    if (command.type === "vote.submit") {
      if (room.phase !== "decision") return { code: "WRONG_PHASE", message: "Voting is not active." };
      if (room.votingOpensAt === null || now < room.votingOpensAt || room.phaseDeadlineAt === null || now >= room.phaseDeadlineAt) {
        return { code: "WRONG_PHASE", message: "The voting window is closed." };
      }
      const card = room.deck.find(({ id }) => id === room.currentDecisionId);
      const option = card?.options.find(({ id }) => id === command.payload.optionId);
      if (!option) return { code: "INVALID_OPTION", message: "That option is not available." };
      if (option.targetSelection) {
        const target = command.payload.targetCharacterId;
        if (!target || room.characters[target]?.status !== "alive" || !Object.values(room.players).some(p => p.characterId === target && p.status === "alive")) return {code:"INVALID_OPTION",message:"Choose a living target."};
        if (command.payload.assignedCharacterId) return {code:"INVALID_ASSIGNMENT",message:"This choice selects a target, not a worker."};
        room.targetNominationsByPlayer = {...room.targetNominationsByPlayer, [playerId]:target};
      } else {
        if (command.payload.targetCharacterId) return {code:"INVALID_OPTION",message:"This option does not select a target."};
        if (room.targetNominationsByPlayer) delete room.targetNominationsByPlayer[playerId];
      }
      if (option.assignment) {
        const nominated = command.payload.assignedCharacterId;
        const assignedPlayer = nominated
          ? Object.values(room.players).find(({ characterId }) => characterId === nominated)
          : undefined;
        if (!nominated || assignedPlayer?.status !== "alive" || room.characters[nominated]?.status !== "alive" || (option.assignment.requiredStartingItemId && room.characters[nominated]?.startingItemId !== option.assignment.requiredStartingItemId)) {
          return { code: "INVALID_ASSIGNMENT", message: "Choose a living character for this task." };
        }
        room.assignmentNominationsByPlayer = { ...(room.assignmentNominationsByPlayer ?? {}), [playerId]: nominated };
      } else {
        if (command.payload.assignedCharacterId) return { code: "INVALID_ASSIGNMENT", message: "That option does not assign a character." };
        if (room.assignmentNominationsByPlayer) delete room.assignmentNominationsByPlayer[playerId];
      }
      room.votesByPlayer[playerId] = command.payload.optionId;
      return null;
    }
    if (command.type === "assignment.respond") {
      const pending = room.pendingAssignment;
      if (room.phase !== "assignmentResponse" || !pending || pending.id !== command.payload.assignmentId || pending.actorPlayerId !== playerId || pending.response !== null || now >= pending.deadlineAt || player.status !== "alive" || !player.characterId || player.characterId !== pending.actorCharacterId || room.characters[pending.actorCharacterId]?.status !== "alive") {
        return { code: "INVALID_ASSIGNMENT", message: "That assignment response is not available." };
      }
      pending.response = command.payload.response;
      return null;
    }
    if (command.type === "private-choice.respond") {
      const choice=room.pendingPrivateChoice;
      if (room.phase!=="privateChoice" || !choice || choice.id!==command.payload.choiceId || choice.actorPlayerId!==playerId || choice.response!==null || now>=choice.deadlineAt || player.status!=="alive" || player.characterId!==choice.actorCharacterId || room.characters[choice.actorCharacterId]?.status!=="alive" || !choice.allowedOptionIds.includes(command.payload.optionId)) return {code:"INVALID_PRIVATE_CHOICE",message:"That private choice is not available."};
      if (command.payload.optionId==="transfer" || command.payload.optionId==="attempt-eat") {
        const target=command.payload.targetCharacterId;
        if (!target || target===choice.actorCharacterId || room.characters[target]?.status!=="alive" || !Object.values(room.players).some(({characterId,status})=>characterId===target&&status==="alive")) return {code:"INVALID_PRIVATE_CHOICE",message:"Choose another living character."};
      } else if (command.payload.targetCharacterId) return {code:"INVALID_PRIVATE_CHOICE",message:"That choice does not accept a target."};
      choice.response={optionId:command.payload.optionId,...(command.payload.targetCharacterId?{targetCharacterId:command.payload.targetCharacterId}:{})};
      const resolved=resolvePendingPrivateChoice(room,now,cryptoRandom) as PersistedRoomState;
      Object.assign(room,resolved);
      return null;
    }
    if (command.type === "crash.item.submit") {
      if (room.phase !== "crashItemChoice" || room.phaseDeadlineAt === null || now >= room.phaseDeadlineAt) return { code: "WRONG_PHASE", message: "Item choice is not active." };
      const offer = room.crashItemOffersByPlayer?.[playerId];
      if (!offer?.includes(command.payload.itemId) || !SURVIVAL_ITEMS.some(({ id }) => id === command.payload.itemId)) {
        return { code: "INVALID_ITEM", message: "Choose one of the three items offered to you." };
      }
      room.crashItemsByPlayer = { ...(room.crashItemsByPlayer ?? {}), [playerId]: command.payload.itemId };
      return null;
    }
    if (command.type === "crash.rescue.submit") {
      if (room.phase !== "crashRescueChoice" || room.phaseDeadlineAt === null || now >= room.phaseDeadlineAt) return { code: "WRONG_PHASE", message: "Rescue choice is not active." };
      if (player.status !== "alive" || !player.characterId) return { code: "INVALID_RESCUE_TARGET", message: "Ghosts cannot make physical rescue attempts." };
      const target = Object.values(room.players).find(({ characterId }) => characterId === command.payload.targetCharacterId);
      if (!target || target.status !== "alive" || !room.characters[command.payload.targetCharacterId]) {
        return { code: "INVALID_RESCUE_TARGET", message: "Choose a character who is still alive." };
      }
      room.rescueTargetsByPlayer = { ...(room.rescueTargetsByPlayer ?? {}), [playerId]: command.payload.targetCharacterId };
      return null;
    }
    return { code: "INVALID_MESSAGE", message: "Unsupported command." };
  }

  private async addTicket(room: PersistedRoomState, input: { playerId: string; displayName: string; mode: "join" | "resume"; now: number }) {
    const ticket = randomToken();
    const resumeToken = await deriveResumeToken(ticket);
    const digest = await tokenDigest(ticket);
    const record: AdmissionTicketRecord = {
      ticketDigest: digest,
      playerId: input.playerId,
      resumeDigest: await tokenDigest(resumeToken),
      displayName: input.displayName,
      mode: input.mode,
      expiresAt: input.now + TICKET_TTL_MS,
      consumedAt: null,
    };
    const pruned = pruneTickets(room, input.now);
    return { room: { ...pruned, tickets: { ...pruned.tickets, [digest]: record } }, record, ticket, resumeToken };
  }

  private admission(code: string, ticket: string, resumeToken: string, record: AdmissionTicketRecord): AdmissionResponse {
    return { code, playerId: record.playerId, resumeToken, ticket, ticketExpiresAt: record.expiresAt };
  }

  private onlinePlayerIds(): Set<string> {
    return new Set(Array.from(this.getConnections<ConnectionMetadata>()).flatMap((connection) => connection.state?.playerId ? [connection.state.playerId] : []));
  }

  private withPresence(room: PersistedRoomState): PersistedRoomState {
    const online = this.onlinePlayerIds();
    return {
      ...room,
      players: Object.fromEntries(Object.entries(room.players).map(([id, player]) => [id, { ...player, connected: online.has(id) }])),
    };
  }

  private withoutPresence(room: PersistedRoomState): PersistedRoomState {
    return {
      ...room,
      players: Object.fromEntries(Object.entries(room.players).map(([id, player]) => [id, { ...player, connected: false }])),
    };
  }

  private async sendViewerSnapshots(room: PersistedRoomState): Promise<void> {
    const withPresence = this.withPresence(room);
    for (const connection of this.getConnections<ConnectionMetadata>()) {
      const playerId = connection.state?.playerId;
      if (playerId && withPresence.players[playerId]) this.sendSnapshot(connection, withPresence, playerId);
    }
  }

  private sendSnapshot(connection: Connection, room: PrivateRoomState, playerId: string): void {
    this.sendEvent(connection, { protocolVersion: PROTOCOL_VERSION, type: "state.snapshot", payload: toPublicSnapshot(room, playerId) });
  }

  private reject(connection: Connection, commandId: string, code: CommandErrorCode, message: string): void {
    this.sendEvent(connection, { protocolVersion: PROTOCOL_VERSION, type: "command.rejected", payload: { commandId, code, message } });
  }

  private sendEvent(connection: Connection, event: ServerEvent): void {
    connection.send(JSON.stringify(event));
  }

  private async schedule(room: PersistedRoomState): Promise<void> {
    let alarmAt = nextAlarmAt(room);
    if (room.phase === "decision" && room.earliestResolveAt !== null && allConnectedPlayersVoted(room)) {
      alarmAt = alarmAt === null ? room.earliestResolveAt : Math.min(alarmAt, room.earliestResolveAt);
    }
    if (alarmAt === null) await this.ctx.storage.deleteAlarm();
    else await this.ctx.storage.setAlarm(alarmAt);
  }
}
