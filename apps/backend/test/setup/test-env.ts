import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

const setupDirectory = path.dirname(fileURLToPath(import.meta.url));

config({ path: path.resolve(setupDirectory, '../../../../.env'), quiet: true });

function required(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} must be set to run the e2e tests`);
  }

  return value;
}

function withDatabase(url: string, database: string): string {
  const parsed = new URL(url);
  parsed.pathname = `/${database}`;
  return parsed.toString();
}

// process.env survives between test files in the same worker: always derive from the original values.
process.env.E2E_SOURCE_DATABASE_URL ||= required('DATABASE_URL');
process.env.E2E_SOURCE_REDIS_URL ||= required('REDIS_URL');

const databaseUrl = new URL(required('E2E_SOURCE_DATABASE_URL'));
const testDatabaseName = `${databaseUrl.pathname.replace(/^\//, '')}_test`;

/**
 * E2E tests run against real PostgreSQL/Redis, isolated from development data:
 * a dedicated `<db>_test` database and Redis logical database 15.
 */
export const testEnv = {
  testDatabaseName,
  adminDatabaseUrl: withDatabase(databaseUrl.toString(), 'postgres'),
  DATABASE_URL: withDatabase(databaseUrl.toString(), testDatabaseName),
  REDIS_URL: (() => {
    const redisUrl = new URL(required('E2E_SOURCE_REDIS_URL'));
    redisUrl.pathname = '/15';
    return redisUrl.toString();
  })(),
};

export function applyTestEnv(): void {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = testEnv.DATABASE_URL;
  process.env.REDIS_URL = testEnv.REDIS_URL;
  process.env.AUTH_RATE_LIMIT_PER_MINUTE = '1000';
  process.env.TMDB_API_KEY ||= 'test-tmdb-key';
  process.env.GROQ_API_KEY ||= 'test-groq-key';
}
