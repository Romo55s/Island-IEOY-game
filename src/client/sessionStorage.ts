import { z } from "zod";
import { AdmissionResponseSchema, type AdmissionResponse } from "../shared/protocol";

export const SESSION_STORAGE_KEY = "ieoy.session.v1";
export const PENDING_ADMISSION_STORAGE_KEY = "ieoy.pending-admission.v1";

const SessionCredentialsSchema = z
  .object({
    code: z.string().regex(/^[A-HJ-NP-Z2-9]{6}$/),
    playerId: z.string().regex(/^p_[A-Za-z0-9_-]+$/),
    resumeToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  })
  .strict();

export type SessionCredentials = z.infer<typeof SessionCredentialsSchema>;

function browserSessionStorage(): Storage | null {
  if (typeof window === "undefined") return null;

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function saveSessionCredentials(credentials: SessionCredentials): void {
  const parsed = SessionCredentialsSchema.parse(credentials);
  browserSessionStorage()?.setItem(SESSION_STORAGE_KEY, JSON.stringify(parsed));
}

/**
 * A first connection must use the one-time ticket issued by the admission API.
 * Keep it only in tab-scoped storage while the separate admission route reloads
 * into the game route; it is cleared as soon as the socket is welcomed.
 */
export function savePendingAdmission(admission: AdmissionResponse): void {
  const parsed = AdmissionResponseSchema.parse(admission);
  browserSessionStorage()?.setItem(PENDING_ADMISSION_STORAGE_KEY, JSON.stringify(parsed));
}

export function loadPendingAdmission(): AdmissionResponse | null {
  const storage = browserSessionStorage();
  const serialized = storage?.getItem(PENDING_ADMISSION_STORAGE_KEY);
  if (!serialized) return null;

  try {
    const parsed = AdmissionResponseSchema.safeParse(JSON.parse(serialized));
    if (parsed.success && parsed.data.ticketExpiresAt > Date.now()) return parsed.data;
  } catch {
    // Fall through to discard a stale or hand-edited one-time ticket.
  }

  storage?.removeItem(PENDING_ADMISSION_STORAGE_KEY);
  return null;
}

export function clearPendingAdmission(code?: string): void {
  const storage = browserSessionStorage();
  if (!storage) return;
  if (!code) {
    storage.removeItem(PENDING_ADMISSION_STORAGE_KEY);
    return;
  }
  const pending = loadPendingAdmission();
  if (pending?.code === code) storage.removeItem(PENDING_ADMISSION_STORAGE_KEY);
}

export function loadSessionCredentials(): SessionCredentials | null {
  const storage = browserSessionStorage();
  const serialized = storage?.getItem(SESSION_STORAGE_KEY);
  if (!serialized) return null;

  try {
    const parsed = SessionCredentialsSchema.safeParse(JSON.parse(serialized));
    if (parsed.success) return parsed.data;
  } catch {
    // A stale or hand-edited value should never prevent the app from loading.
  }

  storage?.removeItem(SESSION_STORAGE_KEY);
  return null;
}

export function clearSessionCredentials(): void {
  browserSessionStorage()?.removeItem(SESSION_STORAGE_KEY);
  clearPendingAdmission();
}

