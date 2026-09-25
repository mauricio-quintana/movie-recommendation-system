import 'server-only';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Session } from './types';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function errorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string | string[] };
    const message = Array.isArray(body.message) ? body.message.join('. ') : body.message;

    return message || response.statusText;
  } catch {
    return response.statusText || 'Unexpected error';
  }
}

/**
 * Server-side call to the NestJS API, forwarding the user's session cookie.
 * Authorization is always decided by the backend.
 */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const cookieHeader = (await cookies()).toString();

  const response = await fetch(`${BACKEND_URL}/api${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      ...init.headers,
    },
  });

  if (!response.ok) {
    throw new ApiError(response.status, await errorMessage(response));
  }

  return (response.status === 204 ? undefined : await response.json()) as T;
}

/**
 * Like apiFetch, but sends anonymous users to the login page.
 */
export async function apiFetchAuthenticated<T>(path: string, returnTo: string): Promise<T> {
  try {
    return await apiFetch<T>(path);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect(`/login?next=${encodeURIComponent(returnTo)}`);
    }

    throw error;
  }
}

export async function getSession(): Promise<Session> {
  try {
    return await apiFetch<Session>('/auth/session');
  } catch {
    return { authenticated: false, user: null, expiresAt: null };
  }
}
