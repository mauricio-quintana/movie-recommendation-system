import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  AUTH,
  type Auth,
  type AuthenticatedRequest,
} from './auth.constants.js';
import { forwardAuthCookies, toAuthHeaders } from './auth-headers.js';

/**
 * Resolves the Better Auth session from the request cookies. The authenticated
 * user is the only source of identity for private resources.
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(@Inject(AUTH) private readonly auth: Auth) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const request = http.getRequest<AuthenticatedRequest>();

    const { headers, response } = await this.auth.api.getSession({
      headers: toAuthHeaders(request),
      returnHeaders: true,
    });

    if (!response?.user.username) {
      throw new UnauthorizedException('Authentication required');
    }

    // Session refreshes (updateAge) are delivered as Set-Cookie headers.
    forwardAuthCookies(headers, http.getResponse<Response>());

    request.authUser = {
      id: response.user.id,
      username: response.user.username,
    };

    return true;
  }
}
