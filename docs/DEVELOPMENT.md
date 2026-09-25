# Desarrollo y operación local

## 1. Requisitos

Entorno previsto:

- Node.js 24
- pnpm 11.27.0
- Docker Desktop
- Docker Compose

## 2. Instalación

Desde la raíz:

```bash
pnpm install
```

## 3. Variables de entorno

El archivo local es:

```text
.env
```

No debe committearse.

El archivo versionado de referencia es:

```text
.env.example
```

Variables principales:

```text
NODE_ENV
PORT
FRONTEND_URL
BETTER_AUTH_URL
DATABASE_URL
REDIS_URL
RABBITMQ_URL
TMDB_API_KEY
GROQ_API_KEY
BETTER_AUTH_SECRET
```

## 4. Desarrollo local

Scripts principales:

```bash
pnpm dev
pnpm lint
pnpm format
pnpm format:check
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

## 5. Prisma

Generación:

```bash
pnpm --filter backend exec prisma generate
```

Estado:

```bash
pnpm --filter backend exec prisma migrate status
```

Migración de desarrollo:

```bash
pnpm --filter backend exec prisma migrate dev
```

Deploy de migraciones:

```bash
pnpm --filter backend exec prisma migrate deploy
```

No usar `db push` como sustituto de migraciones versionadas.

## 6. Docker Compose

Levantar todo:

```bash
docker compose up --build
```

Levantar en background:

```bash
docker compose up -d
```

Ver estado:

```bash
docker compose ps
```

Ver logs:

```bash
docker compose logs -f
```

Detener:

```bash
docker compose down
```

## 7. Puertos de desarrollo

Host:

```text
Web       3000
API       3001
Postgres  5433
Redis     6379
RabbitMQ  5672
RabbitMQ UI 15672
```

Dentro de Docker:

```text
postgres:5432
redis:6379
rabbitmq:5672
api:3001
web:3000
```

## 8. Health

API:

```text
GET http://localhost:3001/api/health
```

Web:

```text
http://localhost:3000
```

Swagger:

```text
http://localhost:3001/api/docs
```

RabbitMQ Management:

```text
http://localhost:15672
```

## 9. Quality gates

Antes de completar una feature:

```bash
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm build
```

Cuando corresponda:

```bash
pnpm test:e2e
```

## 10. Troubleshooting

### API no accesible en localhost

Comprobar:

```bash
docker compose ps
docker compose port api 3001
docker compose logs api
```

### Puerto ocupado

Comprobar qué proceso ocupa el puerto antes de modificar Compose.

### PostgreSQL

Desde Windows el host publica `5433`.

Desde Docker usar:

```text
postgres:5432
```

No usar `localhost:5433` desde otro contenedor.

### RabbitMQ

Desde Docker usar:

```text
amqp://guest:guest@rabbitmq:5672
```

### Redis

Desde Docker usar:

```text
redis://redis:6379
```

## 11. Regla general

Antes de cambiar infraestructura:

1. comprobar estado actual
2. revisar logs
3. modificar lo mínimo
4. validar `docker compose config`
5. volver a levantar
6. verificar health
