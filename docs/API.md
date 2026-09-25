# Contratos de API

## 1. Convenciones

Base path:

```text
/api
```

Formato:

```text
application/json
```

La API utiliza autenticación basada en sesión/cookies de Better Auth.

Swagger/OpenAPI:

```text
/api/docs
```

### CSRF

Las peticiones con método distinto de `GET`/`HEAD`/`OPTIONS` que traen una cabecera `Origin` fuera de `FRONTEND_URL`/`BETTER_AUTH_URL` se rechazan con `403`. Los clientes sin `Origin` (no navegadores) no se ven afectados.

## 2. Authentication

Los endpoints de auth son controllers de NestJS que llaman a la API server-side de Better Auth (`auth.api.*`). El handler catch-all de Better Auth no se monta: así el contrato público es solo username/password. Ver `docs/ARCHITECTURE.md` §12.

### POST `/api/auth/sign-up`

Crea una cuenta e inicia sesión (cookie `better-auth.session_token`, `HttpOnly`, `SameSite=Lax`).

Input público:

```json
{
  "username": "string",
  "password": "string"
}
```

- `username`: 3–30 caracteres `[a-zA-Z0-9_.]`, se normaliza a minúsculas.
- `password`: 8–128 caracteres.

Internamente se guardan los campos técnicos que Better Auth exige (`email` sintético `<username>@users.invalid`, `name`).

Respuestas: `201 { user: { id, username } }`, `400` validación, `409` username en uso, `429` rate limit.

### POST `/api/auth/sign-in`

Inicia sesión.

Input:

```json
{
  "username": "string",
  "password": "string"
}
```

Respuestas: `200 { user: { id, username } }`, `400`, `401` credenciales inválidas (sin distinguir usuario inexistente), `429`.

Sign-up y sign-in tienen rate limit por IP en Redis (`AUTH_RATE_LIMIT_PER_MINUTE`, por defecto 10/min) con cabecera `Retry-After`.

### POST `/api/auth/sign-out`

Cierra sesión. Requiere sesión. `204`, `401`.

### GET `/api/auth/session`

Estado de sesión. Nunca falla para visitantes anónimos:

```json
{ "authenticated": true, "user": { "id": "string", "username": "string" }, "expiresAt": "ISO-8601" }
```

Anónimo: `{ "authenticated": false, "user": null, "expiresAt": null }`.

## 3. Current user

### GET `/api/me`

Requiere autenticación.

Devuelve información segura del usuario actual.

No debe aceptar un `userId` para decidir qué usuario consultar.

## 4. Movies

### GET `/api/movies`

Lista películas. Público.

Query params:

- `page`: entero 1–500 (límite de TMDB), por defecto 1.
- `search`: texto opcional (máx. 100). Sin `search` se devuelven las populares.

`limit` y `sort` no se implementan: TMDB pagina de a 20 y no se necesitó ordenar.

Respuesta: `{ page, totalPages, totalResults, results: Movie[] }`. Las imágenes son paths de TMDB (`posterPath`, `backdropPath`), no URLs completas.

TMDB es la fuente; las respuestas mapeadas se cachean en Redis (listas 10 min, detalle 24 h). Si Redis falla se sigue sin cache.

`503` cuando TMDB no está disponible (timeout, red, 429, 5xx o credenciales mal configuradas). Nunca se exponen detalles del proveedor.

### GET `/api/movies/:tmdbId`

Detalle de una película por TMDB ID (incluye `genres`, `runtime`, `tagline`). Público. `400` id inválido, `404` inexistente, `503` TMDB no disponible.

## 5. Likes

Requieren autenticación (`401`). El usuario siempre sale de la sesión.

### GET `/api/likes`

Lista los likes del usuario autenticado, más recientes primero: `[{ likedAt, movie }]`.

### POST `/api/likes/:tmdbId`

Agrega like. Idempotente:

- `201` si el like se creó.
- `200` si ya existía.

La primera vez que se usa una película se persiste su snapshot mínimo. `404` si TMDB no conoce la película, `503` si TMDB no responde.

### DELETE `/api/likes/:tmdbId`

Elimina like. Idempotente: `204` exista o no.

## 6. Recommendations

Requieren autenticación (`401`).

### POST `/api/recommendations`

Solicita una recomendación. La generación es asíncrona: no se espera a Groq.

Antes de responder, el conjunto de candidatos se calcula con TMDB (recomendaciones de los likes más recientes; populares si el usuario no tiene likes). Después, `Recommendation(PENDING)` y `OutboxEvent` se confirman en una sola transacción.

Respuesta:

```text
202 Accepted
Location: /api/recommendations/{id}
```

```json
{ "id": "uuid", "status": "PENDING", "createdAt": "ISO-8601" }
```

`503` si no se pudieron construir candidatos (TMDB no disponible). En ese caso no se persiste nada.

### GET `/api/recommendations`

Lista las recomendaciones del usuario autenticado, más recientes primero.

### GET `/api/recommendations/:id`

Obtiene una recomendación del usuario autenticado.

Ownership: una recomendación de otro usuario responde `404` (igual que una inexistente), para no revelar ids ajenos. `400` si el id no es UUID.

Forma de una recomendación:

```json
{
  "id": "uuid",
  "status": "PENDING | PROCESSING | COMPLETED | FAILED",
  "attempts": 1,
  "candidateTmdbIds": [603, 13],
  "selectedMovie": "Movie | null",
  "reason": "string | null",
  "failureCode": "string | null",
  "failureMessage": "string | null",
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601",
  "startedAt": "ISO-8601 | null",
  "completedAt": "ISO-8601 | null"
}
```

Códigos de fallo: `INVALID_MODEL_OUTPUT`, `GROQ_AUTH_FAILED`, `GROQ_REQUEST_REJECTED`, `GROQ_UNAVAILABLE`, `GROQ_RATE_LIMITED`, `GROQ_TIMEOUT`, `GROQ_NETWORK_ERROR`, `RATE_LIMITER_UNAVAILABLE`, `INVALID_CANDIDATES`, `ATTEMPTS_EXHAUSTED`.

## 7. Status codes

Usar de forma consistente:

```text
200 OK
201 Created
202 Accepted
204 No Content
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
429 Too Many Requests
500 Internal Server Error
503 Service Unavailable (proveedor externo no disponible)
```

## 8. Error responses

Los errores deben ser seguros y estables.

Nunca devolver:

- stack traces
- API keys
- tokens
- credenciales
- detalles internos de proveedores

## 9. Asynchronous behavior

`POST /api/recommendations` no espera a Groq.

El estado se consulta posteriormente.

## 10. Swagger

Cada endpoint público importante debe documentar:

- summary
- auth requirement
- request body/params
- response
- error responses
