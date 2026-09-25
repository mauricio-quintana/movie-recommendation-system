import { randomUUID } from 'node:crypto';
import { Test, type TestingModule } from '@nestjs/testing';
import {
  PrismaClient,
  RecommendationStatus,
} from '../src/generated/prisma/client.js';
import {
  RabbitMqService,
  type PublishOptions,
} from '../src/infrastructure/rabbitmq/rabbitmq.service.js';
import {
  REDIS_CLIENT,
  type RedisClient,
} from '../src/infrastructure/redis/redis.constants.js';
import { RateLimiterService } from '../src/infrastructure/redis/rate-limiter.service.js';
import { OutboxPublisher } from '../src/outbox/outbox.publisher.js';
import { generateRecommendationEvent } from '../src/recommendations/recommendation.events.js';
import {
  GroqClient,
  GroqError,
  type ChatMessage,
} from '../src/recommendations/worker/groq.client.js';
import {
  PROCESSING_LEASE_MS,
  RecommendationProcessor,
} from '../src/recommendations/worker/recommendation.processor.js';
import { WorkerModule } from '../src/worker.module.js';

class FakeGroq {
  calls: ChatMessage[][] = [];
  next: () => Promise<string> = async () => '{}';

  async complete(messages: ChatMessage[]) {
    this.calls.push(messages);
    return this.next();
  }
}

class FakeRabbit {
  published: {
    exchange: string;
    routingKey: string;
    payload: unknown;
    options: PublishOptions;
  }[] = [];
  fail = false;

  async publish(
    exchange: string,
    routingKey: string,
    payload: unknown,
    options: PublishOptions,
  ) {
    if (this.fail) {
      throw new Error('Broker did not confirm the message');
    }

    this.published.push({ exchange, routingKey, payload, options });
  }
}

async function createWorker(
  overrides: { provide: unknown; useValue: unknown }[] = [],
) {
  let builder = Test.createTestingModule({ imports: [WorkerModule] });

  for (const override of overrides) {
    builder = builder
      .overrideProvider(override.provide)
      .useValue(override.useValue);
  }

  // Lifecycle hooks (consumer, outbox polling) are not started: tests drive them explicitly.
  return builder.compile();
}

describe('Recommendation worker (integration)', () => {
  let worker: TestingModule;
  let prisma: PrismaClient;
  let redis: RedisClient;
  let groq: FakeGroq;
  let rabbit: FakeRabbit;
  let processor: RecommendationProcessor;
  let userId: string;

  beforeAll(async () => {
    groq = new FakeGroq();
    rabbit = new FakeRabbit();
    worker = await createWorker([
      { provide: GroqClient, useValue: groq },
      { provide: RabbitMqService, useValue: rabbit },
    ]);
    prisma = worker.get(PrismaClient);
    redis = worker.get(REDIS_CLIENT);
    processor = worker.get(RecommendationProcessor);

    userId = randomUUID();
    await prisma.user.create({
      data: {
        id: userId,
        name: 'worker',
        email: `${userId}@users.invalid`,
        username: `w_${userId.slice(0, 8)}`,
      },
    });

    const liked = await prisma.movie.upsert({
      where: { tmdbId: 5000 },
      create: { tmdbId: 5000, title: 'Liked movie', overview: 'A liked movie' },
      update: {},
    });
    await prisma.like.create({ data: { userId, movieId: liked.id } });

    for (const tmdbId of [5001, 5002, 5003]) {
      await prisma.movie.upsert({
        where: { tmdbId },
        create: {
          tmdbId,
          title: `Candidate ${tmdbId}`,
          releaseDate: new Date('2010-01-01'),
        },
        update: {},
      });
    }
  });

  beforeEach(async () => {
    groq.calls = [];
    rabbit.published = [];
    rabbit.fail = false;
    await redis.del('ratelimit:groq');
  });

  afterAll(async () => {
    await worker.close();
  });

  async function createRecommendation(data: Record<string, unknown> = {}) {
    return prisma.recommendation.create({
      data: { userId, candidateTmdbIds: [5001, 5002, 5003], ...data },
    });
  }

  const reload = (id: string) =>
    prisma.recommendation.findUniqueOrThrow({ where: { id } });
  const pendingEvents = (id: string) =>
    prisma.outboxEvent.findMany({
      where: { aggregateId: id, publishedAt: null },
      orderBy: { availableAt: 'asc' },
    });

  it('completes a recommendation with a validated candidate', async () => {
    const recommendation = await createRecommendation();
    groq.next = async () =>
      '{"tmdbId": 5002, "reason": "It matches what you like."}';

    await expect(processor.process(recommendation.id)).resolves.toBe('ack');

    const stored = await reload(recommendation.id);
    const selected = await prisma.movie.findUniqueOrThrow({
      where: { tmdbId: 5002 },
    });
    expect(stored).toMatchObject({
      status: RecommendationStatus.COMPLETED,
      attempts: 1,
      selectedMovieId: selected.id,
      reason: 'It matches what you like.',
      failureCode: null,
    });
    expect(stored.startedAt).toBeInstanceOf(Date);
    expect(stored.completedAt).toBeInstanceOf(Date);

    // The prompt carries the liked movies and only the candidate set.
    const prompt = JSON.parse(groq.calls[0][1].content);
    expect(
      prompt.likedMovies.map((movie: { tmdbId: number }) => movie.tmdbId),
    ).toEqual([5000]);
    expect(
      prompt.candidates.map((movie: { tmdbId: number }) => movie.tmdbId).sort(),
    ).toEqual([5001, 5002, 5003]);
  });

  it('is idempotent for finished recommendations', async () => {
    const recommendation = await createRecommendation();
    groq.next = async () => '{"tmdbId": 5001, "reason": "Great fit."}';

    await processor.process(recommendation.id);
    await expect(processor.process(recommendation.id)).resolves.toBe('ack');

    expect(groq.calls).toHaveLength(1);
    expect((await reload(recommendation.id)).attempts).toBe(1);
  });

  it('fails without retry when the model picks a movie outside the candidates', async () => {
    const recommendation = await createRecommendation();
    groq.next = async () => '{"tmdbId": 9999, "reason": "Not allowed."}';

    await expect(processor.process(recommendation.id)).resolves.toBe(
      'dead-letter',
    );

    expect(await reload(recommendation.id)).toMatchObject({
      status: RecommendationStatus.FAILED,
      failureCode: 'INVALID_MODEL_OUTPUT',
      selectedMovieId: null,
      attempts: 1,
    });
    expect(await pendingEvents(recommendation.id)).toHaveLength(0);
  });

  it('fails without retry on invalid credentials', async () => {
    const recommendation = await createRecommendation();
    groq.next = async () => {
      throw new GroqError(
        'GROQ_AUTH_FAILED',
        false,
        'Groq rejected the configured credentials',
      );
    };

    await expect(processor.process(recommendation.id)).resolves.toBe(
      'dead-letter',
    );
    expect((await reload(recommendation.id)).failureCode).toBe(
      'GROQ_AUTH_FAILED',
    );
  });

  it('retries transient failures with backoff until attempts are exhausted', async () => {
    const recommendation = await createRecommendation();
    groq.next = async () => {
      throw new GroqError(
        'GROQ_UNAVAILABLE',
        true,
        'Groq is temporarily unavailable',
        30_000,
      );
    };

    // Attempts 1 and 2: back to PENDING with a delayed outbox event.
    for (const attempt of [1, 2]) {
      const before = Date.now();
      await expect(processor.process(recommendation.id)).resolves.toBe('ack');

      expect(await reload(recommendation.id)).toMatchObject({
        status: RecommendationStatus.PENDING,
        attempts: attempt,
      });

      const events = await pendingEvents(recommendation.id);
      expect(events).toHaveLength(attempt);
      expect(events.at(-1)!.availableAt.getTime()).toBeGreaterThanOrEqual(
        before + 30_000,
      );
    }

    // Attempt 3 (RECOMMENDATION_MAX_ATTEMPTS default): FAILED and dead-lettered.
    await expect(processor.process(recommendation.id)).resolves.toBe(
      'dead-letter',
    );
    expect(await reload(recommendation.id)).toMatchObject({
      status: RecommendationStatus.FAILED,
      attempts: 3,
      failureCode: 'GROQ_UNAVAILABLE',
      failureMessage: 'Groq is temporarily unavailable. Retries exhausted.',
    });
    expect(groq.calls).toHaveLength(3);
  });

  it('postpones without consuming an attempt when the global rate limit is reached', async () => {
    const recommendation = await createRecommendation();
    await redis.set('ratelimit:groq', '100000', {
      expiration: { type: 'PX', value: 45_000 },
    });

    await expect(processor.process(recommendation.id)).resolves.toBe('ack');

    expect(groq.calls).toHaveLength(0);
    expect(await reload(recommendation.id)).toMatchObject({
      status: RecommendationStatus.PENDING,
      attempts: 0,
    });

    const [event] = await pendingEvents(recommendation.id);
    expect(event.availableAt.getTime()).toBeGreaterThan(Date.now() + 30_000);
  });

  it('does not touch a recommendation another worker is processing', async () => {
    const recommendation = await createRecommendation({
      status: RecommendationStatus.PROCESSING,
      attempts: 1,
    });

    await expect(processor.process(recommendation.id)).resolves.toBe('ack');

    expect(groq.calls).toHaveLength(0);
    expect((await reload(recommendation.id)).attempts).toBe(1);
    // It is looked at again once the processing lease expires.
    const [event] = await pendingEvents(recommendation.id);
    expect(event.availableAt.getTime()).toBe(
      recommendation.updatedAt.getTime() + PROCESSING_LEASE_MS,
    );
  });

  it('reclaims a recommendation abandoned by a crashed worker', async () => {
    const recommendation = await createRecommendation({
      status: RecommendationStatus.PROCESSING,
      attempts: 1,
    });
    const staleUpdatedAt = new Date(Date.now() - PROCESSING_LEASE_MS - 1_000);
    await prisma.recommendation.update({
      where: { id: recommendation.id },
      data: { updatedAt: staleUpdatedAt },
    });
    groq.next = async () => '{"tmdbId": 5003, "reason": "Recovered."}';

    await expect(processor.process(recommendation.id)).resolves.toBe('ack');

    expect(await reload(recommendation.id)).toMatchObject({
      status: RecommendationStatus.COMPLETED,
      attempts: 2,
    });
  });

  it('dead-letters messages for unknown recommendations', async () => {
    await expect(processor.process(randomUUID())).resolves.toBe('dead-letter');
  });

  describe('when Redis is unavailable', () => {
    let degraded: TestingModule;

    beforeAll(async () => {
      degraded = await createWorker([
        { provide: GroqClient, useValue: groq },
        { provide: RabbitMqService, useValue: rabbit },
        {
          provide: RateLimiterService,
          useValue: {
            consume: async () => Promise.reject(new Error('Redis down')),
          },
        },
      ]);
    });

    afterAll(async () => {
      await degraded.close();
    });

    it('fails closed: Groq is not called and the attempt is retried later', async () => {
      const recommendation = await createRecommendation();

      await expect(
        degraded.get(RecommendationProcessor).process(recommendation.id),
      ).resolves.toBe('ack');

      expect(groq.calls).toHaveLength(0);
      expect(await reload(recommendation.id)).toMatchObject({
        status: RecommendationStatus.PENDING,
        attempts: 1,
      });
      expect(await pendingEvents(recommendation.id)).toHaveLength(1);
    });
  });

  describe('outbox relay', () => {
    it('publishes due events with confirms and marks them published', async () => {
      const recommendation = await createRecommendation();
      const due = await prisma.outboxEvent.create({
        data: generateRecommendationEvent(recommendation.id),
      });
      const future = await prisma.outboxEvent.create({
        data: generateRecommendationEvent(
          recommendation.id,
          new Date(Date.now() + 60_000),
        ),
      });

      await worker.get(OutboxPublisher).publishPending();

      const mine = rabbit.published.filter(
        (message) => message.options.messageId === due.id,
      );
      expect(mine).toEqual([
        {
          exchange: 'app.commands',
          routingKey: 'recommendation.generate',
          payload: { recommendationId: recommendation.id },
          options: { messageId: due.id, type: 'recommendation.generate' },
        },
      ]);
      expect(
        rabbit.published.some(
          (message) => message.options.messageId === future.id,
        ),
      ).toBe(false);

      const stored = await prisma.outboxEvent.findUniqueOrThrow({
        where: { id: due.id },
      });
      expect(stored.publishedAt).toBeInstanceOf(Date);
      expect(stored.attempts).toBe(1);

      // Already published: never sent again.
      rabbit.published = [];
      await worker.get(OutboxPublisher).publishPending();
      expect(
        rabbit.published.some(
          (message) => message.options.messageId === due.id,
        ),
      ).toBe(false);
    });

    it('keeps unconfirmed events for a later retry', async () => {
      const recommendation = await createRecommendation();
      const event = await prisma.outboxEvent.create({
        data: generateRecommendationEvent(recommendation.id),
      });
      rabbit.fail = true;

      await worker.get(OutboxPublisher).publishPending();

      const stored = await prisma.outboxEvent.findUniqueOrThrow({
        where: { id: event.id },
      });
      expect(stored.publishedAt).toBeNull();
      expect(stored.lastError).toBe('Broker did not confirm the message');
      expect(stored.availableAt.getTime()).toBeGreaterThan(Date.now());
    });
  });
});
