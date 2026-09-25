import type { Request, Response } from 'express';
import { fromNodeHeaders } from 'better-auth/node';

export function toAuthHeaders(request: Request): Headers {
  return fromNodeHeaders(request.headers);
}

/**
 * Better Auth manages the session cookies; forward whatever it sets or clears.
 */
export function forwardAuthCookies(
  headers: Headers | null | undefined,
  response: Response,
): void {
  const cookies = headers?.getSetCookie() ?? [];

  if (cookies.length > 0) {
    response.append('Set-Cookie', cookies);
  }
}
