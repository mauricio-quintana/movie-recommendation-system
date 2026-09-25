# Arquitectura

## 1. Visión general

El sistema es un monolito modular.

No se implementan microservicios.

La modularidad se obtiene mediante módulos de negocio dentro del backend.

## 2. Aplicaciones

### `apps/backend`

Responsabilidades:

- HTTP API
- autenticación/integración Better Auth
- autorización
- lógica de negocio
- persistencia
- integración TMDB
- creación de recomendaciones
- publisher outbox
- worker de recomendaciones

La misma aplicación/imágen de backend puede ejecutar diferentes entrypoints para API y worker.

### `apps/web`

Next.js App Router.

Responsabilidades:

- UI
- navegación
- interacción
- consumo de API
- estados de interfaz

## 3. Infraestructura

### PostgreSQL

Fuente de verdad persistente.

### Prisma

ORM y migrations.

### Redis

- cache de TMDB
- rate limiting distribuido
- coordinación efímera

### RabbitMQ

Procesamiento asíncrono.

### TMDB

Fuente externa del catálogo de películas.

### Groq

Proveedor LLM de la generación de recomendaciones.

### Better Auth

Autenticación/sesiones.

## 4. Módulos backend

```text
auth
users
movies
likes
recommendations
```

`recommendations` es el módulo más complejo y puede utilizar una separación interna mayor cuando resulte útil.

## 5. Flujo de Movies

```text
Controller
   |
   v
Movies service
   |
   +--> Redis cache
   |
   +--> TMDB client
   |
   +--> PostgreSQL snapshot
```

TMDB nunca es llamado directamente desde el controller.

## 6. Flujo de Likes

```text
Authenticated request
   |
   v
Likes service
   |
   v
PostgreSQL
```

La relación usuario-película se mantiene mediante constraint único.

## 7. Flujo de recomendación

```text
Client
   |
   | POST /api/recommendations
   v
Recommendation API
   |
   +----------------------+
   | PostgreSQL transaction|
   |----------------------|
   | Recommendation=PENDING
   | OutboxEvent=PENDING
   +----------------------+
             |
             v
      Outbox publisher
             |
             v
        RabbitMQ
             |
             v
 Recommendation worker
             |
             +--> check state / idempotency
             |
             +--> Redis rate limit
             |
             +--> candidate/context preparation
             |
             +--> Groq
             |
             +--> validate output
             |
             v
         PostgreSQL
             |
             +--> COMPLETED
             |
             +--> FAILED
```

## 8. Recommendation lifecycle

```text
PENDING
   |
   v
PROCESSING
   |
   +----> COMPLETED
   |
   +----> FAILED
```

Las transiciones deben ser seguras frente a redelivery y duplicados.

## 9. Outbox

El objetivo del outbox es evitar que una operación de negocio quede confirmada sin que el trabajo asíncrono haya quedado registrado.

Transacción:

```text
BEGIN
  create Recommendation
  create OutboxEvent
COMMIT
```

Luego:

```text
read pending outbox
publish to RabbitMQ
publisher confirm
mark published
```

El publisher debe tolerar reinicios y publicaciones repetidas.

## 10. RabbitMQ

Inicialmente:

```text
app.commands
app.events

recommendation.commands
recommendation.commands.dlq
```

Routing key principal:

```text
recommendation.generate
```

Consumer:

- manual ACK
- prefetch 1
- idempotente

Retry:

- timeout
- network errors
- 429
- 5xx

DLQ:

- retries agotados
- mensajes no procesables

## 11. Redis rate limiting

El límite de Groq es global.

Todos los workers comparten el mismo estado en Redis.

No implementar un bucket separado en memoria local.

## 12. Seguridad

Flujo general:

```text
Browser
   |
   v
Next.js
   |
   v
NestJS API
   |
   +--> Better Auth/session
   +--> Authorization
   +--> Application service
```

La autorización ocurre en backend.

## 13. Docker

Compose:

```text
postgres
redis
rabbitmq
api
web
```

Dentro de la red Docker:

- `postgres:5432`
- `redis:6379`
- `rabbitmq:5672`
- `api:3001`
- `web:3000`

Los puertos host se utilizan solamente cuando deben exponerse a la máquina de desarrollo.

## 14. Principios

- simple antes que abstracto
- modular antes que distribuido
- PostgreSQL como source of truth
- Redis para datos efímeros/cache
- async para trabajo lento/costoso
- at-least-once + idempotencia
- integraciones externas aisladas
- cambios pequeños y verificables
