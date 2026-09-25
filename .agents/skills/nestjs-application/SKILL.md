---
name: nestjs-application
description: Buenas prácticas específicas para desarrollar el backend de este proyecto con NestJS. Usar al trabajar con módulos, controllers, providers, DTOs, guards, configuración, validación, errores o tests.
---

# NestJS Application

## Cuando usar esta skill

Usar para cualquier cambio en `apps/backend/src`.

## Reglas

- Respetar el monolito modular existente.
- Organizar código por capacidad de negocio.
- Mantener controllers delgados.
- Poner reglas de negocio en services/use cases.
- Usar dependency injection.
- Evitar dependencias circulares.
- Usar DTOs para inputs HTTP.
- Confiar en la validación global ya configurada; no duplicarla innecesariamente.
- No acceder a Prisma desde controllers.
- No llamar TMDB, Groq, Redis o RabbitMQ directamente desde controllers.
- Aislar integraciones externas en providers/services testeables.
- Aplicar autorización server-side.
- No confiar en `userId` enviado por el cliente cuando la sesión autenticada ya identifica al usuario.
- Usar excepciones HTTP apropiadas.
- No exponer stack traces, secretos o detalles internos.

## Testing

- Unit tests para reglas de negocio.
- Integration tests cuando importe persistencia/integración.
- E2E para flujos HTTP importantes.

## Estructura recomendada

Preferir:

```text
module/
  controller/
  application/
  infrastructure/
```

solo cuando el tamaño/complexity lo justifique. No introducir capas ceremoniales en módulos simples.
