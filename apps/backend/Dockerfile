# syntax=docker/dockerfile:1

FROM node:24-alpine AS builder

WORKDIR /app

ENV CI=true
# Git hooks are irrelevant inside the image.
ENV HUSKY=0

# pnpm version comes from the root package.json (packageManager): cached until it changes.
COPY package.json ./
RUN corepack enable && corepack install

# Dependencies only depend on the manifests and the lockfile, not on source code.
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/
COPY apps/web/package.json ./apps/web/
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod=false --store-dir /pnpm/store

WORKDIR /app/apps/backend

# Prisma Client only depends on the schema, its config and tsconfig.json
# (the prisma-client generator derives the import extension, .js vs .ts, from it).
COPY apps/backend/prisma ./prisma
COPY apps/backend/prisma7.config.ts apps/backend/tsconfig.json ./
# Only needed to load prisma7.config.ts; the real URL is provided at runtime.
ENV DATABASE_URL=postgresql://postgres:postgres@postgres:5432/movie_recommendation
RUN pnpm exec prisma generate --config prisma7.config.ts

# Only this app's sources: changes in apps/web do not rebuild the backend.
COPY apps/backend ./

RUN pnpm build


FROM node:24-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/package.json ./apps/backend/package.json
# Schema, migrations and config for `prisma migrate deploy` (migrate service).
COPY --from=builder /app/apps/backend/prisma ./apps/backend/prisma
COPY --from=builder /app/apps/backend/prisma7.config.ts ./apps/backend/prisma7.config.ts

USER node

# The same image runs the API (default), the worker (dist/worker.js) and migrations.
CMD ["node", "apps/backend/dist/main.js"]
