import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client.js';
import type { MovieSummary } from '../movies/movie.mapper.js';
import { MoviesService } from '../movies/movies.service.js';

export const MAX_CANDIDATES = 20;
const MAX_SEED_LIKES = 5;

/**
 * Defines the closed set of movies the LLM may choose from, before any call to Groq:
 * TMDB recommendations of the user's most recent likes, ranked by how many liked
 * movies point to them. Users without likes get popular movies (cold start).
 */
@Injectable()
export class CandidateSelectorService {
  private readonly logger = new Logger(CandidateSelectorService.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly moviesService: MoviesService,
  ) {}

  async select(userId: string): Promise<MovieSummary[]> {
    const likes = await this.prisma.like.findMany({
      where: { userId },
      select: { movie: { select: { tmdbId: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const likedIds = new Set(likes.map((like) => like.movie.tmdbId));
    const seeds = [...likedIds].slice(0, MAX_SEED_LIKES);

    let candidates = await this.fromLikes(seeds, likedIds);

    if (candidates.length === 0) {
      const popular = await this.moviesService.list(1);
      candidates = popular.results.filter(
        (movie) => !likedIds.has(movie.tmdbId),
      );
    }

    if (candidates.length === 0) {
      throw new ServiceUnavailableException(
        'No recommendation candidates are available right now',
      );
    }

    return candidates.slice(0, MAX_CANDIDATES);
  }

  private async fromLikes(
    seeds: number[],
    likedIds: Set<number>,
  ): Promise<MovieSummary[]> {
    const results = await Promise.allSettled(
      seeds.map((tmdbId) => this.moviesService.getRecommendationsFor(tmdbId)),
    );

    const scored = new Map<number, { movie: MovieSummary; score: number }>();

    for (const result of results) {
      if (result.status === 'rejected') {
        this.logger.warn(
          `Skipping candidate source: ${(result.reason as Error).message}`,
        );
        continue;
      }

      for (const movie of result.value) {
        if (likedIds.has(movie.tmdbId)) {
          continue;
        }

        const entry = scored.get(movie.tmdbId) ?? { movie, score: 0 };
        entry.score += 1;
        scored.set(movie.tmdbId, entry);
      }
    }

    return [...scored.values()]
      .sort(
        (a, b) =>
          b.score - a.score ||
          (b.movie.popularity ?? 0) - (a.movie.popularity ?? 0),
      )
      .map((entry) => entry.movie);
  }
}
