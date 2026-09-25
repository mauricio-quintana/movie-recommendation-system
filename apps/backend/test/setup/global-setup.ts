import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { createClient } from 'redis';
import { applyTestEnv, testEnv } from './test-env.js';

const backendDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);

export default async function globalSetup() {
  applyTestEnv();

  const admin = new pg.Client({ connectionString: testEnv.adminDatabaseUrl });
  await admin.connect();

  const existing = await admin.query(
    'SELECT 1 FROM pg_database WHERE datname = $1',
    [testEnv.testDatabaseName],
  );

  if (existing.rowCount === 0) {
    await admin.query(`CREATE DATABASE "${testEnv.testDatabaseName}"`);
  }

  await admin.end();

  execSync('pnpm exec prisma migrate deploy --config prisma7.config.ts', {
    cwd: backendDirectory,
    env: { ...process.env, DATABASE_URL: testEnv.DATABASE_URL },
    stdio: 'ignore',
  });

  const redis = createClient({ url: testEnv.REDIS_URL });
  await redis.connect();
  await redis.flushDb();
  await redis.close();
}
