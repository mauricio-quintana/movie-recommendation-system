import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const REQUEST_TIMEOUT_MS = 5_000;

export class TmdbNotFoundError extends Error {
  constructor() {
    super('TMDB resource not found');
  }
}

export class TmdbUnavailableError extends Error {
  constructor(reason: string) {
    super(`TMDB unavailable: ${reason}`);
  }
}

export interface TmdbMovie {
  id: number;
  title: string;
  original_title?: string | null;
  overview?: string | null;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string | null;
  vote_average?: number | null;
  vote_count?: number | null;
  popularity?: number | null;
  original_language?: string | null;
  genres?: { id: number; name: string }[];
  runtime?: number | null;
  tagline?: string | null;
}

export interface TmdbPage {
  page: number;
  total_pages: number;
  total_results: number;
  results: unknown[];
}

/**
 * Thin HTTP client for the TMDB v3 API. It only transports and classifies
 * failures; mapping and validation live in movie.mapper.ts.
 */
@Injectable()
export class TmdbClient {
  private readonly logger = new Logger(TmdbClient.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;
  /** Language for titles, overviews and genres (TMDB falls back when untranslated). */
  readonly language: string;

  constructor(config: ConfigService) {
    this.apiKey = config.getOrThrow<string>('TMDB_API_KEY');
    this.baseUrl = config.getOrThrow<string>('TMDB_BASE_URL');
    this.language = config.get<string>('TMDB_LANGUAGE', 'es-ES');
  }

  popular(page: number): Promise<TmdbPage> {
    return this.get('/movie/popular', { page: String(page) });
  }

  search(query: string, page: number): Promise<TmdbPage> {
    return this.get('/search/movie', {
      query,
      page: String(page),
      include_adult: 'false',
    });
  }

  recommendations(tmdbId: number): Promise<TmdbPage> {
    return this.get(`/movie/${tmdbId}/recommendations`, { page: '1' });
  }

  movie(tmdbId: number, language = this.language): Promise<unknown> {
    return this.get(`/movie/${tmdbId}`, { language });
  }

  private async get<T>(
    path: string,
    params: Record<string, string>,
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    const headers: Record<string, string> = { Accept: 'application/json' };

    url.searchParams.set('language', this.language);

    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    // TMDB accepts either a v4 read access token (JWT) or a v3 API key.
    if (this.apiKey.startsWith('eyJ')) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    } else {
      url.searchParams.set('api_key', this.apiKey);
    }

    let response: Response;

    try {
      response = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      throw new TmdbUnavailableError(
        (error as Error).name === 'TimeoutError' ? 'timeout' : 'network error',
      );
    }

    if (response.status === 404) {
      throw new TmdbNotFoundError();
    }

    if (!response.ok) {
      // 401 means a misconfigured key: log it for operators, never leak it to clients.
      this.logger.warn(`TMDB ${path} responded with ${response.status}`);
      throw new TmdbUnavailableError(`status ${response.status}`);
    }

    try {
      return (await response.json()) as T;
    } catch {
      throw new TmdbUnavailableError('invalid JSON');
    }
  }
}
