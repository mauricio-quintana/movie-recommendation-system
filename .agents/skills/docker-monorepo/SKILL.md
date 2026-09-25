---
name: docker-monorepo
description: Convenciones específicas para Docker, Docker Compose, pnpm workspaces y los servicios del proyecto.
---

# Docker + pnpm Monorepo

## Servicios

Compose contiene:

- postgres
- redis
- rabbitmq
- api
- web

El worker utilizará la imagen del backend con un comando/entrypoint diferente cuando se implemente.

## Networking

Dentro de Compose usar nombres de servicio:

```text
postgres
redis
rabbitmq
api
web
```

No usar `localhost` para conexiones entre contenedores.

## Build

Usar multi-stage builds.

Mantener `.dockerignore`.

Instalar de manera reproducible:

```bash
pnpm install --frozen-lockfile
```

## Runtime

Copiar solamente lo necesario.

No incluir `.env` ni `.git`.

Siempre que sea viable, ejecutar como usuario no root.

## Compose

Los servicios dependientes de infraestructura deben esperar healthchecks cuando corresponda.

Mantener el requisito:

```bash
docker compose up --build
```

## Monorepo

Respetar pnpm workspace.

No depender de `node_modules` del host.

## Validación

Después de cambios relevantes de Docker:

1. `docker compose config`
2. `docker compose up --build`
3. `docker compose ps`
4. probar health endpoints
