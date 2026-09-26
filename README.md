# Movie Recommendation System

sistema de recomendaciones de películas.

La aplicación permite:

- Crear una cuenta e iniciar sesión.
- Explorar películas obtenidas desde TMDB.
- Marcar y desmarcar películas como favoritas.
- Consultar las películas favoritas.
- Solicitar recomendaciones personalizadas de forma asíncrona.
- Consultar el historial de recomendaciones generadas.

## Stack

- Next.js + TypeScript
- NestJS + TypeScript
- PostgreSQL + Prisma
- Redis
- RabbitMQ
- Better Auth
- TMDB
- Groq

## Arquitectura

El backend está organizado como un monolito modular y utiliza un worker para procesar las recomendaciones de forma asíncrona.

RabbitMQ desacopla la solicitud de recomendación de su procesamiento, mientras que Redis se utiliza para cache y rate limiting. Las recomendaciones se persisten en PostgreSQL utilizando un Transactional Outbox para mantener la consistencia entre la base de datos y la cola.

La documentación más detallada se encuentra en:

- `docs/API.md` — endpoints y contratos de la API.
- `docs/ARCHITECTURE.md` — arquitectura y flujos principales.
- `docs/DATABASE.md` — modelo de datos.
- `docs/DEVELOPMENT.md` — desarrollo y configuración.
- `docs/PROJECT_SPEC.md` — especificación funcional.
- `docs/TASKS.md` — tareas y estado del proyecto.

## Cómo ejecutar

Requisitos:

- Docker
- Docker Compose

Configurar las variables de entorno a partir de `.env.example`.

Luego ejecutar:

```bash
docker compose up --build