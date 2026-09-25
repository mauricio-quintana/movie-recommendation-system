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

## 2. Authentication

### POST `/api/auth/sign-up`

Crea una cuenta.

Input público:

```json
{
  "username": "string",
  "password": "string"
}
```

La implementación puede mantener campos técnicos internos requeridos por Better Auth.

### POST `/api/auth/sign-in`

Inicia sesión.

Input:

```json
{
  "username": "string",
  "password": "string"
}
```

### POST `/api/auth/sign-out`

Cierra sesión.

Requiere sesión.

### GET `/api/auth/session`

Devuelve el estado de sesión disponible para el cliente/backend según la integración actual.

## 3. Current user

### GET `/api/me`

Requiere autenticación.

Devuelve información segura del usuario actual.

No debe aceptar un `userId` para decidir qué usuario consultar.

## 4. Movies

### GET `/api/movies`

Lista películas.

Posibles query params, según implementación final:

- page
- limit
- search
- sort

No agregar parámetros al contrato sin necesidad real.

TMDB puede ser la fuente y Redis puede cachear las respuestas.

### GET `/api/movies/:tmdbId`

Obtiene el detalle de una película identificada por TMDB ID.

## 5. Likes

### GET `/api/likes`

Lista likes del usuario autenticado.

### POST `/api/likes/:tmdbId`

Agrega like.

Requiere autenticación.

Si el like ya existe, el contrato final debe mantener un comportamiento idempotente o devolver un conflicto de manera consistente con la implementación elegida.

### DELETE `/api/likes/:tmdbId`

Elimina like.

## 6. Recommendations

### POST `/api/recommendations`

Solicita una recomendación.

Requiere autenticación.

La generación es asíncrona.

Response previsto:

```text
202 Accepted
```

Debe devolver información suficiente para consultar el estado, incluyendo el recommendation id.

### GET `/api/recommendations`

Lista recomendaciones del usuario autenticado.

### GET `/api/recommendations/:id`

Obtiene una recomendación específica.

Debe verificar ownership.

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
