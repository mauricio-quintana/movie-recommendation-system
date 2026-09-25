import type { INestApplication, Type } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/app.setup.js';

export interface ProviderOverride {
  provide: Type<unknown> | symbol;
  useValue: unknown;
}

export async function createTestApp(
  overrides: ProviderOverride[] = [],
): Promise<INestApplication> {
  let builder = Test.createTestingModule({ imports: [AppModule] });

  for (const override of overrides) {
    builder = builder
      .overrideProvider(override.provide)
      .useValue(override.useValue);
  }

  const moduleRef = await builder.compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>();
  configureApp(app);
  await app.init();

  return app;
}

export function uniqueUsername(prefix = 'user'): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Signs up a fresh user and returns the session cookie for authenticated requests.
 */
export async function signUp(
  app: INestApplication,
  username = uniqueUsername(),
) {
  const response = await request(app.getHttpServer())
    .post('/api/auth/sign-up')
    .send({ username, password: 'super-secret-password' })
    .expect(201);

  const cookies = ([] as string[]).concat(response.headers['set-cookie'] ?? []);

  return {
    username,
    userId: response.body.user.id as string,
    cookie: cookies.map((cookie) => cookie.split(';')[0]).join('; '),
  };
}
