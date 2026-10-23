import { SURVIVAL_ITEMS } from "../content/items";
import type { CrashAttemptResult, CrashResolution } from "../domain";
import type { RandomSource } from "./random";

export const BASE_RESCUE_SUCCESS_CHANCE = 0.6;
export type RescueRiskLabel = "low" | "moderate" | "high";

export function rescueRiskLabel(successChance = BASE_RESCUE_SUCCESS_CHANCE): RescueRiskLabel {
  if (!Number.isFinite(successChance) || successChance < 0 || successChance > 1) throw new Error("Success chance must be between 0 and 1.");
  if (successChance >= 0.75) return "low";
  if (successChance >= 0.5) return "moderate";
  return "high";
}

export interface CrashRescueSubmission {
  rescuerCharacterId: string;
  targetCharacterId: string;
  itemId: string | null;
}

const COMPLICATION_TEXT: Record<Exclude<CrashAttemptResult["outcome"], "success">, string> = {
  miss: "The rescue attempt fails, but everyone makes it back to shore.",
  "rescuer-lost": "The rescue goes wrong; the rescuer is lost in the confusion.",
  "target-lost": "The attempt fails and the person being rescued is lost.",
  "both-lost": "The rescue attempt goes spectacularly wrong; both are lost.",
};

function randomUnit(random: RandomSource): number {
  const value = random.next();
  if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error("Random sources must return values in [0, 1).");
  return value;
}

/**
 * Resolve every submitted attempt against the same pre-resolution living roster.
 * Sorting by rescuer ID makes a given seeded random stream independent of message arrival order.
 */
export function resolveCrashBatch(
  livingCharacterIds: readonly string[],
  submissions: readonly CrashRescueSubmission[],
  random: RandomSource,
): CrashResolution {
  const living = new Set(livingCharacterIds);
  if (living.size !== livingCharacterIds.length) throw new Error("The living roster must contain unique character IDs.");

  const rescuers = new Set<string>();
  for (const submission of submissions) {
    if (!living.has(submission.rescuerCharacterId)) throw new Error(`Rescuer is not alive: ${submission.rescuerCharacterId}`);
    if (!living.has(submission.targetCharacterId)) throw new Error(`Rescue target is not alive: ${submission.targetCharacterId}`);
    if (rescuers.has(submission.rescuerCharacterId)) throw new Error(`A character may submit only one rescue attempt: ${submission.rescuerCharacterId}`);
    rescuers.add(submission.rescuerCharacterId);
    if (submission.itemId !== null && !SURVIVAL_ITEMS.some(({ id }) => id === submission.itemId)) throw new Error(`Unknown starting item: ${submission.itemId}`);
  }

  const attempts = [...submissions]
    .sort((left, right) => left.rescuerCharacterId.localeCompare(right.rescuerCharacterId))
    .map((submission): CrashAttemptResult => {
      const successRoll = randomUnit(random);
      if (successRoll < BASE_RESCUE_SUCCESS_CHANCE) return { ...submission, outcome: "success" };
      const complicationRoll = randomUnit(random);
      const sampledOutcome = complicationRoll < 0.8 ? "miss"
        : complicationRoll < 0.9 ? "rescuer-lost"
          : complicationRoll < 0.95 ? "target-lost" : "both-lost";
      const outcome = sampledOutcome === "both-lost" && submission.rescuerCharacterId === submission.targetCharacterId ? "rescuer-lost" : sampledOutcome;
      return { ...submission, outcome, complicationText: COMPLICATION_TEXT[outcome] };
    });

  const eliminated = new Set<string>();
  const successfulTargets = new Set<string>();
  for (const attempt of attempts) {
    if (attempt.outcome === "success") successfulTargets.add(attempt.targetCharacterId);
    if (attempt.outcome === "rescuer-lost" || attempt.outcome === "both-lost") eliminated.add(attempt.rescuerCharacterId);
    if (attempt.outcome === "target-lost" || attempt.outcome === "both-lost") eliminated.add(attempt.targetCharacterId);
  }
  const savedCharacterIds = [...successfulTargets].filter((id) => !eliminated.has(id)).sort();
  const eliminatedCharacterIds = [...eliminated].sort();
  const summary = attempts.length === 0
    ? "No rescue attempts were made. The group proceeds to the first island decision."
    : `${attempts.length} rescue attempt${attempts.length === 1 ? "" : "s"}: ${savedCharacterIds.length} character${savedCharacterIds.length === 1 ? " was" : "s were"} saved, ${eliminatedCharacterIds.length} lost.`;

  return { attempts, savedCharacterIds, eliminatedCharacterIds, summary };
}
