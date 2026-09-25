---
name: api-rest-contracts
description: Convenciones REST específicas del Movie Recommendation System para endpoints, status codes, errores, async jobs y Swagger.
---

# REST API Contracts

## Base

Todos los endpoints usan:

```text
/api
```

JSON como formato principal.

## Status codes

- `200`: lectura/actualización exitosa
- `201`: recurso creado
- `202`: trabajo asíncrono aceptado
- `204`: éxito sin body
- `400`: input inválido
- `401`: no autenticado
- `403`: no autorizado
- `404`: recurso inexistente
- `409`: conflicto
- `429`: rate limit
- `5xx`: error interno

## Recommendation

`POST /api/recommendations` inicia trabajo asíncrono.

No esperar a Groq.

La respuesta debe representar que el trabajo fue aceptado y devolver el identificador/estado necesario para consultar su progreso.

## Authorization

Los recursos del usuario se autorizan usando la sesión autenticada.

No aceptar un `userId` como fuente de autoridad desde el frontend.

## Errores

Mantener respuestas de error estables.

No exponer stack traces ni mensajes internos.

## Swagger

Actualizar Swagger para endpoints nuevos o contratos modificados.

## Regla

Antes de crear un endpoint nuevo, revisar si ya existe un recurso/contrato equivalente.
