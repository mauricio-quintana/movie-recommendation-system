import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { RateLimiterService } from '../infrastructure/redis/rate-limiter.service.js';

const WINDOW_MS = 60_000;

/**
 * Brute-force protection for credential endpoints, shared across API replicas via Redis.
 * Better Auth's built-in limiter only runs inside its HTTP handler, which this API does not mount.
 */
@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(AuthRateLimitGuard.name);
  private readonly limit: number;

  constructor(
    private readonly rateLimiter: RateLimiterService,
    config: ConfigService,
  ) {
    this.limit = config.get<number>('AUTH_RATE_LIMIT_PER_MINUTE', 10);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const key = `auth:${request.path}:${request.ip ?? 'unknown'}`;

    let result;

    try {
      result = await this.rateLimiter.consume(key, this.limit, WINDOW_MS);
    } catch (error) {
      // Availability over strictness for login: Redis outages must not lock every user out.
      this.logger.warn(
        `Auth rate limiter unavailable, allowing request: ${(error as Error).message}`,
      );
      return true;
    }

    if (!result.allowed) {
      context
        .switchToHttp()
        .getResponse<Response>()
        .setHeader('Retry-After', Math.ceil(result.retryAfterMs / 1000));

      throw new HttpException(
        'Too many attempts, try again later',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
