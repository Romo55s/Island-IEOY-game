import { exports } from "cloudflare:workers";
import { afterEach, describe, expect, it } from "vitest";

import type { AdmissionResponse, ServerEvent } from "../../src/shared/protocol";

const sockets: WebSocket[] = [];

async function api(path: string, body: unknown): Promise<Response> {
  return exports.default.fetch(new Request(`https://local.test${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "CF-Connecting-IP": "127.0.0.9" },
    body: JSON.stringify(body),
  }));
}

async function connect(admission: AdmissionResponse): Promise<WebSocket> {
  const response = await exports.default.fetch(new Request(
    `https://local.test/parties/game-room/${admission.code}?ticket=${admission.ticket}`,
    { headers: { Upgrade: "websocket" } },
  ));
  expect(response.status).toBe(101);
  const socket = response.webSocket;
  expect(socket).not.toBeNull();
  socket!.accept();
  sockets.push(socket!);
  return socket!;
}

function waitForEvent(socket: WebSocket, predicate: (event: ServerEvent) => boolean): Promise<ServerEvent> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Timed out waiting for a server event")), 2_000);
    const listener = (message: MessageEvent) => {
      const event = JSON.parse(String(message.data)) as ServerEvent;
      if (!predicate(event)) return;
      clearTimeout(timeout);
      socket.removeEventListener("message", listener);
      resolve(event);
    };
    socket.addEventListener("message", listener);
  });
}

function command(socket: WebSocket, commandId: string, type: string, payload: unknown): void {
  socket.send(JSON.stringify({ protocolVersion: 4, commandId, type, payload }));
}

afterEach(() => {
  for (const socket of sockets.splice(0)) socket.close(1000, "test complete");
});

describe("multiplayer lobby", () => {
  it("admits two independent sockets, claims unique characters, readies, and starts", async () => {
    const createdResponse = await api("/api/sessions", { displayName: "Ana", password: "isla" });
    const ana = await createdResponse.json<AdmissionResponse>();
    const anaSocket = await connect(ana);
    await waitForEvent(anaSocket, (event) => event.type === "session.welcome");
    command(anaSocket, "clock-check", "client.ping", { sentAt: 1234 });
    const pong = await waitForEvent(anaSocket, (event) => event.type === "server.pong");
    expect(pong).toMatchObject({ type: "server.pong", payload: { sentAt: 1234 } });

    const joinedResponse = await api(`/api/sessions/${ana.code}/tickets`, { mode: "join", displayName: "Bo", password: "isla" });
    const bo = await joinedResponse.json<AdmissionResponse>();
    const boSocket = await connect(bo);
    await waitForEvent(boSocket, (event) => event.type === "session.welcome");

    command(anaSocket, "ana-character", "character.select", { characterId: "cast-daniel" });
    await waitForEvent(anaSocket, (event) => event.type === "state.snapshot" && event.payload.players.some((player) => player.id === ana.playerId && player.characterId === "cast-daniel"));
    command(boSocket, "bo-character", "character.select", { characterId: "cast-samantha" });
    await waitForEvent(boSocket, (event) => event.type === "state.snapshot" && event.payload.players.some((player) => player.id === bo.playerId && player.characterId === "cast-samantha"));

    command(anaSocket, "ana-ready", "room.set-ready", { ready: true });
    await waitForEvent(anaSocket, (event) => event.type === "state.snapshot" && event.payload.players.find((player) => player.id === ana.playerId)?.ready === true);
    command(boSocket, "bo-ready", "room.set-ready", { ready: true });
    await waitForEvent(boSocket, (event) => event.type === "state.snapshot" && event.payload.players.find((player) => player.id === bo.playerId)?.ready === true);

    command(anaSocket, "start", "room.start", {});
    const started = await waitForEvent(anaSocket, (event) => event.type === "state.snapshot" && event.payload.phase === "intro");
    expect(started.type).toBe("state.snapshot");
    if (started.type === "state.snapshot") {
      expect(started.payload.players).toHaveLength(2);
      expect(started.payload.phaseDeadlineAt).toBeGreaterThan(started.payload.phaseStartedAt ?? 0);
    }
  });

  it("rejects a duplicate character claim without mutating the claimant", async () => {
    const createdResponse = await api("/api/sessions", { displayName: "Ana", password: "isla" });
    const ana = await createdResponse.json<AdmissionResponse>();
    const anaSocket = await connect(ana);
    await waitForEvent(anaSocket, (event) => event.type === "session.welcome");
    command(anaSocket, "ana-character", "character.select", { characterId: "cast-daniel" });
    await waitForEvent(anaSocket, (event) => event.type === "state.snapshot" && event.payload.players.some((player) => player.characterId === "cast-daniel"));

    const joinedResponse = await api(`/api/sessions/${ana.code}/tickets`, { mode: "join", displayName: "Bo", password: "isla" });
    const bo = await joinedResponse.json<AdmissionResponse>();
    const boSocket = await connect(bo);
    await waitForEvent(boSocket, (event) => event.type === "session.welcome");
    command(boSocket, "duplicate", "character.select", { characterId: "cast-daniel" });
    const rejected = await waitForEvent(boSocket, (event) => event.type === "command.rejected");
    expect(rejected).toMatchObject({ type: "command.rejected", payload: { commandId: "duplicate", code: "CHARACTER_TAKEN" } });
  });

  it("restores the same player identity with a session resume token", async () => {
    const createdResponse = await api("/api/sessions", { displayName: "Ana", password: "isla" });
    const ana = await createdResponse.json<AdmissionResponse>();
    const firstSocket = await connect(ana);
    await waitForEvent(firstSocket, (event) => event.type === "session.welcome");
    firstSocket.close(1000, "refresh");

    const resumeResponse = await api(`/api/sessions/${ana.code}/tickets`, {
      mode: "resume",
      resumeToken: ana.resumeToken,
    });
    expect(resumeResponse.status).toBe(200);
    const resumed = await resumeResponse.json<AdmissionResponse>();
    expect(resumed.playerId).toBe(ana.playerId);
    const resumedSocket = await connect(resumed);
    const welcome = await waitForEvent(resumedSocket, (event) => event.type === "session.welcome");
    expect(welcome).toMatchObject({ type: "session.welcome", payload: { playerId: ana.playerId } });
  });
});
