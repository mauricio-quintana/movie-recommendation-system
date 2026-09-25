import { describe, expect, it } from 'vitest';
import {
  decideNextPoll,
  hasProgressed,
  isTerminalStatus,
  type PollingConfig,
} from './recommendation-polling';

const config: PollingConfig = {
  intervalMs: 2_000,
  slowIntervalMs: 5_000,
  slowAfterMs: 60_000,
  maxWaitMs: 300_000,
};

describe('decideNextPoll', () => {
  it.each(['COMPLETED', 'FAILED'] as const)('stops on the terminal status %s', (status) => {
    expect(decideNextPoll(status, 1_000, config)).toEqual({ action: 'stop' });
    expect(decideNextPoll(status, 999_999, config)).toEqual({ action: 'stop' });
  });

  it.each(['PENDING', 'PROCESSING'] as const)('keeps polling %s at the base interval', (status) => {
    expect(decideNextPoll(status, 0, config)).toEqual({ action: 'poll', delayMs: 2_000 });
    expect(decideNextPoll(status, 59_000, config)).toEqual({ action: 'poll', delayMs: 2_000 });
  });

  it('slows down after the first minute', () => {
    expect(decideNextPoll('PROCESSING', 60_000, config)).toEqual({
      action: 'poll',
      delayMs: 5_000,
    });
  });

  it('never schedules a check beyond the max wait', () => {
    expect(decideNextPoll('PENDING', 298_000, config)).toEqual({ action: 'poll', delayMs: 2_000 });
    expect(decideNextPoll('PENDING', 299_500, config)).toEqual({ action: 'poll', delayMs: 500 });
  });

  it('pauses (never fails) a recommendation still running after the max wait', () => {
    expect(decideNextPoll('PROCESSING', 300_000, config)).toEqual({ action: 'pause' });
    expect(decideNextPoll('PENDING', 3_600_000, config)).toEqual({ action: 'pause' });
  });

  it('only pauses well after the normal worker retry window', async () => {
    const { POLLING_CONFIG } = await import('./recommendation-polling');
    // Provider hiccups: 3 calls × 20 s timeout + 60 s Retry-After twice + a 60 s
    // rate-limit window. Longer outages keep the request queued (backend) and the
    // UI offers to check again.
    const workerWorstCaseMs = 3 * 20_000 + 2 * 60_000 + 60_000;

    expect(POLLING_CONFIG.maxWaitMs).toBeGreaterThanOrEqual(workerWorstCaseMs);
  });
});

describe('hasProgressed', () => {
  it('detects status and attempt changes only', () => {
    expect(
      hasProgressed({ status: 'PENDING', attempts: 0 }, { status: 'PENDING', attempts: 0 }),
    ).toBe(false);
    expect(
      hasProgressed({ status: 'PENDING', attempts: 0 }, { status: 'PROCESSING', attempts: 1 }),
    ).toBe(true);
    // Back to PENDING for a retry: same status, new attempt.
    expect(
      hasProgressed({ status: 'PENDING', attempts: 1 }, { status: 'PENDING', attempts: 2 }),
    ).toBe(true);
  });
});

describe('isTerminalStatus', () => {
  it('only COMPLETED and FAILED are terminal', () => {
    expect(
      ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'].map((s) => isTerminalStatus(s as never)),
    ).toEqual([false, false, true, true]);
  });
});
