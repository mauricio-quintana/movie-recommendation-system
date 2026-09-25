import { Inject, Injectable } from '@nestjs/common';
import { REDIS_CLIENT, type RedisClient } from './redis.constants.js';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

/**
 * INCR + PEXPIRE executed atomically, so every process sharing Redis sees the
 * same counter (fixed window).
 */
const FIXED_WINDOW_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
return { current, redis.call('PTTL', KEYS[1]) }
`;

/**
 * Distributed rate limiter shared by all API and worker processes.
 * Errors from Redis are propagated: each caller decides whether to fail open or closed.
 */
@Injectable()
export class RateLimiterService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: RedisClient) {}

  async consume(
    key: string,
    limit: number,
    windowMs: number,
  ): Promise<RateLimitResult> {
    const [count, ttl] = (await this.redis.eval(FIXED_WINDOW_SCRIPT, {
      keys: [`ratelimit:${key}`],
      arguments: [String(windowMs)],
    })) as [number, number];

    const allowed = count <= limit;

    return {
      allowed,
      remaining: Math.max(limit - count, 0),
      retryAfterMs: allowed ? 0 : Math.max(ttl, 1),
    };
  }
}
