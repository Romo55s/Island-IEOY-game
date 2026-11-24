import { env, exports } from "cloudflare:workers";
import { afterEach, describe, expect, it } from "vitest";
import type { GameRoom } from "../../worker/game/GameRoom";
import { generateSessionCode, handleCreateSession } from "../../worker/http/createSession";

const createdCodes: string[] = [];

async function request(path: string, body: unknown): Promise<Response> {
  return exports.default.fetch(
    new Request(`https://local.test${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", "CF-Connecting-IP": "127.0.0.7" },
      body: JSON.stringify(body),
    }),
  );
}

async function createSession(displayName = "Ana", password?: string) {
  const response = await request("/api/sessions", { displayName, ...(password !== undefined ? { password } : {}) });
  const body = await response.json<{
    code: string;
    playerId: string;
    resumeToken: string;
    ticket: string;
    ticketExpiresAt: number;
  }>();
  if (response.ok) createdCodes.push(body.code);
  return { response, body };
}

afterEach(() => {
  createdCodes.length = 0;
});

describe("session admission", () => {
  it("creates a code-only room with bounded opaque credentials", async () => {
    const { response, body } = await createSession("  Ana  ");
    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(body.code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    expect(body.playerId).toMatch(/^p_/);
    expect(body.resumeToken).toHaveLength(43);
    expect(body.ticket).toHaveLength(43);
    expect(body.ticketExpiresAt).toBeGreaterThan(Date.now());
  });

  it("keeps existing password-protected rooms compatible", async () => {
    const { body } = await createSession("Ana", "isla");
    const missingPassword = await request(`/api/sessions/${body.code}/tickets`, { mode: "join", displayName: "Bo" });
    expect(missingPassword.status).toBe(401);
    const response = await request(`/api/sessions/${body.code}/tickets`, {
      mode: "join",
      displayName: "Bo",
      password: "wrong",
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: { code: "INVALID_PASSWORD", message: "The session password is incorrect." },
    });
  });

  it("enforces code-point bounds, strict bodies, and control-character rejection", async () => {
    expect((await createSession("", "isla")).response.status).toBe(400);
    expect((await createSession("Ana", "abc")).response.status).toBe(400);
    expect((await createSession("Ana\u0007", "isla")).response.status).toBe(400);
    expect((await createSession("🙂".repeat(25), "isla")).response.status).toBe(400);
    const extra = await request("/api/sessions", { displayName: "Ana", password: "isla", admin: true });
    expect(extra.status).toBe(400);
  });

  it("rate limits repeated password failures in legacy password-protected rooms", async () => {
    const { body } = await createSession("Ana", "isla");
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const failed = await request(`/api/sessions/${body.code}/tickets`, {
        mode: "join",
        displayName: "Bo",
        password: "wrong",
      });
      expect(failed.status).toBe(401);
    }
    const limited = await request(`/api/sessions/${body.code}/tickets`, {
      mode: "join",
      displayName: "Bo",
      password: "wrong",
    });
    expect(limited.status).toBe(429);
    expect(await limited.json()).toMatchObject({ error: { code: "RATE_LIMITED" } });
  });

  it("issues a fresh join ticket by boarding code without a password", async () => {
    const { body } = await createSession();
    const response = await request(`/api/sessions/${body.code}/tickets`, {
      mode: "join",
      displayName: "Bo",
    });
    expect(response.status).toBe(200);
    const admission = await response.json<{ code: string; playerId: string; ticket: string; resumeToken: string }>();
    expect(admission.code).toBe(body.code);
    expect(admission.playerId).not.toBe(body.playerId);
    expect(admission.ticket).toHaveLength(43);
    expect(admission.resumeToken).toHaveLength(43);
  });

  it("consumes a connection ticket exactly once", async () => {
    const { body } = await createSession();
    const namespace = env.GAME_ROOM as DurableObjectNamespace<GameRoom>;
    const room = namespace.get(namespace.idFromName(body.code));
    const first = await room.consumeTicket(body.ticket, Date.now());
    const second = await room.consumeTicket(body.ticket, Date.now());
    expect(first).toMatchObject({ ok: true, value: { playerId: body.playerId } });
    expect(second).toMatchObject({ ok: false, status: 401, code: "TICKET_INVALID" });
  });

  it("rejects an expired ticket", async () => {
    const { body } = await createSession();
    const namespace = env.GAME_ROOM as DurableObjectNamespace<GameRoom>;
    const room = namespace.get(namespace.idFromName(body.code));
    const expired = await room.consumeTicket(body.ticket, body.ticketExpiresAt);
    expect(expired).toMatchObject({ ok: false, status: 401, code: "TICKET_EXPIRED" });
  });

  it("maps random bytes without modulo bias and stops after five code collisions", async () => {
    const values = [0, 1, 2, 3, 4, 5];
    const code = generateSessionCode((target) => {
      target.set(values.splice(0, target.length));
      return target;
    });
    expect(code).toBe("ABCDEF");

    const makeRequest = () => new Request("https://local.test/api/sessions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ displayName: "Collision" }),
    });
    const fixedCode = "ZZZ999";
    const collisionNow = Date.now();
    const first = await handleCreateSession(makeRequest(), env, { generateCode: () => fixedCode, now: () => collisionNow });
    expect(first.status).toBe(201);
    const exhausted = await handleCreateSession(makeRequest(), env, { generateCode: () => fixedCode, now: () => collisionNow + 1 });
    expect(exhausted.status).toBe(503);
    expect(await exhausted.json()).toMatchObject({ error: { code: "CODE_GENERATION_EXHAUSTED" } });
  });
});
