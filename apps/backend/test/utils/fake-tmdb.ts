import {
  TmdbNotFoundError,
  TmdbUnavailableError,
  type TmdbPage,
} from '../../src/movies/tmdb.client.js';

export function tmdbMovie(id: number, overrides: Record<string, unknown> = {}) {
  return {
    id,
    title: `Movie ${id}`,
    original_title: `Movie ${id}`,
    overview: `Overview of movie ${id}`,
    poster_path: `/poster-${id}.jpg`,
    backdrop_path: `/backdrop-${id}.jpg`,
    release_date: '2001-02-03',
    vote_average: 7.5,
    vote_count: 1000,
    popularity: 100 - (id % 100),
    original_language: 'en',
    genres: [{ id: 1, name: 'Drama' }],
    runtime: 120,
    tagline: 'A tagline',
    ...overrides,
  };
}

function page(results: unknown[]): TmdbPage {
  return { page: 1, total_pages: 1, total_results: results.length, results };
}

/**
 * In-memory stand-in for TmdbClient. Movie ids >= 900000 do not exist.
 */
export class FakeTmdbClient {
  language = 'es-ES';
  available = true;
  /** Movies without a translated overview in the configured language. */
  untranslated = new Set<number>();
  calls: string[] = [];
  recommendationsById = new Map<number, number[]>();
  popularIds = Array.from({ length: 20 }, (_, index) => 1000 + index);

  private guard(call: string) {
    this.calls.push(call);

    if (!this.available) {
      throw new TmdbUnavailableError('status 503');
    }
  }

  async popular(pageNumber: number) {
    this.guard(`popular:${pageNumber}`);
    return {
      ...page(this.popularIds.map((id) => tmdbMovie(id))),
      page: pageNumber,
      total_pages: 900,
    };
  }

  async search(query: string, pageNumber: number) {
    this.guard(`search:${query}:${pageNumber}`);
    return page([
      tmdbMovie(4242, { title: `Result for ${query}` }),
      { id: 'broken' },
    ]);
  }

  async recommendations(tmdbId: number) {
    this.guard(`recommendations:${tmdbId}`);
    return page(
      (this.recommendationsById.get(tmdbId) ?? []).map((id) => tmdbMovie(id)),
    );
  }

  async movie(tmdbId: number, language = this.language) {
    this.guard(`movie:${tmdbId}:${language}`);

    if (tmdbId >= 900000) {
      throw new TmdbNotFoundError();
    }

    if (this.untranslated.has(tmdbId) && language === this.language) {
      return tmdbMovie(tmdbId, { overview: '' });
    }

    return tmdbMovie(tmdbId);
  }
}
