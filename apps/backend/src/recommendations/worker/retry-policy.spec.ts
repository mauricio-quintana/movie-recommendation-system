import { retryDelayMs } from './retry-policy.js';

describe('retryDelayMs', () => {
  const noJitter = () => 0;

  it('grows exponentially per attempt', () => {
    expect(retryDelayMs(1, undefined, noJitter)).toBe(5_000);
    expect(retryDelayMs(2, undefined, noJitter)).toBe(10_000);
    expect(retryDelayMs(3, undefined, noJitter)).toBe(20_000);
  });

  it('is capped', () => {
    expect(retryDelayMs(20, undefined, noJitter)).toBe(300_000);
  });

  it('adds bounded jitter', () => {
    expect(retryDelayMs(1, undefined, () => 0.999)).toBe(5_999);
  });

  it('honours a longer Retry-After', () => {
    expect(retryDelayMs(1, 42_000, noJitter)).toBe(42_000);
    expect(retryDelayMs(2, 1_000, noJitter)).toBe(10_000);
  });
});
