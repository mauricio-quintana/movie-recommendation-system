import { monthLabel } from './format';
import type { Like } from './types';

export const LIKE_SORTS = [
  { key: 'recent', label: 'Más recientes', hint: 'Último like primero' },
  { key: 'az', label: 'A–Z', hint: 'Orden alfabético' },
  { key: 'year', label: 'Año', hint: 'Estreno más nuevo primero' },
] as const;

export type LikeSortKey = (typeof LIKE_SORTS)[number]['key'];

export interface LikeGroup {
  /** Empty when the sort does not group (A–Z, Año). */
  label: string;
  likes: Like[];
}

/**
 * Groups likes for display. "recent" groups by the month the like was saved, in
 * the given time zone (the browser's once hydrated). Likes arrive newest first.
 */
export function groupLikes(likes: Like[], sort: LikeSortKey, timeZone?: string): LikeGroup[] {
  if (sort === 'recent') {
    const groups = new Map<string, Like[]>();

    for (const like of likes) {
      const label = `GUARDADAS EN ${monthLabel(like.likedAt, timeZone)}`;
      groups.set(label, [...(groups.get(label) ?? []), like]);
    }

    return [...groups].map(([label, grouped]) => ({ label, likes: grouped }));
  }

  const sorted = [...likes].sort(
    sort === 'az'
      ? (a, b) => a.movie.title.localeCompare(b.movie.title, 'es')
      : (a, b) => (b.movie.releaseDate ?? '').localeCompare(a.movie.releaseDate ?? ''),
  );

  return [{ label: '', likes: sorted }];
}
