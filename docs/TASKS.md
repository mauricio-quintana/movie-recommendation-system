# Plan de implementación

## Foundation — completado

- [x] Monorepo pnpm
- [x] Node 24
- [x] NestJS base
- [x] Next.js base
- [x] TypeScript
- [x] PostgreSQL
- [x] Prisma
- [x] Prisma schema
- [x] Initial migration
- [x] Better Auth base
- [x] Redis
- [x] RabbitMQ
- [x] Docker Compose base
- [x] Backend Dockerfile
- [x] Frontend Dockerfile
- [x] API health check
- [x] Swagger base
- [x] Helmet/CORS
- [x] env validation
- [x] Husky/quality hooks
- [x] GitHub Actions CI
- [x] Agent skills

## Auth

- [ ] registro username/password
- [ ] login
- [ ] logout
- [ ] session endpoint
- [ ] current user `/api/me`
- [ ] ownership/authorization guards
- [ ] auth integration tests
- [ ] auth e2e

## Movies

- [ ] TMDB client
- [ ] TMDB response mapping
- [ ] Redis cache
- [ ] cache TTL strategy
- [ ] Movie snapshot persistence
- [ ] `GET /api/movies`
- [ ] `GET /api/movies/:tmdbId`
- [ ] tests
- [ ] Swagger docs

## Likes

- [ ] POST like
- [ ] DELETE unlike
- [ ] GET likes
- [ ] ownership/auth tests
- [ ] integration tests
- [ ] e2e

## Recommendations — API

- [ ] candidate selection
- [ ] create Recommendation=PENDING
- [ ] create OutboxEvent=PENDING
- [ ] `POST /api/recommendations`
- [ ] `GET /api/recommendations`
- [ ] `GET /api/recommendations/:id`
- [ ] ownership rules
- [ ] tests

## Recommendations — Messaging

- [ ] RabbitMQ connection abstraction
- [ ] `app.commands`
- [ ] `app.events`
- [ ] `recommendation.commands`
- [ ] `recommendation.commands.dlq`
- [ ] `recommendation.generate`
- [ ] publisher confirms
- [ ] outbox publisher
- [ ] worker entrypoint
- [ ] manual ACK
- [ ] prefetch=1
- [ ] idempotent processing
- [ ] retries
- [ ] backoff
- [ ] DLQ

## Recommendations — Groq

- [ ] Groq provider
- [ ] prompt construction
- [ ] structured output
- [ ] output validation
- [ ] candidate membership validation
- [ ] explanation length validation
- [ ] provider error mapping
- [ ] Retry-After handling

## Redis / Rate limiting

- [ ] global Groq rate limiter
- [ ] atomic rate limit behavior
- [ ] TTL handling
- [ ] graceful Redis failure behavior
- [ ] tests

## Recommendation persistence

- [ ] PENDING → PROCESSING
- [ ] PROCESSING → COMPLETED
- [ ] PROCESSING → FAILED
- [ ] attempts increment
- [ ] startedAt
- [ ] completedAt
- [ ] failureCode
- [ ] failureMessage
- [ ] selectedMovieId
- [ ] reason

## Frontend — Auth

- [ ] signup form
- [ ] login form
- [ ] logout
- [ ] auth state
- [ ] protected routes/flows

## Frontend — Movies

- [ ] movie listing
- [ ] movie detail
- [ ] like/unlike
- [ ] loading states
- [ ] error states
- [ ] empty states

## Frontend — Recommendations

- [ ] request recommendation
- [ ] pending state
- [ ] polling/refetch strategy
- [ ] completed result
- [ ] failed result

## Quality

- [ ] unit tests
- [ ] integration tests
- [ ] recommendation e2e
- [ ] auth e2e
- [ ] likes e2e
- [ ] lint
- [ ] format check
- [ ] typecheck
- [ ] test
- [ ] build

## Finalization

- [ ] API documentation complete
- [ ] architecture documentation reviewed
- [ ] security review
- [ ] Docker clean build
- [ ] `docker compose up --build`
- [ ] final CI
- [ ] README final
- [ ] take-home requirements reviewed
