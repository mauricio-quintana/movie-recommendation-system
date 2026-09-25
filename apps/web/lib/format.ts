const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

export type PosterSize = 'w185' | 'w342' | 'w500' | 'w780';

/** TMDB stores image paths; the full URL is built only when rendering. */
export function tmdbImage(path: string | null, size: PosterSize = 'w342'): string | null {
  return path ? `${TMDB_IMAGE_BASE}/${size}${path}` : null;
}

export function releaseYear(date: string | null): string | null {
  return date ? date.slice(0, 4) : null;
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  );
}

/** Only same-app relative paths are accepted as post-login destinations. */
export function safeNextPath(value: string | string[] | undefined): string {
  const next = Array.isArray(value) ? value[0] : value;

  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/movies';
}
