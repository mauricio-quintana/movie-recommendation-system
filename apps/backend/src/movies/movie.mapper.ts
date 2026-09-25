import type { TmdbMovie } from './tmdb.client.js';

export interface MovieSummary {
  tmdbId: number;
  title: string;
  originalTitle: string | null;
  overview: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string | null;
  voteAverage: number | null;
  voteCount: number | null;
  popularity: number | null;
  originalLanguage: string | null;
}

export interface MovieDetail extends MovieSummary {
  genres: string[];
  runtime: number | null;
  tagline: string | null;
}

export interface MoviePage {
  page: number;
  totalPages: number;
  totalResults: number;
  results: MovieSummary[];
}

// TMDB never serves pages beyond 500.
export const TMDB_MAX_PAGE = 500;

const text = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value : null;

const number = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const isoDate = (value: unknown): string | null =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;

function isTmdbMovie(value: unknown): value is TmdbMovie {
  const movie = value as TmdbMovie | null;

  return (
    typeof movie === 'object' &&
    movie !== null &&
    Number.isInteger(movie.id) &&
    movie.id > 0 &&
    typeof movie.title === 'string' &&
    movie.title.trim() !== ''
  );
}

/**
 * Validates and normalises a TMDB movie. Returns null for payloads that are not usable.
 */
export function toMovieSummary(value: unknown): MovieSummary | null {
  if (!isTmdbMovie(value)) {
    return null;
  }

  return {
    tmdbId: value.id,
    title: value.title,
    originalTitle: text(value.original_title),
    overview: text(value.overview),
    posterPath: text(value.poster_path),
    backdropPath: text(value.backdrop_path),
    releaseDate: isoDate(value.release_date),
    voteAverage: number(value.vote_average),
    voteCount: number(value.vote_count),
    popularity: number(value.popularity),
    originalLanguage: text(value.original_language),
  };
}

export function toMovieDetail(value: unknown): MovieDetail | null {
  const summary = toMovieSummary(value);

  if (!summary) {
    return null;
  }

  const movie = value as TmdbMovie;

  return {
    ...summary,
    genres: Array.isArray(movie.genres)
      ? movie.genres
          .map((genre) => genre?.name)
          .filter((name): name is string => typeof name === 'string')
      : [],
    runtime: number(movie.runtime),
    tagline: text(movie.tagline),
  };
}

export function toMoviePage(value: unknown): MoviePage | null {
  const page = value as {
    page?: unknown;
    total_pages?: unknown;
    total_results?: unknown;
    results?: unknown;
  };

  if (
    typeof page !== 'object' ||
    page === null ||
    !Array.isArray(page.results)
  ) {
    return null;
  }

  return {
    page: number(page.page) ?? 1,
    totalPages: Math.min(number(page.total_pages) ?? 0, TMDB_MAX_PAGE),
    totalResults: number(page.total_results) ?? 0,
    results: page.results
      .map(toMovieSummary)
      .filter((movie): movie is MovieSummary => movie !== null),
  };
}

/**
 * Minimal snapshot persisted in PostgreSQL (image paths, never full URLs).
 */
export function toSnapshot(movie: MovieSummary) {
  return {
    tmdbId: movie.tmdbId,
    title: movie.title,
    originalTitle: movie.originalTitle,
    overview: movie.overview,
    posterPath: movie.posterPath,
    backdropPath: movie.backdropPath,
    releaseDate: movie.releaseDate
      ? new Date(`${movie.releaseDate}T00:00:00.000Z`)
      : null,
    voteAverage: movie.voteAverage,
    voteCount: movie.voteCount,
    popularity: movie.popularity,
    originalLanguage: movie.originalLanguage,
  };
}
