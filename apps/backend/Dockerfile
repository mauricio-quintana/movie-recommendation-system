FROM node:24-alpine AS builder

RUN corepack enable

WORKDIR /app

ENV CI=true

COPY . .

RUN pnpm install --frozen-lockfile --prod=false

WORKDIR /app/apps/backend

ENV DATABASE_URL=postgresql://postgres:postgres@postgres:5432/movie_recommendation

RUN pnpm dlx prisma@7.10.0 generate
RUN pnpm build


FROM node:24-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/package.json ./apps/backend/package.json

CMD ["node", "apps/backend/dist/main.js"]