import 'server-only';

import { ApiError, apiFetch } from './api';
import type { Like } from './types';

/**
 * TMDB ids liked by the current visitor, or undefined for anonymous visitors.
 */
export async function getLikedIds(): Promise<Set<number> | undefined> {
  try {
    const likes = await apiFetch<Like[]>('/likes');
    return new Set(likes.map((like) => like.movie.tmdbId));
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return undefined;
    }

    throw error;
  }
}
