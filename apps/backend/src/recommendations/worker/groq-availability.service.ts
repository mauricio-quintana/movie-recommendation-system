import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  REDIS_CLIENT,
  type RedisClient,
} from '../../infrastructure/redis/redis.constants.js';
import { retryDelayMs } from './retry-policy.js';

const UNTIL_KEY = 'groq:unavailable:until';
const FAILURES_KEY = 'groq:unavailable:failures';
// Consecutive-failure memory: resets once Groq has been fine for a while.
const FAILURES_TTL_SECONDS = 60 * 60;

/**
 * Shared circuit breaker for Groq availability. When a call fails for a transient
 * reason (429, 5xx, timeout, network), every worker pauses Groq calls until the
 * backoff expires, so queued recommendations wait instead of hammering (and
 * failing against) an unavailable provider. The pause grows exponentially with
 * consecutive failures (5 s … 5 min) and honours Retry-After.
 */
@Injectable()
export class GroqAvailabilityService {
  private readonly logger = new Logger(GroqAvailabilityService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: RedisClient) {}

  /** Epoch ms until which Groq must not be called, or null when available. */
  async pausedUntil(now = Date.now()): Promise<number | null> {
    try {
      const until = Number(await this.redis.get(UNTIL_KEY));
      return until > now ? until : null;
    } catch {
      // Unknown state: the (fail-closed) rate limiter decides next.
      return null;
    }
  }

  /** Records a transient failure and returns when Groq may be called again. */
  async reportUnavailable(
    retryAfterMs?: number,
    now = Date.now(),
  ): Promise<number> {
    try {
      const failures = await this.redis.incr(FAILURES_KEY);
      await this.redis.expire(FAILURES_KEY, FAILURES_TTL_SECONDS);

      const delayMs = retryDelayMs(failures, retryAfterMs);
      const until = now + delayMs;
      await this.redis.set(UNTIL_KEY, String(until), {
        expiration: { type: 'PX', value: delayMs },
      });

      this.logger.warn(
        `Groq unavailable (${failures} consecutive failures): pausing calls for ${delayMs}ms`,
      );

      return until;
    } catch {
      return now + retryDelayMs(1, retryAfterMs);
    }
  }

  async reportAvailable(): Promise<void> {
    try {
      await this.redis.del([UNTIL_KEY, FAILURES_KEY]);
    } catch {
      // The pause simply expires on its own.
    }
  }
}
