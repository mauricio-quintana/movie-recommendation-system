import { applyTestEnv } from './test-env.js';

// Runs before each test file imports application code (Prisma reads DATABASE_URL at import time).
applyTestEnv();
