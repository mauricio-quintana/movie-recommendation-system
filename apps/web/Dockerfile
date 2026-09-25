# syntax=docker/dockerfile:1

FROM node:24-alpine AS builder

WORKDIR /app

ENV CI=true
ENV HUSKY=0
ENV NEXT_TELEMETRY_DISABLED=1

# pnpm version comes from the root package.json (packageManager): cached until it changes.
COPY package.json ./
RUN corepack enable && corepack install

# Dependencies only depend on the manifests and the lockfile, not on source code.
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/
COPY apps/web/package.json ./apps/web/
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod=false --store-dir /pnpm/store

# Only this app's sources: changes in apps/backend do not rebuild the web image.
COPY apps/web ./apps/web

# next.config.ts rewrites /api/* to the backend; rewrites are resolved at build time.
# Declared after the install so changing it does not invalidate dependencies.
ARG BACKEND_URL=http://api:3001
ENV BACKEND_URL=$BACKEND_URL

RUN pnpm --filter web build


FROM node:24-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=builder --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=node:node /app/apps/web/public ./apps/web/public

USER node

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
