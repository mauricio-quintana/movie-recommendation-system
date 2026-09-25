export interface Movie {
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

export interface MovieDetail extends Movie {
  genres: string[];
  runtime: number | null;
  tagline: string | null;
}

export interface MoviePage {
  page: number;
  totalPages: number;
  totalResults: number;
  results: Movie[];
}

export interface Like {
  likedAt: string;
  movie: Movie;
}

export type RecommendationStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface Recommendation {
  id: string;
  status: RecommendationStatus;
  attempts: number;
  candidateTmdbIds: number[];
  selectedMovie: Movie | null;
  reason: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface SessionUser {
  id: string;
  username: string;
}

export interface Session {
  authenticated: boolean;
  user: SessionUser | null;
  expiresAt: string | null;
}

export type ActionResult = { ok: true } | { ok: false; error: string };
