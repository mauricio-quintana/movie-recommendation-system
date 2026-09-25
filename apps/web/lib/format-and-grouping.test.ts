import { describe, expect, it } from 'vitest';
import { formatDateTime, monthLabel } from './format';
import { groupLikes } from './likes-grouping';
import type { Like } from './types';

function like(tmdbId: number, title: string, likedAt: string, releaseDate: string): Like {
  return {
    likedAt,
    movie: {
      tmdbId,
      title,
      releaseDate,
      originalTitle: null,
      overview: null,
      posterPath: null,
      backdropPath: null,
      voteAverage: null,
      voteCount: null,
      popularity: null,
      originalLanguage: null,
    },
  };
}

describe('formatDateTime', () => {
  it('formats in the requested time zone, never forcing UTC', () => {
    const iso = '2026-09-25T02:30:00.000Z';

    expect(formatDateTime(iso, 'UTC')).toBe('25 sep 2026 · 02:30');
    expect(formatDateTime(iso, 'America/Argentina/Buenos_Aires')).toBe('24 sep 2026 · 23:30');
  });
});

describe('groupLikes', () => {
  // Newest first, as returned by the API. The first one is October in UTC but
  // still September in Buenos Aires (UTC-3).
  const likes = [
    like(1, 'Zodiac', '2026-10-01T01:00:00.000Z', '2007-03-02'),
    like(2, 'Arrival', '2026-09-20T12:00:00.000Z', '2016-11-10'),
    like(3, 'Her', '2026-08-03T12:00:00.000Z', '2013-12-18'),
  ];

  it('groups recent likes by month in the browser time zone', () => {
    const local = groupLikes(likes, 'recent', 'America/Argentina/Buenos_Aires');

    expect(local.map((group) => [group.label, group.likes.map((l) => l.movie.tmdbId)])).toEqual([
      ['GUARDADAS EN SEPTIEMBRE 2026', [1, 2]],
      ['GUARDADAS EN AGOSTO 2026', [3]],
    ]);
    expect(groupLikes(likes, 'recent', 'UTC')[0].label).toBe('GUARDADAS EN OCTUBRE 2026');
    expect(monthLabel(likes[0].likedAt, 'UTC')).toBe('OCTUBRE 2026');
  });

  it('sorts alphabetically and by release year without groups', () => {
    expect(
      groupLikes(likes, 'az').map((g) => [g.label, g.likes.map((l) => l.movie.title)]),
    ).toEqual([['', ['Arrival', 'Her', 'Zodiac']]]);
    expect(groupLikes(likes, 'year')[0].likes.map((l) => l.movie.tmdbId)).toEqual([2, 3, 1]);
  });
});
