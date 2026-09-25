import type { Request } from 'express';
import type { auth } from '../lib/auth.js';

export const AUTH = Symbol('AUTH');

export type Auth = typeof auth;

export interface AuthUser {
  id: string;
  username: string;
}

export interface AuthenticatedRequest extends Request {
  authUser: AuthUser;
}
