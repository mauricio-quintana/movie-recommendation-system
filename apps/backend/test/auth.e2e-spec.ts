import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { createTestApp, signUp, uniqueUsername } from './utils/test-app.js';

describe('Auth and current user (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  describe('POST /api/auth/sign-up', () => {
    it('creates the account with username/password and starts a session', async () => {
      const username = uniqueUsername('Signup');

      const response = await http()
        .post('/api/auth/sign-up')
        .send({ username, password: 'super-secret-password' })
        .expect(201);

      expect(response.body.user).toEqual({
        id: expect.any(String),
        username: username.toLowerCase(),
      });
      expect(String(response.headers['set-cookie'])).toContain(
        'better-auth.session_token',
      );
      expect(String(response.headers['set-cookie'])).toContain('HttpOnly');

      const stored = await app
        .get(PrismaClient)
        .user.findUnique({ where: { id: response.body.user.id } });
      expect(stored?.username).toBe(username.toLowerCase());
    });

    it('rejects a duplicated username with 409', async () => {
      const { username } = await signUp(app);

      await http()
        .post('/api/auth/sign-up')
        .send({
          username: username.toUpperCase(),
          password: 'another-password',
        })
        .expect(409);
    });

    it.each([
      [{ username: 'ab', password: 'super-secret-password' }],
      [{ username: 'not valid!', password: 'super-secret-password' }],
      [{ username: uniqueUsername(), password: 'short' }],
      [
        {
          username: uniqueUsername(),
          password: 'super-secret-password',
          email: 'x@example.com',
        },
      ],
      [{}],
    ])('rejects invalid input %j with 400', async (body) => {
      await http().post('/api/auth/sign-up').send(body).expect(400);
    });

    it('rejects cross-site requests with 403', async () => {
      await http()
        .post('/api/auth/sign-up')
        .set('Origin', 'https://evil.example')
        .send({ username: uniqueUsername(), password: 'super-secret-password' })
        .expect(403);
    });
  });

  describe('POST /api/auth/sign-in', () => {
    it('signs in with valid credentials', async () => {
      const { username } = await signUp(app);

      const response = await http()
        .post('/api/auth/sign-in')
        .send({ username, password: 'super-secret-password' })
        .expect(200);

      expect(response.body.user.username).toBe(username);
      expect(String(response.headers['set-cookie'])).toContain(
        'better-auth.session_token',
      );
    });

    it('rejects a wrong password with 401', async () => {
      const { username } = await signUp(app);

      await http()
        .post('/api/auth/sign-in')
        .send({ username, password: 'wrong-password' })
        .expect(401);
    });

    it('rejects an unknown user with 401', async () => {
      await http()
        .post('/api/auth/sign-in')
        .send({
          username: uniqueUsername('ghost'),
          password: 'super-secret-password',
        })
        .expect(401);
    });
  });

  describe('session lifecycle', () => {
    it('reports anonymous sessions without failing', async () => {
      const response = await http().get('/api/auth/session').expect(200);

      expect(response.body).toEqual({
        authenticated: false,
        user: null,
        expiresAt: null,
      });
    });

    it('exposes the session, /api/me and signs out', async () => {
      const { cookie, username, userId } = await signUp(app);

      const session = await http()
        .get('/api/auth/session')
        .set('Cookie', cookie)
        .expect(200);
      expect(session.body).toMatchObject({
        authenticated: true,
        user: { id: userId, username },
      });

      const me = await http().get('/api/me').set('Cookie', cookie).expect(200);
      expect(me.body).toEqual({
        id: userId,
        username,
        createdAt: expect.any(String),
      });

      await http().post('/api/auth/sign-out').set('Cookie', cookie).expect(204);

      await http().get('/api/me').set('Cookie', cookie).expect(401);
    });

    it('requires a session for /api/me and sign-out', async () => {
      await http().get('/api/me').expect(401);
      await http()
        .get('/api/me')
        .set('Cookie', 'better-auth.session_token=forged')
        .expect(401);
      await http().post('/api/auth/sign-out').expect(401);
    });
  });
});
