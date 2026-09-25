---
name: testing-project
description: Estrategia de testing específica del Movie Recommendation System para unit, integration y e2e.
---

# Testing Strategy

## Unit

Usar para:

- reglas de negocio
- validadores
- candidate selection
- transición de estados
- clasificación de errores
- lógica de rate limiting que pueda aislarse

## Integration

Usar cuando el comportamiento dependa de:

- Prisma/PostgreSQL
- Redis
- RabbitMQ
- adapters/providers

No mockear infraestructura cuando el objetivo del test es precisamente validar esa integración.

## E2E

Priorizar los flujos principales:

1. signup/login
2. sesión autenticada
3. movies
4. like/unlike
5. creación de recommendation
6. procesamiento
7. resultado
8. authorization/ownership

## Casos obligatorios

Considerar:

- happy path
- validation errors
- 401
- 403
- 404
- 409 cuando corresponda
- 429
- provider timeout
- provider 5xx
- duplicate delivery
- idempotencia

## Regla

No eliminar ni debilitar tests para hacer pasar CI.
