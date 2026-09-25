import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PrismaClient,
  RecommendationStatus,
  type Recommendation,
} from '../../generated/prisma/client.js';
import { RateLimiterService } from '../../infrastructure/redis/rate-limiter.service.js';
import { generateRecommendationEvent } from '../recommendation.events.js';
import { GroqClient, GroqError } from './groq.client.js';
import {
  InvalidModelOutputError,
  parseRecommendationOutput,
} from './recommendation-output.js';
import { buildRecommendationPrompt } from './recommendation-prompt.js';
import { retryDelayMs } from './retry-policy.js';

/** What the consumer must do with the message once processing ends. */
export type ProcessingOutcome = 'ack' | 'dead-letter';

// A PROCESSING recommendation not updated for this long is assumed abandoned (crashed worker).
export const PROCESSING_LEASE_MS = 2 * 60_000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const LIKED_MOVIES_IN_PROMPT = 20;

class RateLimitedError extends Error {
  constructor(readonly retryAfterMs: number) {
    super('Groq rate limit reached');
  }
}

class ProcessingFailure extends Error {
  constructor(
    readonly code: string,
    readonly retryable: boolean,
    message: string,
    readonly retryAfterMs?: number,
  ) {
    super(message);
  }
}

/**
 * Generates one recommendation. Messages are delivered at least once, so every
 * step is safe to repeat: state is checked first, the claim is a conditional
 * update and the final write is fenced by the attempt number.
 */
@Injectable()
export class RecommendationProcessor {
  private readonly logger = new Logger(RecommendationProcessor.name);
  private readonly maxAttempts: number;
  private readonly groqLimitPerMinute: number;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly groq: GroqClient,
    private readonly rateLimiter: RateLimiterService,
    config: ConfigService,
  ) {
    this.maxAttempts = config.get<number>('RECOMMENDATION_MAX_ATTEMPTS', 3);
    this.groqLimitPerMinute = config.get<number>(
      'GROQ_RATE_LIMIT_PER_MINUTE',
      30,
    );
  }

  async process(recommendationId: string): Promise<ProcessingOutcome> {
    const recommendation = await this.prisma.recommendation.findUnique({
      where: { id: recommendationId },
    });

    if (!recommendation) {
      this.logger.warn(`Recommendation ${recommendationId} does not exist`);
      return 'dead-letter';
    }

    if (
      recommendation.status === RecommendationStatus.COMPLETED ||
      recommendation.status === RecommendationStatus.FAILED
    ) {
      return 'ack'; // Duplicate delivery of finished work.
    }

    if (recommendation.status === RecommendationStatus.PROCESSING) {
      const leaseEndsAt =
        recommendation.updatedAt.getTime() + PROCESSING_LEASE_MS;

      if (leaseEndsAt > Date.now()) {
        // Another worker may still be on it: look again once its lease expires.
        await this.prisma.outboxEvent.create({
          data: generateRecommendationEvent(
            recommendation.id,
            new Date(leaseEndsAt),
          ),
        });
        return 'ack';
      }
    }

    const attempt = recommendation.attempts + 1;

    if (!(await this.claim(recommendation, attempt))) {
      return 'ack'; // Someone else changed it first.
    }

    if (attempt > this.maxAttempts) {
      // Reclaimed after abandoned attempts (e.g. repeated worker crashes).
      return this.fail(
        recommendation.id,
        attempt,
        new ProcessingFailure(
          'ATTEMPTS_EXHAUSTED',
          false,
          'Processing did not finish in time',
        ),
      );
    }

    try {
      await this.acquireGroqPermit();
      await this.generate(recommendation, attempt);
      return 'ack';
    } catch (error) {
      if (error instanceof RateLimitedError) {
        await this.postpone(recommendation.id, attempt, error.retryAfterMs);
        return 'ack';
      }

      return this.fail(recommendation.id, attempt, this.classify(error));
    }
  }

  private async claim(
    recommendation: Recommendation,
    attempt: number,
  ): Promise<boolean> {
    const { count } = await this.prisma.recommendation.updateMany({
      where: {
        id: recommendation.id,
        status: recommendation.status,
        attempts: recommendation.attempts,
        updatedAt: recommendation.updatedAt,
      },
      data: {
        status: RecommendationStatus.PROCESSING,
        attempts: attempt,
        startedAt: recommendation.startedAt ?? new Date(),
      },
    });

    return count === 1;
  }

  /**
   * Global limit shared by every worker through Redis. Fails closed: without the
   * shared counter Groq is not called.
   */
  private async acquireGroqPermit(): Promise<void> {
    let result;

    try {
      result = await this.rateLimiter.consume(
        'groq',
        this.groqLimitPerMinute,
        RATE_LIMIT_WINDOW_MS,
      );
    } catch {
      throw new ProcessingFailure(
        'RATE_LIMITER_UNAVAILABLE',
        true,
        'The rate limiter is unavailable',
      );
    }

    if (!result.allowed) {
      throw new RateLimitedError(result.retryAfterMs);
    }
  }

  private async generate(
    recommendation: Recommendation,
    attempt: number,
  ): Promise<void> {
    const [candidates, likes] = await Promise.all([
      this.prisma.movie.findMany({
        where: { tmdbId: { in: recommendation.candidateTmdbIds } },
      }),
      this.prisma.like.findMany({
        where: { userId: recommendation.userId },
        include: { movie: true },
        orderBy: { createdAt: 'desc' },
        take: LIKED_MOVIES_IN_PROMPT,
      }),
    ]);

    if (candidates.length === 0) {
      throw new ProcessingFailure(
        'INVALID_CANDIDATES',
        false,
        'The candidate set is empty',
      );
    }

    const content = await this.groq.complete(
      buildRecommendationPrompt(
        likes.map((like) => like.movie),
        candidates,
      ),
    );

    const selection = parseRecommendationOutput(
      content,
      candidates.map((movie) => movie.tmdbId),
    );
    const selectedMovie = candidates.find(
      (movie) => movie.tmdbId === selection.tmdbId,
    )!;

    const { count } = await this.prisma.recommendation.updateMany({
      where: {
        id: recommendation.id,
        status: RecommendationStatus.PROCESSING,
        attempts: attempt,
      },
      data: {
        status: RecommendationStatus.COMPLETED,
        selectedMovieId: selectedMovie.id,
        reason: selection.reason,
        completedAt: new Date(),
        failureCode: null,
        failureMessage: null,
      },
    });

    if (count === 0) {
      this.logger.warn(
        `Recommendation ${recommendation.id} was taken over; result discarded`,
      );
      return;
    }

    this.logger.log(
      `Recommendation ${recommendation.id} completed (attempt ${attempt})`,
    );
  }

  /**
   * Throttled by our own limiter: not a failed attempt, so the attempt is given back.
   */
  private async postpone(
    id: string,
    attempt: number,
    delayMs: number,
  ): Promise<void> {
    await this.reschedule(id, attempt, attempt - 1, delayMs);
  }

  private async fail(
    id: string,
    attempt: number,
    failure: ProcessingFailure,
  ): Promise<ProcessingOutcome> {
    if (failure.retryable && attempt < this.maxAttempts) {
      const delayMs = retryDelayMs(attempt, failure.retryAfterMs);
      this.logger.warn(
        `Recommendation ${id} attempt ${attempt} failed (${failure.code}), retrying in ${delayMs}ms`,
      );
      await this.reschedule(id, attempt, attempt, delayMs);
      return 'ack';
    }

    const exhausted = failure.retryable;
    this.logger.error(
      `Recommendation ${id} failed (${failure.code})${exhausted ? ' after exhausting retries' : ''}`,
    );

    await this.prisma.recommendation.updateMany({
      where: { id, status: RecommendationStatus.PROCESSING, attempts: attempt },
      data: {
        status: RecommendationStatus.FAILED,
        failureCode: failure.code,
        failureMessage: exhausted
          ? `${failure.message}. Retries exhausted.`
          : failure.message,
        completedAt: new Date(),
      },
    });

    return 'dead-letter';
  }

  /**
   * Back to PENDING plus a delayed outbox event, in one transaction: the backoff is
   * durable and needs no extra broker topology.
   */
  private async reschedule(
    id: string,
    attempt: number,
    attempts: number,
    delayMs: number,
  ) {
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.recommendation.updateMany({
        where: {
          id,
          status: RecommendationStatus.PROCESSING,
          attempts: attempt,
        },
        data: { status: RecommendationStatus.PENDING, attempts },
      });

      if (count === 1) {
        await tx.outboxEvent.create({
          data: generateRecommendationEvent(id, new Date(Date.now() + delayMs)),
        });
      }
    });
  }

  private classify(error: unknown): ProcessingFailure {
    if (error instanceof ProcessingFailure) {
      return error;
    }

    if (error instanceof GroqError) {
      return new ProcessingFailure(
        error.code,
        error.retryable,
        error.message,
        error.retryAfterMs,
      );
    }

    if (error instanceof InvalidModelOutputError) {
      return new ProcessingFailure(
        'INVALID_MODEL_OUTPUT',
        false,
        error.message,
      );
    }

    // Infrastructure errors (e.g. PostgreSQL) surface to the consumer, which requeues the message.
    throw error;
  }
}
