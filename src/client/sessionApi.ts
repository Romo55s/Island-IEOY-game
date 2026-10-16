import type { ZodType } from "zod";

import {
  AdmissionResponseSchema,
  ApiErrorResponseSchema,
  CreateSessionRequestSchema,
  TicketRequestSchema,
  type AdmissionResponse,
  type ApiErrorCode,
  type CreateSessionRequest,
  type TicketRequest,
} from "../shared/protocol";
import { saveSessionCredentials } from "./sessionStorage";

export type SessionClientErrorCode = ApiErrorCode | "INVALID_RESPONSE" | "NETWORK_ERROR";

export class SessionApiError extends Error {
  readonly status: number;
  readonly code: SessionClientErrorCode;

  constructor(status: number, code: SessionClientErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "SessionApiError";
    this.status = status;
    this.code = code;
  }
}

export interface CreateSessionInput {
  displayName: string;
  password: string;
}

export interface JoinSessionInput extends CreateSessionInput {
  code: string;
}

export interface ResumeSessionInput {
  code: string;
  resumeToken: string;
}

export interface SessionApiOptions {
  fetch?: typeof fetch;
}

function normalizeDisplayName(displayName: string): string {
  return displayName.normalize("NFKC").trim();
}

function normalizePassword(password: string): string {
  return password.normalize("NFC");
}

function normalizeCode(code: string): string {
  const normalized = code.trim().toUpperCase();
  if (!/^[A-HJ-NP-Z2-9]{6}$/.test(normalized)) {
    throw validationError("The session code must contain six valid characters.");
  }
  return normalized;
}

function validationError(message: string): SessionApiError {
  return new SessionApiError(400, "BAD_REQUEST", message);
}

function parseRequest<T>(schema: ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw validationError(parsed.error.issues[0]?.message ?? "The session request is invalid.");
  }
  return parsed.data;
}

async function readResponseBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch (error) {
    throw new SessionApiError(response.status, "INVALID_RESPONSE", "The server returned an invalid response.", { cause: error });
  }
}

async function postAdmission(path: string, body: CreateSessionRequest | TicketRequest, options: SessionApiOptions): Promise<AdmissionResponse> {
  const fetchImpl = options.fetch ?? globalThis.fetch;
  let response: Response;

  try {
    response = await fetchImpl(path, {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw new SessionApiError(0, "NETWORK_ERROR", "The session server could not be reached.", { cause: error });
  }

  const responseBody = await readResponseBody(response);
  if (!response.ok) {
    const parsedError = ApiErrorResponseSchema.safeParse(responseBody);
    if (!parsedError.success) {
      throw new SessionApiError(response.status, "INVALID_RESPONSE", "The server returned an invalid error response.");
    }
    throw new SessionApiError(response.status, parsedError.data.error.code, parsedError.data.error.message);
  }

  const parsedAdmission = AdmissionResponseSchema.safeParse(responseBody);
  if (!parsedAdmission.success) {
    throw new SessionApiError(response.status, "INVALID_RESPONSE", "The server returned invalid session credentials.");
  }
  return parsedAdmission.data;
}

function rememberAdmission(admission: AdmissionResponse): AdmissionResponse {
  saveSessionCredentials({
    code: admission.code,
    playerId: admission.playerId,
    resumeToken: admission.resumeToken,
  });
  return admission;
}

export async function createSession(input: CreateSessionInput, options: SessionApiOptions = {}): Promise<AdmissionResponse> {
  const request = parseRequest(CreateSessionRequestSchema, {
    displayName: normalizeDisplayName(input.displayName),
    password: normalizePassword(input.password),
  });
  return rememberAdmission(await postAdmission("/api/sessions", request, options));
}

export async function joinSession(input: JoinSessionInput, options: SessionApiOptions = {}): Promise<AdmissionResponse> {
  const code = normalizeCode(input.code);
  const request = parseRequest(TicketRequestSchema, {
    mode: "join",
    displayName: normalizeDisplayName(input.displayName),
    password: normalizePassword(input.password),
  });
  return rememberAdmission(await postAdmission(`/api/sessions/${encodeURIComponent(code)}/tickets`, request, options));
}

export async function resumeSession(input: ResumeSessionInput, options: SessionApiOptions = {}): Promise<AdmissionResponse> {
  const code = normalizeCode(input.code);
  const request = parseRequest(TicketRequestSchema, { mode: "resume", resumeToken: input.resumeToken });
  return rememberAdmission(await postAdmission(`/api/sessions/${encodeURIComponent(code)}/tickets`, request, options));
}

