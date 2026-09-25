import {
  toMovieDetail,
  toMoviePage,
  toMovieSummary,
  toSnapshot,
} from './movie.mapper.js';

describe('movie.mapper', () => {
  const raw = {
    id: 550,
    title: 'Fight Club',
    original_title: 'Fight Club',
    overview: '',
    poster_path: '/poster.jpg',
    backdrop_path: null,
    release_date: '1999-10-15',
    vote_average: 8.4,
    vote_count: 30000,
    popularity: 60.5,
    original_language: 'en',
    genres: [{ id: 18, name: 'Drama' }, { id: 1 }],
    runtime: 139,
    tagline: 'Mischief. Mayhem. Soap.',
  };

  it('maps and normalises a TMDB movie', () => {
    expect(toMovieSummary(raw)).toEqual({
      tmdbId: 550,
      title: 'Fight Club',
      originalTitle: 'Fight Club',
      overview: null,
      posterPath: '/poster.jpg',
      backdropPath: null,
      releaseDate: '1999-10-15',
      voteAverage: 8.4,
      voteCount: 30000,
      popularity: 60.5,
      originalLanguage: 'en',
    });
  });

  it('maps details, ignoring malformed genres', () => {
    expect(toMovieDetail(raw)).toMatchObject({
      genres: ['Drama'],
      runtime: 139,
    });
  });

  it.each([
    null,
    'x',
    { id: 'a', title: 'x' },
    { id: 1 },
    { id: -1, title: 'x' },
    { id: 1, title: ' ' },
  ])('rejects invalid movie %j', (value) => {
    expect(toMovieSummary(value)).toBeNull();
  });

  it('drops invalid results and caps TMDB pagination', () => {
    const page = toMoviePage({
      page: 2,
      total_pages: 12000,
      total_results: 3,
      results: [raw, { id: 'x' }],
    });

    expect(page?.results).toHaveLength(1);
    expect(page?.totalPages).toBe(500);
    expect(toMoviePage({ results: 'nope' })).toBeNull();
  });

  it('keeps invalid dates out of the snapshot', () => {
    const summary = toMovieSummary({ ...raw, release_date: '' })!;

    expect(toSnapshot(summary).releaseDate).toBeNull();
    expect(toSnapshot(toMovieSummary(raw)!).releaseDate?.toISOString()).toBe(
      '1999-10-15T00:00:00.000Z',
    );
  });
});
