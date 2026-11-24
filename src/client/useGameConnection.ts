import { useCallback, useEffect, useRef, useState } from "react";
import PartySocket, { type PartySocketOptions } from "partysocket";

import { PROTOCOL_VERSION, type PrivateChoiceOptionId, type PublicGameSnapshot } from "../shared/domain";
import { ClientCommandSchema, ServerEventSchema, type AdmissionResponse, type ClientCommand } from "../shared/protocol";
import { resumeSession, SessionApiError, type SessionApiOptions } from "./sessionApi";
import { clearPendingAdmission, clearSessionCredentials, saveSessionCredentials, type SessionCredentials } from "./sessionStorage";
import { useGameStore } from "./useGameStore";

const EXPIRED_CLOSE_CODE = 4001;
const PING_INTERVAL_MS = 15_000;
const MAX_RETRIES = 6;

export type CommandInput =
  | { type: "character.select"; payload: { characterId: string } }
  | { type: "room.remove-player"; payload: { playerId: string } }
  | { type: "room.set-ready"; payload: { ready: boolean } }
  | { type: "room.start"; payload: Record<string, never> }
  | { type: "vote.submit"; payload: { optionId: string; assignedCharacterId?: string } }
  | { type: "assignment.respond"; payload: { assignmentId: string; response: "accept" | "try-refuse" } }
  | { type: "private-choice.respond"; payload: { choiceId: string; optionId: PrivateChoiceOptionId; targetCharacterId?: string } }
  | { type: "crash.item.submit"; payload: { itemId: string } }
  | { type: "crash.rescue.submit"; payload: { targetCharacterId: string } };

export type ConnectionCredentials = SessionCredentials & Partial<Pick<AdmissionResponse, "ticket" | "ticketExpiresAt">>;

interface SocketLike {
  readonly readyState: number;
  readonly retryCount?: number;
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
  send(data: string): void;
  close(code?: number, reason?: string): void;
}

export interface ConnectToSessionOptions extends SessionApiOptions {
  now?: () => number;
  pingIntervalMs?: number;
  socketFactory?: (options: PartySocketOptions) => SocketLike;
  location?: Pick<Location, "host" | "protocol">;
}

export interface GameConnection {
  sendCommand(command: CommandInput): string;
  disconnect(): void;
  leave(): void;
}

function generateCommandId(): string {
  const values = new Uint32Array(4);
  globalThis.crypto.getRandomValues(values);
  return `cmd_${Array.from(values, (value) => value.toString(16).padStart(8, "0")).join("")}`;
}

function isExpiredAdmissionError(error: unknown): boolean {
  return error instanceof SessionApiError && ["ROOM_NOT_FOUND", "TICKET_INVALID", "TICKET_EXPIRED"].includes(error.code);
}

function isExpiredSnapshot(snapshot: PublicGameSnapshot): boolean {
  return snapshot.phase === "expired";
}

export function connectToSession(initialCredentials: ConnectionCredentials, options: ConnectToSessionOptions = {}): GameConnection {
  const now = options.now ?? Date.now;
  const location = options.location ?? window.location;
  const socketFactory = options.socketFactory ?? ((socketOptions) => new PartySocket(socketOptions));
  const store = useGameStore.getState();
  let credentials: ConnectionCredentials = { ...initialCredentials };
  let initialTicket = credentials.ticket;
  let deliberatelyClosed = false;
  let hasOpened = false;
  let pingTimer: ReturnType<typeof setInterval> | undefined;
  let connectionAttemptStartedAt = now();
  let socket: SocketLike | null = null;

  const markExpired = () => {
    deliberatelyClosed = true;
    if (pingTimer) clearInterval(pingTimer);
    pingTimer = undefined;
    socket?.close(1000, "Session expired");
    clearSessionCredentials();
    useGameStore.getState().setConnectionStatus("expired");
  };

  const ticketQuery = async (): Promise<Record<string, string>> => {
    connectionAttemptStartedAt = now();
    if (initialTicket) {
      const ticket = initialTicket;
      initialTicket = undefined;
      return { ticket };
    }

    if (hasOpened || useGameStore.getState().connectionStatus === "reconnecting") {
      useGameStore.getState().setConnectionStatus("reconnecting");
    }
    try {
      const admission = await resumeSession(
        { code: credentials.code, resumeToken: credentials.resumeToken },
        { fetch: options.fetch },
      );
      credentials = {
        code: admission.code,
        playerId: admission.playerId,
        resumeToken: admission.resumeToken,
        ticket: admission.ticket,
        ticketExpiresAt: admission.ticketExpiresAt,
      };
      return { ticket: admission.ticket };
    } catch (error) {
      if (isExpiredAdmissionError(error)) markExpired();
      else useGameStore.getState().setConnectionStatus("failed");
      throw error;
    }
  };

  store.setConnectionStatus("connecting");
  socket = socketFactory({
    host: location.host,
    protocol: location.protocol === "https:" ? "wss" : "ws",
    party: "game-room",
    room: credentials.code,
    query: ticketQuery,
    minReconnectionDelay: 500,
    maxReconnectionDelay: 8_000,
    reconnectionDelayGrowFactor: 2,
    connectionTimeout: 5_000,
    maxRetries: MAX_RETRIES,
    maxEnqueuedMessages: 32,
  });

  const sendEnvelope = (command: ClientCommand) => {
    socket?.send(JSON.stringify(command));
  };

  const sendPing = () => {
    const sentAt = now();
    sendEnvelope({ protocolVersion: PROTOCOL_VERSION, commandId: generateCommandId(), type: "client.ping", payload: { sentAt } });
  };

  const onOpen: EventListener = () => {
    hasOpened = true;
    useGameStore.getState().setConnectionStatus("connected");
    if (pingTimer) clearInterval(pingTimer);
    pingTimer = setInterval(sendPing, options.pingIntervalMs ?? PING_INTERVAL_MS);
    sendPing();
  };

  const onClose: EventListener = (event) => {
    if (pingTimer) clearInterval(pingTimer);
    pingTimer = undefined;
    const closeEvent = event as CloseEvent;
    if (deliberatelyClosed) return;
    if (closeEvent.code === EXPIRED_CLOSE_CODE) {
      markExpired();
      return;
    }
    useGameStore.getState().setConnectionStatus((socket?.retryCount ?? 0) >= MAX_RETRIES ? "failed" : "reconnecting");
  };

  const onError: EventListener = () => {
    if (!deliberatelyClosed && useGameStore.getState().connectionStatus !== "expired") {
      useGameStore.getState().setConnectionStatus((socket?.retryCount ?? 0) >= MAX_RETRIES ? "failed" : "reconnecting");
    }
  };

  const onMessage: EventListener = (event) => {
    const receivedAt = now();
    const data = (event as MessageEvent<unknown>).data;
    if (typeof data !== "string") {
      useGameStore.getState().setProtocolWarning("The server sent an unsupported binary frame.");
      return;
    }

    let decoded: unknown;
    try {
      decoded = JSON.parse(data);
    } catch {
      useGameStore.getState().setProtocolWarning("The server sent malformed JSON.");
      return;
    }

    const parsed = ServerEventSchema.safeParse(decoded);
    if (!parsed.success) {
      useGameStore.getState().setProtocolWarning("The server sent a message that does not match this client version.");
      return;
    }

    useGameStore.getState().setProtocolWarning(null);
    const serverEvent = parsed.data;
    switch (serverEvent.type) {
      case "session.welcome":
        credentials = {
          ...credentials,
          playerId: serverEvent.payload.playerId,
          resumeToken: serverEvent.payload.resumeToken ?? credentials.resumeToken,
        };
        saveSessionCredentials({ code: credentials.code, playerId: credentials.playerId, resumeToken: credentials.resumeToken });
        clearPendingAdmission(credentials.code);
        useGameStore.getState().addClockSample(serverEvent.payload.serverNow, connectionAttemptStartedAt, receivedAt);
        break;
      case "state.snapshot":
        if (useGameStore.getState().acceptSnapshot(serverEvent.payload)) {
          useGameStore.getState().clearPendingCommands();
          if (isExpiredSnapshot(serverEvent.payload)) markExpired();
        }
        break;
      case "command.rejected":
        useGameStore.getState().settleCommand(serverEvent.payload.commandId, {
          code: serverEvent.payload.code,
          message: serverEvent.payload.message,
        });
        if ((serverEvent.payload.code as string) === "SESSION_EXPIRED") markExpired();
        break;
      case "server.pong":
        useGameStore.getState().addClockSample(serverEvent.payload.receivedAt, serverEvent.payload.sentAt, receivedAt);
        break;
    }
  };

  socket.addEventListener("open", onOpen);
  socket.addEventListener("close", onClose);
  socket.addEventListener("error", onError);
  socket.addEventListener("message", onMessage);

  const close = (clearCredentials: boolean) => {
    deliberatelyClosed = true;
    if (pingTimer) clearInterval(pingTimer);
    socket?.removeEventListener("open", onOpen);
    socket?.removeEventListener("close", onClose);
    socket?.removeEventListener("error", onError);
    socket?.removeEventListener("message", onMessage);
    socket?.close(1000, clearCredentials ? "Player left" : "Client disconnected");
    if (clearCredentials) clearSessionCredentials();
    useGameStore.getState().setConnectionStatus("idle");
  };

  return {
    sendCommand(command) {
      const commandId = generateCommandId();
      const envelope = ClientCommandSchema.parse({ ...command, protocolVersion: PROTOCOL_VERSION, commandId });
      useGameStore.getState().addPendingCommand(commandId);
      sendEnvelope(envelope);
      return commandId;
    },
    disconnect: () => close(false),
    leave: () => close(true),
  };
}

export function useGameConnection(credentials: ConnectionCredentials | null) {
  const connectionRef = useRef<GameConnection | null>(null);
  const [retryVersion, setRetryVersion] = useState(0);

  useEffect(() => {
    if (!credentials) return;
    // A ticket is single-use. After a manual retry, request a fresh one through
    // resumeSession instead of trying to reconnect with the admission ticket.
    const retryCredentials = retryVersion === 0
      ? credentials
      : { code: credentials.code, playerId: credentials.playerId, resumeToken: credentials.resumeToken };
    const connection = connectToSession(retryCredentials);
    connectionRef.current = connection;
    return () => {
      connection.disconnect();
      connectionRef.current = null;
    };
  }, [credentials?.code, credentials?.playerId, credentials?.resumeToken, credentials?.ticket, credentials?.ticketExpiresAt, retryVersion]);

  const sendCommand = useCallback((command: CommandInput) => {
    if (!connectionRef.current) throw new Error("There is no active game connection.");
    return connectionRef.current.sendCommand(command);
  }, []);

  const leave = useCallback(() => {
    connectionRef.current?.leave();
    connectionRef.current = null;
  }, []);

  const retry = useCallback(() => setRetryVersion((version) => version + 1), []);

  return { sendCommand, leave, retry };
}

