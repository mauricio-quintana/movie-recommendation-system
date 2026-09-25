import type { RecommendationStatus } from './types';

export interface PollingConfig {
  /** Delay between checks while the recommendation is fresh. */
  intervalMs: number;
  /** Delay between checks once it has been running for `slowAfterMs`. */
  slowIntervalMs: number;
  slowAfterMs: number;
  /**
   * Automatic polling pauses after this long (the user can check again). Normal
   * latency is seconds; while Groq is unavailable the worker keeps requests queued
   * for up to RECOMMENDATION_MAX_WAIT_MINUTES (30). Pausing never marks the
   * recommendation as failed.
   */
  maxWaitMs: number;
}

function fromEnv(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

// NEXT_PUBLIC_* values are inlined at build time.
export const POLLING_CONFIG: PollingConfig = {
  intervalMs: fromEnv(process.env.NEXT_PUBLIC_RECOMMENDATION_POLL_INTERVAL_MS, 2_000),
  slowIntervalMs: fromEnv(process.env.NEXT_PUBLIC_RECOMMENDATION_POLL_SLOW_INTERVAL_MS, 5_000),
  slowAfterMs: 60_000,
  maxWaitMs: fromEnv(process.env.NEXT_PUBLIC_RECOMMENDATION_MAX_WAIT_MS, 5 * 60_000),
};

export function isTerminalStatus(status: RecommendationStatus): boolean {
  return status === 'COMPLETED' || status === 'FAILED';
}

export type PollDecision =
  { action: 'stop' } | { action: 'pause' } | { action: 'poll'; delayMs: number };

/**
 * What to do after observing `status`, `elapsedMs` after the wait started.
 * Only the backend decides the outcome: slow recommendations pause, never fail.
 */
export function decideNextPoll(
  status: RecommendationStatus,
  elapsedMs: number,
  config: PollingConfig = POLLING_CONFIG,
): PollDecision {
  if (isTerminalStatus(status)) {
    return { action: 'stop' };
  }

  if (elapsedMs >= config.maxWaitMs) {
    return { action: 'pause' };
  }

  const delayMs = elapsedMs >= config.slowAfterMs ? config.slowIntervalMs : config.intervalMs;

  return { action: 'poll', delayMs: Math.min(delayMs, config.maxWaitMs - elapsedMs) };
}

export interface ObservedRecommendation {
  status: RecommendationStatus;
  attempts: number;
}

/** A server re-render is only needed when something the page shows has changed. */
export function hasProgressed(
  before: ObservedRecommendation,
  after: ObservedRecommendation,
): boolean {
  return before.status !== after.status || before.attempts !== after.attempts;
}
