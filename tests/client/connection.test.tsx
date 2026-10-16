import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PartySocketOptions } from "partysocket";

import { connectToSession } from "../../src/client/useGameConnection";
import { SESSION_STORAGE_KEY, saveSessionCredentials } from "../../src/client/sessionStorage";
import { useGameStore } from "../../src/client/useGameStore";
import { PROTOCOL_VERSION } from "../../src/shared/domain";

class FakeSocket extends EventTarget {
  readonly sent: string[] = [];
  readyState: number = WebSocket.CONNECTING;
  retryCount = 0;
  closeCode: number | undefined;

  send(data: string) {
    this.sent.push(data);
  }

  close(code?: number) {
    this.closeCode = code;
    this.readyState = WebSocket.CLOSED;
  }

  emit(type: string, event: Event = new Event(type)) {
    this.dispatchEvent(event);
  }
}

const credentials = {
  code: "ABC234",
  playerId: "p_ana",
  resumeToken: "r".repeat(43),
  ticket: "t".repeat(43),
  ticketExpiresAt: Number.MAX_SAFE_INTEGER,
};

const storedCredentials = {
  code: credentials.code,
  playerId: credentials.playerId,
  resumeToken: credentials.resumeToken,
};

describe("reconnecting game transport", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.sessionStorage.clear();
    useGameStore.getState().reset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("builds a same-origin PartySocket whose query contains only the one-time ticket", async () => {
    const socket = new FakeSocket();
    let socketOptions: PartySocketOptions | undefined;
    const connection = connectToSession(credentials, {
      location: { host: "192.168.1.20:5174", protocol: "http:" },
      socketFactory: (options) => {
        socketOptions = options;
        return socket;
      },
    });

    expect(socketOptions).toMatchObject({ host: "192.168.1.20:5174", protocol: "ws", party: "game-room", room: "ABC234" });
    const query = await (socketOptions!.query as () => Promise<Record<string, string>>)();
    expect(query).toEqual({ ticket: "t".repeat(43) });
    expect(Object.keys(query)).toEqual(["ticket"]);
    connection.disconnect();
  });

  it("requests a fresh one-time ticket with the resume token before reconnecting", async () => {
    const socket = new FakeSocket();
    let socketOptions: PartySocketOptions | undefined;
    const resumedAdmission = { ...credentials, ticket: "n".repeat(43), resumeToken: "s".repeat(43) };
    const fetchMock = vi.fn<typeof fetch>(async () => new Response(JSON.stringify(resumedAdmission), { status: 200 }));
    const connection = connectToSession(credentials, {
      fetch: fetchMock,
      socketFactory: (options) => {
        socketOptions = options;
        return socket;
      },
    });
    const query = socketOptions!.query as () => Promise<Record<string, string>>;

    await query();
    expect(await query()).toEqual({ ticket: "n".repeat(43) });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/sessions/ABC234/tickets");
    expect(JSON.parse(String(init?.body))).toEqual({ mode: "resume", resumeToken: "r".repeat(43) });
    expect(String(url)).not.toContain(credentials.resumeToken);
    connection.disconnect();
  });

  it("validates frames, warns non-fatally, and uses getRandomValues command IDs", () => {
    const socket = new FakeSocket();
    const getRandomValues = vi.spyOn(globalThis.crypto, "getRandomValues");
    const connection = connectToSession(credentials, { socketFactory: () => socket });
    socket.readyState = WebSocket.OPEN;
    socket.emit("open");

    socket.emit("message", new MessageEvent("message", { data: "not json" }));
    expect(useGameStore.getState().protocolWarning).toMatch(/malformed JSON/);
    expect(useGameStore.getState().connectionStatus).toBe("connected");

    const commandId = connection.sendCommand({ type: "room.set-ready", payload: { ready: true } });
    const command = JSON.parse(socket.sent.at(-1)!);
    expect(command.commandId).toBe(commandId);
    expect(command).toMatchObject({ type: "room.set-ready", payload: { ready: true } });
    expect(getRandomValues).toHaveBeenCalled();
    expect(useGameStore.getState().pendingCommandIds.has(commandId)).toBe(true);
    connection.disconnect();
  });

  it("removes resume credentials on explicit leave and SESSION_EXPIRED close", () => {
    saveSessionCredentials(storedCredentials);
    const firstSocket = new FakeSocket();
    const firstConnection = connectToSession(credentials, { socketFactory: () => firstSocket });
    firstConnection.leave();
    expect(window.sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();

    saveSessionCredentials(storedCredentials);
    const secondSocket = new FakeSocket();
    connectToSession(credentials, { socketFactory: () => secondSocket });
    secondSocket.emit("close", new CloseEvent("close", { code: 4001 }));
    expect(window.sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
    expect(useGameStore.getState().connectionStatus).toBe("expired");
  });

  it("removes resume credentials when the server rejects a command as SESSION_EXPIRED", () => {
    saveSessionCredentials(storedCredentials);
    const socket = new FakeSocket();
    connectToSession(credentials, { socketFactory: () => socket });

    socket.emit(
      "message",
      new MessageEvent("message", {
        data: JSON.stringify({
          protocolVersion: PROTOCOL_VERSION,
          type: "command.rejected",
          payload: { commandId: "cmd_old", code: "SESSION_EXPIRED", message: "Gone" },
        }),
      }),
    );

    expect(window.sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
    expect(useGameStore.getState().connectionStatus).toBe("expired");
  });
});

