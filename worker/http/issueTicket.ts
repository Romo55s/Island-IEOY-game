import { getServerByName } from "partyserver";

import { TicketRequestSchema } from "../../src/shared/protocol";
import { isBoundedVisibleString, normalizeDisplayName, normalizePassword } from "../auth/passwords";
import type { GameRoom } from "../game/GameRoom";
import { apiError, jsonResponse, readBoundedJson } from "./responses";

const SESSION_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/u;

export async function handleIssueTicket(request: Request, env: Env, code: string): Promise<Response> {
  if (!SESSION_CODE_PATTERN.test(code)) return apiError(404, "ROOM_NOT_FOUND", "That session does not exist.");
  let body: unknown;
  try {
    body = await readBoundedJson(request);
  } catch {
    return apiError(400, "BAD_REQUEST", "The request body must be valid JSON no larger than 2 KiB.");
  }
  if (typeof body !== "object" || body === null || !("mode" in body)) return apiError(400, "BAD_REQUEST", "A ticket mode is required.");
  const bodyRecord = body as Record<string, unknown>;
  let normalized: unknown = bodyRecord;
  if (body.mode === "join" && "displayName" in body && "password" in body && typeof body.displayName === "string" && typeof body.password === "string") {
    const displayName = normalizeDisplayName(body.displayName);
    const password = normalizePassword(body.password);
    if (!isBoundedVisibleString(displayName, 1, 24) || !isBoundedVisibleString(password, 4, 64)) {
      return apiError(400, "BAD_REQUEST", "The display name or password is invalid.");
    }
    normalized = { ...bodyRecord, displayName, password };
  }
  const parsed = TicketRequestSchema.safeParse(normalized);
  if (!parsed.success) return apiError(400, "BAD_REQUEST", "The ticket request is invalid.");
  const namespace = env.GAME_ROOM as unknown as DurableObjectNamespace<GameRoom>;
  const room = await getServerByName(namespace, code);
  const address = request.headers.get("CF-Connecting-IP") ?? request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ?? "local";
  const result = await room.issueTicket({ ...parsed.data, address, now: Date.now() });
  return result.ok ? jsonResponse(result.value) : apiError(result.status, result.code, result.message);
}
