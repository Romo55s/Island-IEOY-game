import { getServerByName } from "partyserver";

import { CreateSessionRequestSchema } from "../../src/shared/protocol";
import { isBoundedVisibleString, normalizeDisplayName, normalizePassword } from "../auth/passwords";
import type { GameRoom } from "../game/GameRoom";
import { apiError, jsonResponse, readBoundedJson } from "./responses";

const SESSION_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateSessionCode(randomBytes: (target: Uint8Array) => Uint8Array = (target) => crypto.getRandomValues(target)): string {
  let code = "";
  while (code.length < 6) {
    const bytes = randomBytes(new Uint8Array(6 - code.length));
    for (const byte of bytes) {
      const limit = Math.floor(256 / SESSION_CODE_ALPHABET.length) * SESSION_CODE_ALPHABET.length;
      if (byte >= limit) continue;
      code += SESSION_CODE_ALPHABET[byte % SESSION_CODE_ALPHABET.length]!;
      if (code.length === 6) break;
    }
  }
  return code;
}

export async function handleCreateSession(
  request: Request,
  env: Env,
  options: { now?: () => number; generateCode?: () => string } = {},
): Promise<Response> {
  let body: unknown;
  try {
    body = await readBoundedJson(request);
  } catch {
    return apiError(400, "BAD_REQUEST", "The request body must be valid JSON no larger than 2 KiB.");
  }
  if (typeof body !== "object" || body === null) {
    return apiError(400, "BAD_REQUEST", "A display name is required.");
  }
  const bodyRecord = body as Record<string, unknown>;
  if (typeof bodyRecord.displayName !== "string" || ("password" in bodyRecord && typeof bodyRecord.password !== "string")) {
    return apiError(400, "BAD_REQUEST", "A display name is required.");
  }
  const displayName = normalizeDisplayName(bodyRecord.displayName);
  const password = typeof bodyRecord.password === "string" ? normalizePassword(bodyRecord.password) : undefined;
  if (!isBoundedVisibleString(displayName, 1, 24) || (password !== undefined && !isBoundedVisibleString(password, 4, 64))) {
    return apiError(400, "BAD_REQUEST", "Display names must be 1–24 characters and optional passwords 4–64 characters, without control characters.");
  }
  const parsed = CreateSessionRequestSchema.safeParse({ displayName, ...(password !== undefined ? { password } : {}) });
  if (!parsed.success || Object.keys(bodyRecord).some((key) => key !== "displayName" && key !== "password")) {
    return apiError(400, "BAD_REQUEST", "The session request is invalid.");
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = options.generateCode?.() ?? generateSessionCode();
    const namespace = env.GAME_ROOM as unknown as DurableObjectNamespace<GameRoom>;
    const room = await getServerByName(namespace, code);
    const result = await room.initialize({ code, ...parsed.data, now: options.now?.() ?? Date.now() });
    if (result.created) return jsonResponse(result.admission, 201);
  }
  return apiError(503, "CODE_GENERATION_EXHAUSTED", "Could not allocate a unique session code. Please try again.");
}
