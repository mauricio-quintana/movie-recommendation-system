---
name: movie-project
description: Contexto arquitectónico y reglas específicas del Movie Recommendation System. Esta es la skill propia del proyecto.
---

# Movie Recommendation System

## Fuentes de verdad

Antes de implementar:

- `AGENTS.md`
- `docs/PROJECT_SPEC.md`
- `docs/ARCHITECTURE.md`
- `docs/TASKS.md`

## Arquitectura

Monolito modular NestJS.

Módulos:

- auth
- users
- movies
- likes
- recommendations

## Stack

- Node.js 24
- TypeScript
- pnpm
- NestJS
- Next.js
- PostgreSQL
- Prisma
- Better Auth
- Redis
- RabbitMQ
- TMDB
- Groq
- Docker Compose

## Decisiones

### PostgreSQL

Fuente de verdad del estado persistente.

### Redis

Cache y rate limiting distribuido.

Nunca fuente de verdad.

### TMDB

Fuente de verdad del catálogo externo.

Persistir solamente snapshots mínimos usados por la aplicación.

Guardar paths de imágenes, no URLs completas.

### Recommendations

Estados:

```text
PENDING
PROCESSING
COMPLETED
FAILED
```

La generación es asíncrona.

### Outbox

Crear el `Recommendation` y el `OutboxEvent` dentro de la misma transacción.

Publicar posteriormente con publisher confirms.

### RabbitMQ

Manual ACK, prefetch inicial 1, retries limitados, DLQ e idempotencia.

### Groq

Solamente desde worker.

La salida debe validarse.

El `tmdbId` seleccionado debe pertenecer a los candidatos.

### API

REST JSON bajo `/api`.

### Frontend

Next.js App Router.

Priorizar accesibilidad, responsive y estados loading/error/empty/success.

## Orden funcional

1. Auth
2. Users / me
3. Movies/TMDB
4. Likes
5. Recommendation API
6. Outbox
7. RabbitMQ worker
8. Groq
9. Rate limiting
10. Frontend
11. E2E y hardening

## Definition of Done

Feature completa implica:

- comportamiento implementado
- persistencia necesaria
- API/frontend cuando corresponda
- tests
- quality gates
- documentación actualizada si cambia el contrato
