import { ForbiddenException, Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Request, Response } from 'express';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF defence for cookie-authenticated mutations: browsers always send Origin on
 * cross-site unsafe requests, so any Origin outside the trusted list is rejected.
 * Non-browser clients (no Origin header) are unaffected.
 */
@Injectable()
export class OriginCheckMiddleware implements NestMiddleware {
  private readonly trustedOrigins: Set<string>;

  constructor(config: ConfigService) {
    this.trustedOrigins = new Set(
      [
        config.get<string>('FRONTEND_URL'),
        config.get<string>('BETTER_AUTH_URL'),
      ]
        .filter((url): url is string => Boolean(url))
        .map((url) => new URL(url).origin),
    );
  }

  use(request: Request, _response: Response, next: NextFunction) {
    const origin = request.headers.origin;

    if (
      !SAFE_METHODS.has(request.method) &&
      origin &&
      !this.trustedOrigins.has(origin)
    ) {
      throw new ForbiddenException('Untrusted origin');
    }

    next();
  }
}
