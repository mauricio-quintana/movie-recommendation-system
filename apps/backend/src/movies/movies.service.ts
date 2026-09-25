import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  Prisma,
  PrismaClient,
  type Movie,
} from '../generated/prisma/client.js';
import { CacheService } from '../infrastructure/redis/cache.service.js';
import {
  toMovieDetail,
  toMoviePage,
  toSnapshot,
  type MovieDetail,
  type MoviePage,
  type MovieSummary,
} from './movie.mapper.js';
import {
  TmdbClient,
  TmdbNotFoundError,
  TmdbUnavailableError,
} from './tmdb.client.js';

// Responses are cached per language: v2 added it to the key.
const CACHE_VERSION = 'tmdb:v2';
// TMDB leaves the overview empty when it has no translation.
const OVERVIEW_FALLBACK_LANGUAGE = 'en-US';

const TTL_SECONDS = {
  list: 10 * 60,
  detail: 24 * 60 * 60,
  recommendations: 6 * 60 * 60,
};

/**
 * Catalog access: TMDB is the source, Redis caches mapped responses and
 * PostgreSQL keeps minimal snapshots of the movies the application uses.
 */
@Injectable()
export class MoviesService {
  private readonly logger = new Logger(MoviesService.name);

  constructor(
    private readonly tmdb: TmdbClient,
    private readonly cache: CacheService,
    private readonly prisma: PrismaClient,
  ) {}

  private get cachePrefix(): string {
    return `${CACHE_VERSION}:${this.tmdb.language}`;
  }

  list(page: number, search?: string): Promise<MoviePage> {
    const query = search?.trim();

    if (query) {
      return this.cached(
        `${this.cachePrefix}:search:${encodeURIComponent(query.toLowerCase())}:page:${page}`,
        TTL_SECONDS.list,
        async () => this.requirePage(await this.tmdb.search(query, page)),
      );
    }

    return this.cached(
      `${this.cachePrefix}:popular:page:${page}`,
      TTL_SECONDS.list,
      async () => this.requirePage(await this.tmdb.popular(page)),
    );
  }

  getMovie(tmdbId: number): Promise<MovieDetail> {
    return this.cached(
      `${this.cachePrefix}:movie:${tmdbId}`,
      TTL_SECONDS.detail,
      async () => {
        const movie = toMovieDetail(await this.tmdb.movie(tmdbId));

        if (!movie || movie.tmdbId !== tmdbId) {
          throw new TmdbUnavailableError('invalid movie payload');
        }

        if (!movie.overview) {
          movie.overview = await this.fallbackOverview(tmdbId);
        }

        return movie;
      },
    );
  }

  async getRecommendationsFor(tmdbId: number): Promise<MovieSummary[]> {
    const page = await this.cached(
      `${this.cachePrefix}:movie:${tmdbId}:recommendations`,
      TTL_SECONDS.recommendations,
      async () => this.requirePage(await this.tmdb.recommendations(tmdbId)),
    );

    return page.results;
  }

  /**
   * Returns the persisted snapshot, creating it from TMDB the first time the movie is used.
   */
  async ensureSnapshot(tmdbId: number): Promise<Movie> {
    const existing = await this.prisma.movie.findUnique({ where: { tmdbId } });

    if (existing) {
      return existing;
    }

    const snapshot = toSnapshot(await this.getMovie(tmdbId));

    return this.prisma.movie.upsert({
      where: { tmdbId },
      create: snapshot,
      update: {},
    });
  }

  /**
   * Persists snapshots for the given movies (existing rows are kept) and returns them by TMDB id.
   */
  async saveSnapshots(
    movies: MovieSummary[],
    client: Prisma.TransactionClient = this.prisma,
  ): Promise<Map<number, Movie>> {
    await client.movie.createMany({
      data: movies.map(toSnapshot),
      skipDuplicates: true,
    });

    const rows = await client.movie.findMany({
      where: { tmdbId: { in: movies.map((movie) => movie.tmdbId) } },
    });

    return new Map(rows.map((row) => [row.tmdbId, row]));
  }

  private async fallbackOverview(tmdbId: number): Promise<string | null> {
    if (this.tmdb.language === OVERVIEW_FALLBACK_LANGUAGE) {
      return null;
    }

    try {
      return (
        toMovieDetail(await this.tmdb.movie(tmdbId, OVERVIEW_FALLBACK_LANGUAGE))
          ?.overview ?? null
      );
    } catch {
      return null;
    }
  }

  private requirePage(value: unknown): MoviePage {
    const page = toMoviePage(value);

    if (!page) {
      throw new TmdbUnavailableError('invalid page payload');
    }

    return page;
  }

  private async cached<T>(
    key: string,
    ttlSeconds: number,
    load: () => Promise<T>,
  ): Promise<T> {
    try {
      return await this.cache.getOrSet(key, ttlSeconds, load);
    } catch (error) {
      if (error instanceof TmdbNotFoundError) {
        throw new NotFoundException('Movie not found');
      }

      if (error instanceof TmdbUnavailableError) {
        this.logger.warn(error.message);
        throw new ServiceUnavailableException(
          'The movie catalog is temporarily unavailable',
        );
      }

      throw error;
    }
  }
}
