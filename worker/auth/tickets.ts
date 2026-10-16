const encoder = new TextEncoder();

export const TICKET_TTL_MS = 60_000;

export function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

export function randomToken(byteLength = 32): string {
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(byteLength)));
}

export async function tokenDigest(token: string): Promise<string> {
  return base64UrlEncode(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(token))));
}

/** A one-time random ticket is also the entropy source for its separately namespaced resume token. */
export async function deriveResumeToken(ticket: string): Promise<string> {
  return base64UrlEncode(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(`resume:${ticket}`))));
}

export function randomPlayerId(): string {
  return `p_${randomToken(12)}`;
}
