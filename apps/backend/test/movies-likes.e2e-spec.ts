import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { TmdbClient } from '../src/movies/tmdb.client.js';
import { FakeTmdbClient } from './utils/fake-tmdb.js';
import { createTestApp, signUp } from './utils/test-app.js';

describe('Movies and likes (e2e)', () => {
  let app: INestApplication;
  let tmdb: FakeTmdbClient;
  let prisma: PrismaClient;

  beforeAll(async () => {
    tmdb = new FakeTmdbClient();
    app = await createTestApp([{ provide: TmdbClient, useValue: tmdb }]);
    prisma = app.get(PrismaClient);
  });

  beforeEach(() => {
    tmdb.available = true;
    tmdb.calls = [];
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  describe('GET /api/movies', () => {
    it('lists popular movies and caches the TMDB response', async () => {
      const first = await http().get('/api/movies?page=7').expect(200);
      expect(first.body).toMatchObject({
        page: 7,
        totalPages: 500,
        totalResults: 20,
      });
      expect(first.body.results[0]).toMatchObject({
        tmdbId: 1000,
        posterPath: '/poster-1000.jpg',
      });

      await http().get('/api/movies?page=7').expect(200);
      expect(tmdb.calls.filter((call) => call === 'popular:7')).toHaveLength(1);
    });

    it('defaults to the first page', async () => {
      const response = await http().get('/api/movies').expect(200);
      expect(response.body.page).toBe(1);
    });

    it('searches by title and drops invalid provider items', async () => {
      const response = await http()
        .get('/api/movies')
        .query({ search: 'matrix' })
        .expect(200);

      expect(response.body.results).toHaveLength(1);
      expect(response.body.results[0].tmdbId).toBe(4242);
    });

    it.each(['page=0', 'page=501', 'page=abc', 'unknown=1'])(
      'rejects invalid query %s',
      async (query) => {
        await http().get(`/api/movies?${query}`).expect(400);
      },
    );

    it('returns 503 without leaking provider details when TMDB is down', async () => {
      tmdb.available = false;

      const response = await http().get('/api/movies?page=42').expect(503);
      expect(response.body.message).toBe(
        'The movie catalog is temporarily unavailable',
      );
    });
  });

  describe('GET /api/movies/:tmdbId', () => {
    it('returns the movie detail', async () => {
      const response = await http().get('/api/movies/603').expect(200);

      expect(response.body).toMatchObject({
        tmdbId: 603,
        genres: ['Drama'],
        runtime: 120,
      });
      expect(tmdb.calls).toContain('movie:603:es-ES');
    });

    it('falls back to the original overview when there is no translation', async () => {
      tmdb.untranslated.add(604);

      const response = await http().get('/api/movies/604').expect(200);

      expect(response.body.overview).toBe('Overview of movie 604');
      expect(tmdb.calls).toEqual(['movie:604:es-ES', 'movie:604:en-US']);
    });

    it('maps unknown movies to 404 and invalid ids to 400', async () => {
      await http().get('/api/movies/900001').expect(404);
      await http().get('/api/movies/abc').expect(400);
      await http().get('/api/movies/0').expect(400);
    });
  });

  describe('likes', () => {
    it('requires authentication', async () => {
      await http().get('/api/likes').expect(401);
      await http().post('/api/likes/550').expect(401);
      await http().delete('/api/likes/550').expect(401);
    });

    it('likes idempotently, lists and unlikes', async () => {
      const { cookie, userId } = await signUp(app);

      const created = await http()
        .post('/api/likes/550')
        .set('Cookie', cookie)
        .expect(201);
      expect(created.body.movie).toMatchObject({
        tmdbId: 550,
        title: 'Movie 550',
        releaseDate: '2001-02-03',
      });

      await http().post('/api/likes/550').set('Cookie', cookie).expect(200);
      await http().post('/api/likes/551').set('Cookie', cookie).expect(201);

      const list = await http()
        .get('/api/likes')
        .set('Cookie', cookie)
        .expect(200);
      expect(
        list.body.map(
          (like: { movie: { tmdbId: number } }) => like.movie.tmdbId,
        ),
      ).toEqual([551, 550]);
      expect(await prisma.like.count({ where: { userId } })).toBe(2);

      await http().delete('/api/likes/550').set('Cookie', cookie).expect(204);
      await http().delete('/api/likes/550').set('Cookie', cookie).expect(204);

      const after = await http()
        .get('/api/likes')
        .set('Cookie', cookie)
        .expect(200);
      expect(after.body).toHaveLength(1);
    });

    it('persists a single minimal snapshot per movie', async () => {
      const first = await signUp(app);
      const second = await signUp(app);

      await http()
        .post('/api/likes/777')
        .set('Cookie', first.cookie)
        .expect(201);
      await http()
        .post('/api/likes/777')
        .set('Cookie', second.cookie)
        .expect(201);

      const snapshots = await prisma.movie.findMany({ where: { tmdbId: 777 } });
      expect(snapshots).toHaveLength(1);
      expect(snapshots[0].posterPath).toBe('/poster-777.jpg');
    });

    it('keeps likes isolated per user', async () => {
      const owner = await signUp(app);
      const other = await signUp(app);

      await http()
        .post('/api/likes/880')
        .set('Cookie', owner.cookie)
        .expect(201);
      await http()
        .delete('/api/likes/880')
        .set('Cookie', other.cookie)
        .expect(204);

      const ownerLikes = await http()
        .get('/api/likes')
        .set('Cookie', owner.cookie)
        .expect(200);
      const otherLikes = await http()
        .get('/api/likes')
        .set('Cookie', other.cookie)
        .expect(200);

      expect(ownerLikes.body).toHaveLength(1);
      expect(otherLikes.body).toHaveLength(0);
    });

    it('returns 404 for unknown movies and 503 when TMDB is down', async () => {
      const { cookie } = await signUp(app);

      await http().post('/api/likes/900002').set('Cookie', cookie).expect(404);

      tmdb.available = false;
      await http().post('/api/likes/123456').set('Cookie', cookie).expect(503);
    });
  });
});
