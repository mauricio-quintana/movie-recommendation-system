import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client.js';
import { MoviesService } from '../movies/movies.service.js';
import { CandidateSelectorService } from './candidate-selector.service.js';
import {
  toRecommendationDto,
  type RecommendationDto,
} from './dto/recommendation.dto.js';
import { generateRecommendationEvent } from './recommendation.events.js';

@Injectable()
export class RecommendationsService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly moviesService: MoviesService,
    private readonly candidateSelector: CandidateSelectorService,
  ) {}

  /**
   * Accepts a recommendation request. The slow work (Groq) happens in the worker:
   * the recommendation and its outbox event are committed in a single transaction.
   */
  async request(userId: string) {
    // External calls (TMDB) happen before the transaction, never inside it.
    const candidates = await this.candidateSelector.select(userId);

    return this.prisma.$transaction(async (tx) => {
      // Candidate snapshots let the worker build the prompt from PostgreSQL alone.
      await this.moviesService.saveSnapshots(candidates, tx);

      const recommendation = await tx.recommendation.create({
        data: {
          userId,
          candidateTmdbIds: candidates.map((movie) => movie.tmdbId),
        },
        select: { id: true, status: true, createdAt: true },
      });

      await tx.outboxEvent.create({
        data: generateRecommendationEvent(recommendation.id),
      });

      return recommendation;
    });
  }

  async list(userId: string): Promise<RecommendationDto[]> {
    const recommendations = await this.prisma.recommendation.findMany({
      where: { userId },
      include: { selectedMovie: true },
      orderBy: { createdAt: 'desc' },
    });

    return recommendations.map(toRecommendationDto);
  }

  /**
   * Ownership is part of the query: another user's recommendation is indistinguishable
   * from a missing one (404), so ids cannot be probed.
   */
  async get(userId: string, id: string): Promise<RecommendationDto> {
    const recommendation = await this.prisma.recommendation.findFirst({
      where: { id, userId },
      include: { selectedMovie: true },
    });

    if (!recommendation) {
      throw new NotFoundException('Recommendation not found');
    }

    return toRecommendationDto(recommendation);
  }
}
