import type { RandomSource } from "./random";
import { randomIndex } from "./random";

export function resolveWinningOption(votes: Record<string, number>, optionIds: string[], random: RandomSource): string {
  if (optionIds.length === 0) throw new Error("A decision requires at least one option.");
  const highestCount = Math.max(...optionIds.map((optionId) => votes[optionId] ?? 0));
  const tied = optionIds.filter((optionId) => (votes[optionId] ?? 0) === highestCount);
  if (tied.length === 1) return tied[0]!;
  return tied[randomIndex(tied.length, random)]!;
}
