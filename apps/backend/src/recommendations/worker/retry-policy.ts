const BASE_DELAY_MS = 5_000;
const MAX_DELAY_MS = 5 * 60_000;
const MAX_JITTER_MS = 1_000;

/**
 * Exponential backoff with jitter for the given (1-based) attempt that just failed.
 * A provider Retry-After is honoured when it asks for a longer wait.
 */
export function retryDelayMs(
  attempt: number,
  retryAfterMs?: number,
  random = Math.random,
): number {
  const exponential = Math.min(
    BASE_DELAY_MS * 2 ** Math.max(attempt - 1, 0),
    MAX_DELAY_MS,
  );
  const delay = exponential + Math.floor(random() * MAX_JITTER_MS);

  return Math.max(delay, retryAfterMs ?? 0);
}
