export const PBKDF2_ITERATIONS = 100_000;

const encoder = new TextEncoder();
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/u;

export function normalizeDisplayName(value: string): string {
  return value.normalize("NFKC").trim();
}

export function normalizePassword(value: string): string {
  return value.normalize("NFC");
}

export function isBoundedVisibleString(value: string, minimum: number, maximum: number): boolean {
  const length = Array.from(value).length;
  return length >= minimum && length <= maximum && !CONTROL_CHARACTERS.test(value);
}

export async function derivePasswordDigest(password: string, salt: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: PBKDF2_ITERATIONS },
    key,
    256,
  );
  return new Uint8Array(bits);
}

export function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;
  let difference = 0;
  for (let index = 0; index < left.byteLength; index += 1) difference |= left[index]! ^ right[index]!;
  return difference === 0;
}

export async function verifyPassword(password: string, salt: Uint8Array, expected: Uint8Array): Promise<boolean> {
  return constantTimeEqual(await derivePasswordDigest(password, salt), expected);
}
