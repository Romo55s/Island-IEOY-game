import type { CrashResolution } from "../../shared/domain";

export type CrashReactionClip = "fall" | "hug" | "cheer" | "afraid";

/** Presentation-only semantic clip choice; it never changes authoritative game state. */
export function getCrashReactionClip(characterId: string, resolution: CrashResolution): CrashReactionClip | undefined {
  if (resolution.eliminatedCharacterIds.includes(characterId)) return "fall";
  const relevant = resolution.attempts.filter(({ rescuerCharacterId, targetCharacterId }) => rescuerCharacterId === characterId || targetCharacterId === characterId);
  if (relevant.some(({ outcome, targetCharacterId }) => outcome === "success" && targetCharacterId === characterId)) return "hug";
  if (relevant.some(({ outcome, rescuerCharacterId }) => outcome === "success" && rescuerCharacterId === characterId)) return "cheer";
  if (relevant.some(({ outcome }) => outcome !== "success")) return "afraid";
  return undefined;
}
