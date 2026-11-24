import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createSession, joinSession, SessionApiError } from "../../src/client/sessionApi";
import {
  clearSessionCredentials,
  clearPendingAdmission,
  loadPendingAdmission,
  PENDING_ADMISSION_STORAGE_KEY,
  loadSessionCredentials,
  savePendingAdmission,
  saveSessionCredentials,
  SESSION_STORAGE_KEY,
} from "../../src/client/sessionStorage";

const admission = {
  code: "ABC234",
  playerId: "p_ana",
  resumeToken: "r".repeat(43),
  ticket: "t".repeat(43),
  ticketExpiresAt: 10_000,
};

describe("session admission API", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  afterEach(() => vi.restoreAllMocks());

  it("normalizes public identifiers and joins by boarding code without a password", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => new Response(JSON.stringify(admission), { status: 200 }));

    await joinSession(
      { code: " abc234 ", displayName: "  Ana  " },
      { fetch: fetchMock as typeof fetch },
    );

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/sessions/ABC234/tickets");
    expect(JSON.parse(String(init?.body))).toEqual({ mode: "join", displayName: "Ana" });
    expect(init?.cache).toBe("no-store");
  });

  it("maps validated server errors to a stable typed error", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      new Response(JSON.stringify({ error: { code: "INVALID_PASSWORD", message: "No match" } }), { status: 401 }),
    );

    await expect(
      createSession({ displayName: "Ana", password: "wrong" }, { fetch: fetchMock as typeof fetch }),
    ).rejects.toMatchObject({ status: 401, code: "INVALID_PASSWORD", message: "No match" } satisfies Partial<SessionApiError>);
  });

  it("stores resumable identity only in sessionStorage under the versioned key", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => new Response(JSON.stringify(admission), { status: 200 }));
    await createSession({ displayName: "Ana" }, { fetch: fetchMock as typeof fetch });

    expect(window.sessionStorage.getItem(SESSION_STORAGE_KEY)).not.toBeNull();
    expect(window.localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
    expect(loadSessionCredentials()).toEqual({ code: "ABC234", playerId: "p_ana", resumeToken: "r".repeat(43) });
  });
});

describe("session credential storage", () => {
  beforeEach(() => window.sessionStorage.clear());

  it("clears explicit credentials and discards malformed saved data", () => {
    saveSessionCredentials({ code: "ABC234", playerId: "p_ana", resumeToken: "r".repeat(43) });
    clearSessionCredentials();
    expect(loadSessionCredentials()).toBeNull();

    window.sessionStorage.setItem(SESSION_STORAGE_KEY, "not json");
    expect(loadSessionCredentials()).toBeNull();
    expect(window.sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });

  it("keeps a fresh one-time admission only until the game socket accepts it", () => {
    const pending = { ...admission, ticketExpiresAt: Date.now() + 60_000 };
    savePendingAdmission(pending);

    expect(loadPendingAdmission()).toEqual(pending);
    clearPendingAdmission(pending.code);
    expect(window.sessionStorage.getItem(PENDING_ADMISSION_STORAGE_KEY)).toBeNull();
  });
});

