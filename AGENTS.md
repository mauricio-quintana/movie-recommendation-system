# Convenciones e instrucciones del proyecto

Este archivo es la entrada principal para cualquier agente que trabaje en este repositorio.

## 1. Primera lectura obligatoria

Antes de modificar código, el agente debe leer en este orden:

1. `AGENTS.md`
2. `docs/PROJECT_SPEC.md`
3. `docs/ARCHITECTURE.md`
4. `docs/DATABASE.md`
5. `docs/API.md`
6. `docs/TASKS.md`
7. `docs/DEVELOPMENT.md`

Después debe cargar solamente las skills de `.agents/skills/` que sean relevantes para la tarea actual.

### Mapa de `.agents`

`.agents/skills/` contiene conocimiento reutilizable sobre tecnologías y sobre este proyecto.

Las skills oficiales deben considerarse la referencia de buenas prácticas de cada tecnología. No duplicar dentro de `AGENTS.md` el contenido de esas skills.

Las skills específicas del proyecto contienen decisiones que no pueden inferirse de la documentación oficial de una librería.

Ejemplos de categorías:

- Prisma / PostgreSQL
- Better Auth
- Next.js / React / Vercel
- Redis
- NestJS
- RabbitMQ
- Groq
- API REST
- Testing
- Security
- Docker
- reglas específicas de Movie Recommendation System

## 2. Rol de cada archivo

### `AGENTS.md`

Describe cómo debe comportarse el agente y qué convenciones debe seguir al modificar este repositorio.

No contiene la especificación completa del producto.

### `docs/PROJECT_SPEC.md`

Describe qué debe hacer el producto.

Es la fuente de verdad funcional del take-home.

### `docs/ARCHITECTURE.md`

Describe cómo decidimos construir el sistema.

Es la fuente de verdad de las decisiones arquitectónicas.

### `docs/DATABASE.md`

Describe el modelo de datos y las invariantes importantes.

### `docs/API.md`

Describe los contratos HTTP previstos y las reglas de la API.

### `docs/TASKS.md`

Describe qué funcionalidades están terminadas y qué queda pendiente.

No inventar tareas nuevas cuando ya existe una tarea equivalente.

### `docs/DEVELOPMENT.md`

Describe cómo instalar, ejecutar, probar y validar el repositorio.

## 3. Autoridad de las instrucciones

Las fuentes de contexto no tienen todas el mismo nivel de autoridad. El agente debe distinguir entre requisitos obligatorios, buenas prácticas técnicas y preferencias de implementación.

### 3.1 Requisitos del producto y del take-home

`docs/PROJECT_SPEC.md` contiene los requisitos funcionales del producto. Estos requisitos son obligatorios salvo que una instrucción posterior y explícita del usuario los reemplace.

### 3.2 Buenas prácticas oficiales de las tecnologías

Las skills oficiales de los proveedores o proyectos de cada tecnología son la referencia técnica principal para aplicar buenas prácticas, APIs, seguridad y patrones recomendados.

Cuando una convención local entre en conflicto con una buena práctica oficial, preferir la práctica oficial salvo que exista una decisión explícita del producto o de arquitectura que justifique la excepción.

### 3.3 Decisiones arquitectónicas explícitas

`docs/ARCHITECTURE.md` contiene decisiones deliberadas para este sistema. Estas decisiones deben respetarse aunque existan otras alternativas técnicamente válidas.

Una skill o recomendación general no debe sustituir silenciosamente una decisión arquitectónica explícita. Si una buena práctica oficial parece requerir cambiarla, explicar primero el impacto y el motivo.

### 3.4 Convenciones y preferencias del proyecto

`AGENTS.md`, `docs/DATABASE.md`, `docs/API.md`, `docs/DEVELOPMENT.md` y las custom skills del proyecto contienen convenciones, contexto y preferencias útiles para mantener consistencia. No deben tratarse como verdades universales.

El agente puede apartarse de una convención local cuando haya una razón técnica clara, una buena práctica oficial relevante o una necesidad del producto/arquitectura. Cuando la desviación sea significativa, dejarla explícita en el cambio o en la documentación correspondiente.

### 3.5 Código existente

Al modificar código existente, preferir consistencia con los patrones actuales cuando no contradigan requisitos del producto, decisiones arquitectónicas o buenas prácticas oficiales. No replicar automáticamente un patrón existente que sea claramente problemático.

## 4. Objetivo del agente

El agente es principalmente un agente de implementación.

Debe:

- inspeccionar antes de editar
- reutilizar patrones existentes
- implementar cambios pequeños y coherentes
- mantener la arquitectura existente
- agregar tests
- actualizar documentación cuando cambie comportamiento o contratos
- verificar los cambios

No debe:

- cambiar tecnologías por preferencia
- introducir microservicios
- rehacer el proyecto
- hacer refactors no relacionados
- agregar dependencias innecesarias
- borrar tests para lograr que CI pase
- deshabilitar seguridad para facilitar desarrollo

## 5. Arquitectura actual

Backend:

- NestJS + TypeScript
- monolito modular
- módulos de negocio:
  - auth
  - users
  - movies
  - likes
  - recommendations

Frontend:

- Next.js + TypeScript
- App Router

Infraestructura:

- PostgreSQL
- Prisma
- Redis
- RabbitMQ
- Docker Compose

Servicios externos:

- TMDB
- Groq
- Better Auth

## 6. Backend

### Controllers

Los controllers manejan HTTP.

Evitar en controllers:

- lógica de negocio compleja
- acceso directo a Prisma
- llamadas directas a TMDB
- llamadas directas a Groq
- autorización basada exclusivamente en datos enviados por el cliente

### Services / use cases

Las reglas de negocio y la orquestación deben vivir en servicios/use cases.

No crear capas ceremoniales en módulos que no las necesiten.

### Integraciones

TMDB, Groq, Redis y RabbitMQ deben estar aislados detrás de providers/services apropiados.

## 7. Autenticación y autorización

Better Auth es el sistema de autenticación.

El flujo público del producto es username/password.

No crear una segunda solución de autenticación.

La sesión autenticada identifica al usuario.

Para recursos propios del usuario:

- comprobar autenticación
- comprobar ownership
- no confiar en un `userId` enviado por el cliente

La configuración existente de Better Auth puede mantener campos técnicos requeridos por su schema interno aunque el contrato público del producto exponga únicamente username/password.

## 8. Base de datos

PostgreSQL es la fuente de verdad.

Prisma es el ORM.

Todas las modificaciones estructurales requieren migración.

No:

- editar migraciones ya aplicadas
- borrar migraciones históricas
- usar `db push` como sustituto de migraciones
- guardar la información crítica solamente en Redis

No persistir el catálogo completo de TMDB.

Persistir únicamente el snapshot mínimo necesario.

El cliente Prisma generado permanece fuera de Git.

## 9. Redis

Redis se utiliza para:

- cache de TMDB
- rate limiting distribuido
- coordinación efímera

Redis no es fuente de verdad.

El rate limiting de Groq debe ser global entre workers/procesos.

## 10. RabbitMQ

RabbitMQ se utiliza para el procesamiento asíncrono de recomendaciones.

Características iniciales:

- manual ACK
- prefetch 1
- retries limitados
- backoff
- DLQ
- publisher confirms
- consumidores idempotentes

No mantener abierta una petición HTTP mientras se llama a Groq.

## 11. Outbox

Cuando una operación de negocio necesita generar trabajo asíncrono:

1. persistir el estado de negocio
2. persistir `OutboxEvent`
3. confirmar una única transacción PostgreSQL
4. publicar el mensaje
5. usar publisher confirms
6. marcar el outbox como publicado

No mantener llamadas externas largas dentro de una transacción.

## 12. Recomendaciones

Estados:

```text
PENDING
PROCESSING
COMPLETED
FAILED
```

Groq solamente se invoca desde el worker.

La película seleccionada por el LLM debe pertenecer al conjunto de candidatos.

Validar siempre la salida del modelo antes de persistirla.

## 13. API

REST JSON bajo `/api`.

Usar status codes apropiados.

Los trabajos asíncronos pueden responder `202 Accepted`.

Actualizar Swagger/OpenAPI al agregar o modificar endpoints relevantes.

## 14. Frontend

Next.js App Router.

Server Components por defecto.

Client Components únicamente cuando haya necesidad real de:

- estado local interactivo
- event handlers
- hooks
- APIs del navegador

Las páginas de datos deben contemplar:

- loading
- success
- empty
- error

No duplicar reglas de negocio del backend en el frontend.

## 15. Seguridad

Nunca:

- guardar secretos en Git
- modificar `.env`
- imprimir API keys
- imprimir tokens/cookies
- devolver stack traces
- confiar en autorización enviada por el cliente
- desactivar controles de seguridad para hacer funcionar un test

Mantener:

- validación
- autorización server-side
- CORS restringido
- Helmet
- cookies seguras
- rate limiting donde corresponda

## 16. Testing

Los cambios funcionales deben tener tests adecuados.

Preferencia:

- unit: reglas de negocio
- integration: persistencia e infraestructura
- e2e: flujos HTTP importantes

Para una feature, considerar también:

- unauthorized
- forbidden
- not found
- validation errors
- provider failures
- retries
- idempotencia

## 17. Git

Mantener cambios enfocados.

No mezclar una feature con un refactor general.

No commitear:

- `.env`
- secretos
- output generado del cliente Prisma
- archivos temporales

## 18. Definition of Done

Una feature no está terminada solamente porque compila.

Debe cumplir:

- comportamiento funcional
- persistencia correcta cuando corresponda
- API y frontend cuando corresponda
- tests
- lint
- format check
- typecheck
- build
- e2e cuando corresponda
- migraciones verificadas cuando corresponda
- documentación actualizada si cambia un contrato o decisión
