export const FAILED_ATTEMPT_WINDOW_MS = 60_000;
export const MAX_FAILED_ATTEMPTS = 5;

export function recentFailures(attempts: readonly number[] | undefined, now: number): number[] {
  const cutoff = now - FAILED_ATTEMPT_WINDOW_MS;
  return (attempts ?? []).filter((timestamp) => timestamp > cutoff && timestamp <= now);
}

export function isRateLimited(attempts: readonly number[] | undefined, now: number): boolean {
  return recentFailures(attempts, now).length >= MAX_FAILED_ATTEMPTS;
}

export function recordFailure(attempts: readonly number[] | undefined, now: number): number[] {
  return [...recentFailures(attempts, now), now];
}
