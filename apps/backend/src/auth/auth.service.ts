import {
  BadRequestException,
  ConflictException,
  HttpException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { isAPIError } from 'better-auth/api';
import { AUTH, type Auth, type AuthUser } from './auth.constants.js';
import type { CredentialsDto } from './dto/credentials.dto.js';

export interface AuthOutcome<T> {
  headers: Headers | null;
  result: T;
}

export interface SessionState {
  authenticated: boolean;
  user: AuthUser | null;
  expiresAt: Date | null;
}

const CONFLICT_CODES = new Set([
  'USERNAME_IS_ALREADY_TAKEN',
  'USER_ALREADY_EXISTS',
  'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL',
]);

const VALIDATION_CODES = new Set([
  'INVALID_USERNAME',
  'USERNAME_TOO_SHORT',
  'USERNAME_TOO_LONG',
  'PASSWORD_TOO_SHORT',
  'PASSWORD_TOO_LONG',
]);

/**
 * Exposes the public username/password contract on top of Better Auth.
 * Better Auth still owns hashing, sessions and cookies; this service only
 * adapts the input and maps its errors to stable HTTP responses.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(@Inject(AUTH) private readonly auth: Auth) {}

  async signUp(
    credentials: CredentialsDto,
    headers: Headers,
  ): Promise<AuthOutcome<AuthUser>> {
    const username = credentials.username.toLowerCase();

    const outcome = await this.call(() =>
      this.auth.api.signUpEmail({
        body: {
          // Better Auth requires email and name internally; the product only exposes username/password.
          email: `${username}@users.invalid`,
          name: username,
          username,
          password: credentials.password,
        },
        headers,
        returnHeaders: true,
      }),
    );

    return {
      headers: outcome.headers,
      result: { id: outcome.response.user.id, username },
    };
  }

  async signIn(
    credentials: CredentialsDto,
    headers: Headers,
  ): Promise<AuthOutcome<AuthUser>> {
    const outcome = await this.call(() =>
      this.auth.api.signInUsername({
        body: {
          username: credentials.username,
          password: credentials.password,
        },
        headers,
        returnHeaders: true,
      }),
    );

    const user = outcome.response?.user as
      { id: string; username?: string | null } | undefined;

    if (!user) {
      throw new UnauthorizedException('Invalid username or password');
    }

    return {
      headers: outcome.headers,
      result: {
        id: user.id,
        username: user.username ?? credentials.username.toLowerCase(),
      },
    };
  }

  async signOut(headers: Headers): Promise<Headers | null> {
    const outcome = await this.call(() =>
      this.auth.api.signOut({ headers, returnHeaders: true }),
    );

    return outcome.headers;
  }

  async getSession(headers: Headers): Promise<AuthOutcome<SessionState>> {
    const outcome = await this.call(() =>
      this.auth.api.getSession({ headers, returnHeaders: true }),
    );
    const session = outcome.response;

    if (!session?.user.username) {
      return {
        headers: outcome.headers,
        result: { authenticated: false, user: null, expiresAt: null },
      };
    }

    return {
      headers: outcome.headers,
      result: {
        authenticated: true,
        user: { id: session.user.id, username: session.user.username },
        expiresAt: session.session.expiresAt,
      },
    };
  }

  private async call<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  private toHttpException(error: unknown): HttpException {
    if (!isAPIError(error)) {
      this.logger.error(
        `Unexpected authentication error: ${(error as Error)?.message}`,
      );
      return new ServiceUnavailableException(
        'Authentication is temporarily unavailable',
      );
    }

    const code =
      typeof error.body?.code === 'string' ? error.body.code : undefined;

    if (code && CONFLICT_CODES.has(code)) {
      return new ConflictException('Username is already taken');
    }

    if (code && VALIDATION_CODES.has(code)) {
      return new BadRequestException(
        error.body?.message ?? 'Invalid credentials format',
      );
    }

    if (error.statusCode === 401) {
      return new UnauthorizedException('Invalid username or password');
    }

    if (error.statusCode >= 400 && error.statusCode < 500) {
      return new BadRequestException('Invalid authentication request');
    }

    this.logger.error(
      `Better Auth error ${error.statusCode}: ${code ?? 'unknown'}`,
    );
    return new ServiceUnavailableException(
      'Authentication is temporarily unavailable',
    );
  }
}
