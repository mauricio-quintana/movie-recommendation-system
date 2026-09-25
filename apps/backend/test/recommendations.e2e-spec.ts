import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaClient } from '../src/generated/prisma/client.js';
import {
  REDIS_CLIENT,
  type RedisClient,
} from '../src/infrastructure/redis/redis.constants.js';
import { TmdbClient } from '../src/movies/tmdb.client.js';
import { FakeTmdbClient } from './utils/fake-tmdb.js';
import { createTestApp, signUp } from './utils/test-app.js';

describe('Recommendations API (e2e)', () => {
  let app: INestApplication;
  let tmdb: FakeTmdbClient;
  let prisma: PrismaClient;

  beforeAll(async () => {
    tmdb = new FakeTmdbClient();
    // Liked movie -> TMDB recommendations. 3001 is recommended by both seeds.
    tmdb.recommendationsById.set(2001, [3001, 3002, 2002]);
    tmdb.recommendationsById.set(2002, [3003, 3001]);
    app = await createTestApp([{ provide: TmdbClient, useValue: tmdb }]);
    prisma = app.get(PrismaClient);
  });

  beforeEach(() => {
    tmdb.available = true;
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  it('requires authentication', async () => {
    await http().post('/api/recommendations').expect(401);
    await http().get('/api/recommendations').expect(401);
    await http()
      .get('/api/recommendations/5b0f6a7e-7a39-4f4e-9a55-1f9b5a3b2c11')
      .expect(401);
  });

  it('accepts the request asynchronously and records the outbox event atomically', async () => {
    const { cookie, userId } = await signUp(app);
    await http().post('/api/likes/2001').set('Cookie', cookie).expect(201);
    await http().post('/api/likes/2002').set('Cookie', cookie).expect(201);

    const response = await http()
      .post('/api/recommendations')
      .set('Cookie', cookie)
      .expect(202);

    expect(response.body).toEqual({
      id: expect.any(String),
      status: 'PENDING',
      createdAt: expect.any(String),
    });
    expect(response.headers.location).toBe(
      `/api/recommendations/${response.body.id}`,
    );

    const recommendation = await prisma.recommendation.findUniqueOrThrow({
      where: { id: response.body.id },
    });
    expect(recommendation.userId).toBe(userId);
    // Ranked by how many liked movies recommend them; liked movies are excluded.
    expect(recommendation.candidateTmdbIds).toEqual([3001, 3002, 3003]);

    const snapshots = await prisma.movie.count({
      where: { tmdbId: { in: [3001, 3002, 3003] } },
    });
    expect(snapshots).toBe(3);

    const events = await prisma.outboxEvent.findMany({
      where: { aggregateId: response.body.id },
    });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      eventType: 'recommendation.generate',
      aggregateType: 'Recommendation',
      payload: { recommendationId: response.body.id },
      publishedAt: null,
    });
  });

  it('falls back to popular movies for users without likes', async () => {
    const { cookie } = await signUp(app);

    const response = await http()
      .post('/api/recommendations')
      .set('Cookie', cookie)
      .expect(202);
    const recommendation = await prisma.recommendation.findUniqueOrThrow({
      where: { id: response.body.id },
    });

    expect(recommendation.candidateTmdbIds).toEqual(tmdb.popularIds);
  });

  it('returns 503 and persists nothing when candidates cannot be built', async () => {
    const { cookie, userId } = await signUp(app);
    // Cached popular movies would still be served; simulate a cold cache.
    await app
      .get<RedisClient>(REDIS_CLIENT)
      .del('tmdb:v2:es-ES:popular:page:1');
    tmdb.available = false;

    await http().post('/api/recommendations').set('Cookie', cookie).expect(503);

    expect(await prisma.recommendation.count({ where: { userId } })).toBe(0);
  });

  it('lists and reads only the owner recommendations', async () => {
    const owner = await signUp(app);
    const other = await signUp(app);

    const first = await http()
      .post('/api/recommendations')
      .set('Cookie', owner.cookie)
      .expect(202);
    const second = await http()
      .post('/api/recommendations')
      .set('Cookie', owner.cookie)
      .expect(202);

    const list = await http()
      .get('/api/recommendations')
      .set('Cookie', owner.cookie)
      .expect(200);
    expect(list.body.map((item: { id: string }) => item.id)).toEqual([
      second.body.id,
      first.body.id,
    ]);
    expect(list.body[0]).toMatchObject({
      status: 'PENDING',
      attempts: 0,
      selectedMovie: null,
      reason: null,
      failureCode: null,
    });

    const detail = await http()
      .get(`/api/recommendations/${first.body.id}`)
      .set('Cookie', owner.cookie)
      .expect(200);
    expect(detail.body.id).toBe(first.body.id);

    await http()
      .get(`/api/recommendations/${first.body.id}`)
      .set('Cookie', other.cookie)
      .expect(404);

    const otherList = await http()
      .get('/api/recommendations')
      .set('Cookie', other.cookie)
      .expect(200);
    expect(otherList.body).toEqual([]);
  });

  it('validates the id and reports missing recommendations', async () => {
    const { cookie } = await signUp(app);

    await http()
      .get('/api/recommendations/not-a-uuid')
      .set('Cookie', cookie)
      .expect(400);
    await http()
      .get('/api/recommendations/5b0f6a7e-7a39-4f4e-9a55-1f9b5a3b2c11')
      .set('Cookie', cookie)
      .expect(404);
  });
});
