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

### Candidatos

Se calculan en la API, antes de encolar: recomendaciones de TMDB para los 5 likes más recientes, ordenadas por cuántos likes apuntan a cada película, sin incluir películas ya likeadas (máx. 20). Si el usuario no tiene likes se usan las populares.

Los snapshots de los candidatos se guardan en la misma transacción que `Recommendation` y `OutboxEvent`. Así el worker arma el prompt solo con PostgreSQL y no llama a TMDB.

## 8. Recommendation lifecycle

```text
PENDING
   |
   v
PROCESSING ----> PENDING  (fallo recuperable o rate limit: reintento programado)
   |
   +----> COMPLETED
   |
   +----> FAILED
```

Las transiciones deben ser seguras frente a redelivery y duplicados:

- **Claim**: `PENDING → PROCESSING` es un `UPDATE` condicionado a `status`, `attempts` y `updatedAt` leídos (concurrencia optimista). Si otro proceso ganó, el mensaje se descarta con ACK.
- **Fencing**: las escrituras finales (`COMPLETED`, `FAILED`, vuelta a `PENDING`) se condicionan a `status = PROCESSING` y al número de intento, así un worker lento que perdió su turno no pisa el resultado.
- **Lease**: un `PROCESSING` sin cambios durante 2 minutos se considera abandonado (worker caído) y puede volver a reclamarse. Si llega un duplicado dentro del lease, se programa una revisión para cuando venza.
- `COMPLETED`/`FAILED` son finales: una nueva entrega solo hace ACK.
- Si se reclama más veces que `RECOMMENDATION_MAX_ATTEMPTS`, se marca `FAILED` (`ATTEMPTS_EXHAUSTED`).

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

Implementación: el relay corre en el proceso worker y consulta el outbox cada segundo. Reclama lotes con `FOR UPDATE SKIP LOCKED` y un lease de 30 s sobre `availableAt`, así pueden correr varios workers a la vez. Si el proceso cae entre publicar y marcar como publicado, el evento se publica de nuevo; el consumer es idempotente. Si el broker no confirma, se guarda `lastError` y se reintenta con backoff.

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

Decisiones de implementación:

- Las colas son **quorum queues** durables (el tipo replicado que recomienda RabbitMQ). `recommendation.commands` hace dead-lettering hacia `recommendation.commands.dlq` por el exchange por defecto y tiene `x-delivery-limit` = 10 como red de seguridad para mensajes que tumban al worker.
- **Espera durable sin colas extra**: para volver a procesar más tarde, el worker devuelve la recomendación a `PENDING` y crea, en la misma transacción, un `OutboxEvent` con `availableAt` en el futuro. Luego hace ACK. No añade topología.
- **Proveedor no disponible = esperar, no fallar**: los fallos transitorios de Groq (429, 5xx, timeout, red) o del rate limiter no consumen intentos. La recomendación queda `PENDING` hasta que Groq vuelva. El primer fallo abre una **pausa compartida en Redis** (`groq:unavailable:until`), con backoff exponencial de 5 s a 5 min por fallos consecutivos que respeta `Retry-After`. Mientras dura, ningún worker llama a Groq: todas las recomendaciones, de todos los usuarios, se reprograman para cuando termine, con jitter para no despertar juntas. El primer éxito borra la pausa.
- **Plazo máximo**: una recomendación solo se cancela si no pudo generarse dentro de `RECOMMENDATION_MAX_WAIT_MINUTES` (30 min por defecto) desde la solicitud: `FAILED` (`PROVIDER_UNAVAILABLE`) + DLQ.
- `RECOMMENDATION_MAX_ATTEMPTS` (3 por defecto) solo acota reclamos tras caídas del worker (lease vencido): `FAILED` (`ATTEMPTS_EXHAUSTED`) + DLQ.
- Fallos no recuperables (salida inválida del modelo, credenciales, request rechazado): `FAILED` inmediato + DLQ.
- Errores de infraestructura inesperados (p. ej. PostgreSQL caído): `nack` con requeue tras una pausa de 5 s.
- Si se pierde la conexión AMQP, el worker termina y Docker lo reinicia (`restart: unless-stopped`). Los mensajes sin ACK se reentregan.

## 11. Redis rate limiting

El límite de Groq es global.

Todos los workers comparten el mismo estado en Redis.

No implementar un bucket separado en memoria local.

Implementación: ventana fija de 60 s con `INCR` + `PEXPIRE` atómicos (script Lua) sobre `ratelimit:groq`, con límite `GROQ_RATE_LIMIT_PER_MINUTE`.

- Si el límite se alcanza, la recomendación se pospone hasta que termine la ventana sin consumir un intento.
- Si Redis no responde, se falla cerrado: Groq no se llama y la recomendación espera en la cola sin consumir intentos.

La ventana fija puede permitir ráfagas en el borde de la ventana; un 429 de Groq en ese caso se trata como fallo recuperable.

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

### Integración de Better Auth

El producto expone únicamente username/password. El registro nativo de Better Auth (`/sign-up/email`) exige `email` y `name`, así que **no se monta su handler catch-all**. Controllers de NestJS implementan el contrato de `docs/API.md` llamando a `auth.api.*`. Better Auth sigue siendo el único mecanismo de auth: hashing, sesiones en PostgreSQL y cookies.

Al no pasar por su router, se pierden dos protecciones que se compensan así:

- **Rate limiting**: sign-up/sign-in tienen un límite por IP en Redis. Aquí se falla abierto: si Redis cae, el login sigue disponible.
- **Chequeo de origen**: un middleware rechaza métodos mutantes con `Origin` no confiable.

`SessionGuard` resuelve la sesión con `auth.api.getSession`; el usuario autenticado es la única fuente de identidad.

### Web → API

El navegador solo habla con Next.js. `next.config.ts` reescribe `/api/*` hacia la API, así la cookie de sesión es first-party y no hace falta CORS. Los Server Components y Server Actions llaman a la API por la red interna reenviando la cookie.

## 13. Docker

Compose:

```text
postgres
redis
rabbitmq
migrate   (one-shot: prisma migrate deploy)
api
worker    (misma imagen que api, entrypoint dist/worker.js)
web
```

`api` y `worker` esperan a que `migrate` termine con éxito. `BACKEND_URL` se pasa a web como build arg, porque los rewrites de Next se resuelven en build.

Dentro de la red Docker:

- `postgres:5432`
- `redis:6379`
- `rabbitmq:5672`
- `api:3001`
- `web:3000`

El worker no expone puertos.

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
