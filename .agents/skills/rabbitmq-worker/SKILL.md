---
name: rabbitmq-worker
description: Convenciones del proyecto para RabbitMQ, workers, retries, DLQ, ACKs, publisher confirms e idempotencia.
---

# RabbitMQ Worker

## Diseño del proyecto

RabbitMQ procesa la generación asíncrona de recomendaciones.

Inicialmente:

- exchange `app.commands`
- exchange `app.events`
- queue `recommendation.commands`
- DLQ `recommendation.commands.dlq`
- routing key `recommendation.generate`

## Consumer

- Manual ACK.
- ACK solamente después de completar el procesamiento.
- Prefetch inicial: `1`.
- Diseñar suponiendo al menos una entrega.
- El handler debe tolerar redelivery y duplicados.

## Idempotencia

Antes de ejecutar trabajo costoso:

1. identificar el recommendation id
2. verificar estado
3. evitar volver a completar una recomendación ya finalizada
4. hacer las transiciones de estado de manera segura

## Retry

Retry para errores transitorios:

- timeout
- network error
- 429
- 5xx

No reintentar indefinidamente:

- payload inválido
- configuración inválida
- credenciales inválidas
- salida de negocio inválida

Usar backoff y respetar `Retry-After` cuando exista.

## DLQ

Mensajes agotados por retry policy o no procesables deben ir a la DLQ.

## Publisher

Los trabajos críticos deben publicarse con publisher confirms.

No considerar el mensaje publicado hasta contar con la confirmación apropiada del broker.

## Regla

Nunca bloquear el request HTTP esperando a Groq.
