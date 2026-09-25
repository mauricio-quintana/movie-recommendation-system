# Especificación del producto

## 1. Objetivo

Construir un sistema web de recomendación de películas.

Un usuario debe poder:

1. crear una cuenta
2. iniciar sesión
3. explorar películas
4. dar like/unlike
5. consultar sus películas liked
6. solicitar una recomendación personalizada
7. consultar las recomendaciones generadas

## 2. Cuenta y autenticación

### Registro

El usuario debe poder registrarse mediante:

- username
- password

### Login

El usuario debe poder iniciar sesión con:

- username
- password

### Logout

Debe poder cerrar sesión.

### Sesión

La aplicación debe conservar una sesión autenticada segura.

## 3. Películas

TMDB es la fuente externa del catálogo.

El usuario debe poder:

- listar películas
- consultar detalle
- visualizar información básica
- visualizar imágenes
- realizar like/unlike

La aplicación puede cachear respuestas de TMDB y persistir snapshots mínimos de las películas utilizadas.

No requiere replicar el catálogo completo de TMDB.

## 4. Likes

Un usuario autenticado puede:

- agregar like a una película
- quitar like
- listar películas liked

La relación `(userId, movieId)` es única.

## 5. Perfil de recomendación

El sistema utiliza como contexto de recomendación la información disponible del usuario y sus likes.

El conjunto de candidatos debe estar definido antes de consultar Groq.

## 6. Recomendación

El usuario puede solicitar una nueva recomendación.

La solicitud debe ser asíncrona.

La API no espera la respuesta de Groq.

### Flujo

```text
POST /api/recommendations
        |
        v
PENDING
        |
        v
RabbitMQ
        |
        v
worker
        |
        v
PROCESSING
        |
        v
Groq
        |
        v
validación
        |
        +----> COMPLETED
        |
        +----> FAILED
```

## 7. Candidatos

Groq no tiene libertad para seleccionar una película fuera del conjunto entregado.

El resultado debe validarse.

Condición mínima:

```text
selectedTmdbId ∈ candidateTmdbIds
```

## 8. Resultado

Una recomendación completada debe persistir como mínimo:

- usuario
- estado
- candidatos
- película seleccionada
- explicación/motivo
- cantidad de intentos
- timestamps
- información de error cuando corresponda

## 9. Rate limiting

Las llamadas a Groq deben pasar por rate limiting distribuido.

Redis es el mecanismo compartido para ese límite.

No usar counters locales por worker.

## 10. Fallos

Debe distinguirse entre:

### Recuperables

- timeout
- errores de red
- 429
- 5xx
- indisponibilidad temporal

### No recuperables

- configuración inválida
- credenciales inválidas
- payload inválido
- respuesta de negocio inválida

Los retries deben tener límite.

Mensajes agotados o no procesables terminan en DLQ.

## 11. Frontend

El flujo web esperado es:

```text
registro/login
   ↓
catálogo
   ↓
detalle / like
   ↓
mis likes
   ↓
solicitar recomendación
   ↓
estado de procesamiento
   ↓
resultado
```

Cada etapa debe contemplar estados de:

- loading
- empty
- error
- success

## 12. Entrega técnica

El repositorio debe incluir:

- código fuente
- Prisma schema y migrations
- API
- frontend
- Docker Compose
- Dockerfiles
- tests
- CI
- documentación
- configuración de agentes

Debe funcionar con:

```bash
docker compose up --build
```
