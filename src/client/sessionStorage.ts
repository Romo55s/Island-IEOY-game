import { z } from "zod";

export const SESSION_STORAGE_KEY = "ieoy.session.v1";

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
}

