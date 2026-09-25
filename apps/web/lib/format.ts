import type { Movie, RecommendationStatus } from './types';

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

export type ImageSize = 'w185' | 'w342' | 'w500' | 'w780' | 'w1280';

/** TMDB stores image paths; the full URL is built only when rendering. */
export function tmdbImage(path: string | null, size: ImageSize = 'w342'): string | null {
  return path ? `${TMDB_IMAGE_BASE}/${size}${path}` : null;
}

export function releaseYear(date: string | null): string | null {
  return date ? date.slice(0, 4) : null;
}

/** "2014 · ★ 8.4", the meta line under every poster. */
export function movieMeta(movie: Pick<Movie, 'releaseDate' | 'voteAverage'>): string {
  return [
    releaseYear(movie.releaseDate),
    movie.voteAverage !== null && movie.voteAverage > 0
      ? `★ ${movie.voteAverage.toFixed(1)}`
      : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

export function formatRuntime(minutes: number | null): string | null {
  if (!minutes) {
    return null;
  }

  const hours = Math.floor(minutes / 60);
  return hours > 0 ? `${hours} h ${minutes % 60} min` : `${minutes} min`;
}

/** "24 sep 2026 · 18:04". Without timeZone, the runtime's (the browser's on the client). */
export function formatDateTime(value: string, timeZone?: string): string {
  const date = new Date(value);
  const day = new Intl.DateTimeFormat('es', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone,
  })
    .format(date)
    .replace(/\./g, '')
    .replace(/ de /g, ' ')
    // Some ICU versions abbreviate September as "sept"; the design uses three letters.
    .replace('sept', 'sep');
  const time = new Intl.DateTimeFormat('es', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone,
  }).format(date);

  return `${day} · ${time}`;
}

/** "SEPTIEMBRE 2026" */
export function monthLabel(value: string, timeZone?: string): string {
  return new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric', timeZone })
    .format(new Date(value))
    .replace(/ de /g, ' ')
    .toUpperCase();
}

export function isActiveStatus(status: RecommendationStatus): boolean {
  return status === 'PENDING' || status === 'PROCESSING';
}

/** Only same-app relative paths are accepted as post-login destinations. */
export function safeNextPath(value: string | string[] | undefined): string {
  const next = Array.isArray(value) ? value[0] : value;

  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/movies';
}

export function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
