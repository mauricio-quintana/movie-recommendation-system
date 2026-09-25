# Diseño de base de datos

## 1. Base

PostgreSQL es la única base de datos principal.

Prisma es el ORM.

Schema:

```text
apps/backend/prisma/schema.prisma
```

Migraciones:

```text
apps/backend/prisma/migrations/
```

Migración inicial existente:

```text
20260925045309_init
```

## 2. Better Auth

Modelos generados/gestionados por Better Auth:

- User
- Session
- Account
- Verification

`User` incluye campos técnicos requeridos por Better Auth además del username.

El contrato público del producto sigue siendo username/password.

## 3. User

Campos relevantes:

- `id`
- `name`
- `email`
- `emailVerified`
- `image`
- `username`
- `createdAt`
- `updatedAt`

Constraints:

- email único
- username único

## 4. Movie

Representa un snapshot mínimo de TMDB.

Campos:

- `id`
- `tmdbId`
- `title`
- `originalTitle`
- `overview`
- `posterPath`
- `backdropPath`
- `releaseDate`
- `voteAverage`
- `voteCount`
- `popularity`
- `originalLanguage`
- `createdAt`
- `updatedAt`

Regla:

```text
tmdbId UNIQUE
```

No almacenar URLs completas de imágenes cuando el dato externo proporciona un path.

## 5. Like

Relaciona:

- User
- Movie

Campos:

- `userId`
- `movieId`
- `createdAt`

Clave primaria:

```text
(userId, movieId)
```

Esto garantiza que un usuario no pueda tener el mismo like duplicado.

Índice:

```text
movieId
```

## 6. Recommendation

Campos relevantes:

- `id`
- `userId`
- `status`
- `candidateTmdbIds`
- `selectedMovieId`
- `reason`
- `attempts`
- `failureCode`
- `failureMessage`
- `createdAt`
- `updatedAt`
- `startedAt`
- `completedAt`

Estado:

```text
PENDING
PROCESSING
COMPLETED
FAILED
```

Relaciones:

- User → Recommendation
- Movie → Recommendation seleccionada

## 7. OutboxEvent

Campos:

- `id`
- `eventType`
- `aggregateType`
- `aggregateId`
- `payload`
- `attempts`
- `availableAt`
- `publishedAt`
- `lastError`
- `createdAt`
- `updatedAt`

Uso:

Registrar trabajos/eventos pendientes de publicar.

## 8. Reglas importantes

### User

No borrar datos relacionados manualmente cuando la relación ya define cascade/set-null.

### Movie

No utilizar Movie como catálogo completo de TMDB.

Se crea un snapshot solo cuando la película se usa: al darle like o al formar parte de los candidatos de una recomendación. Los snapshots existentes no se sobrescriben.

### Like

La clave compuesta impide duplicados.

### Recommendation

`candidateTmdbIds` representa el universo autorizado para la selección del LLM.

Antes de guardar `selectedMovieId`, validar la relación lógica con los candidatos.

`attempts` cuenta los intentos de procesamiento y sirve como fencing token en las transiciones del worker. `updatedAt` hace de versión en el claim optimista y marca el lease de `PROCESSING`. Un fallo recuperable devuelve la recomendación a `PENDING` hasta el reintento (ver `docs/ARCHITECTURE.md` §8).

### Outbox

El evento se crea en la misma transacción que el cambio de estado de negocio que lo origina.

`availableAt` cumple dos funciones:

- **Backoff**: un reintento se programa como un nuevo evento con `availableAt` en el futuro.
- **Lease del relay**: al reclamar un evento se adelanta `availableAt` 30 s.

`attempts` cuenta los intentos de publicación y `lastError` guarda el último error del broker.

## 9. Cambios de schema

Cada cambio requiere:

1. editar `schema.prisma`
2. formatear/validar
3. crear migration
4. revisar migration
5. regenerar Prisma Client si corresponde
6. actualizar código
7. ejecutar tests

Nunca:

- editar migrations aplicadas
- borrarlas
- sustituirlas por `db push`
