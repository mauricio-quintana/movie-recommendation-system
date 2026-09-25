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

## Auth — completado

- [x] registro username/password
- [x] login
- [x] logout
- [x] session endpoint
- [x] current user `/api/me`
- [x] ownership/authorization guards
- [x] auth integration tests
- [x] auth e2e

## Movies — completado

- [x] TMDB client
- [x] TMDB response mapping
- [x] Redis cache
- [x] cache TTL strategy
- [x] Movie snapshot persistence
- [x] `GET /api/movies`
- [x] `GET /api/movies/:tmdbId`
- [x] tests
- [x] Swagger docs

## Likes — completado

- [x] POST like
- [x] DELETE unlike
- [x] GET likes
- [x] ownership/auth tests
- [x] integration tests
- [x] e2e

## Recommendations — API — completado

- [x] candidate selection
- [x] create Recommendation=PENDING
- [x] create OutboxEvent=PENDING
- [x] `POST /api/recommendations`
- [x] `GET /api/recommendations`
- [x] `GET /api/recommendations/:id`
- [x] ownership rules
- [x] tests

## Recommendations — Messaging — completado

- [x] RabbitMQ connection abstraction
- [x] `app.commands`
- [x] `app.events`
- [x] `recommendation.commands`
- [x] `recommendation.commands.dlq`
- [x] `recommendation.generate`
- [x] publisher confirms
- [x] outbox publisher
- [x] worker entrypoint
- [x] manual ACK
- [x] prefetch=1
- [x] idempotent processing
- [x] retries
- [x] backoff
- [x] DLQ

## Recommendations — Groq — completado

- [x] Groq provider
- [x] prompt construction
- [x] structured output (JSON mode + validación en servidor)
- [x] output validation
- [x] candidate membership validation
- [x] explanation length validation
- [x] provider error mapping
- [x] Retry-After handling

## Redis / Rate limiting — completado

- [x] global Groq rate limiter
- [x] atomic rate limit behavior
- [x] TTL handling
- [x] graceful Redis failure behavior
- [x] tests

## Recommendation persistence — completado

- [x] PENDING → PROCESSING
- [x] PROCESSING → COMPLETED
- [x] PROCESSING → FAILED
- [x] attempts increment
- [x] startedAt
- [x] completedAt
- [x] failureCode
- [x] failureMessage
- [x] selectedMovieId
- [x] reason

## Frontend — Auth — completado

- [x] signup form
- [x] login form
- [x] logout
- [x] auth state
- [x] protected routes/flows

## Frontend — Movies — completado

- [x] movie listing
- [x] movie detail
- [x] like/unlike
- [x] loading states
- [x] error states
- [x] empty states

## Frontend — Recommendations — completado

- [x] request recommendation
- [x] pending state
- [x] polling/refetch strategy
- [x] completed result
- [x] failed result

## Quality — completado

- [x] unit tests
- [x] integration tests
- [x] recommendation e2e
- [x] auth e2e
- [x] likes e2e
- [x] lint
- [x] format check
- [x] typecheck
- [x] test
- [x] build

## Finalization

- [x] API documentation complete
- [x] architecture documentation reviewed
- [ ] security review
- [ ] Docker clean build (sin cache y con volúmenes nuevos)
- [x] `docker compose up --build` (verificado con TMDB y Groq reales)
- [ ] final CI (workflow actualizado, pendiente de ejecutarse en GitHub)
- [ ] README final
- [x] take-home requirements reviewed (flujo end-to-end real con TMDB y Groq)

## Pendiente fuera del alcance actual

- [ ] tests automatizados del frontend (hoy se valida con lint, typecheck, build y verificación manual)
