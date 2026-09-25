---
name: groq-recommendations
description: Reglas específicas del proyecto para integrar Groq en la generación de recomendaciones.
---

# Groq Recommendations

## Ubicación

Groq se invoca desde el worker, nunca desde el controller ni desde el request HTTP principal.

## Input

El contexto enviado al modelo debe ser mínimo y explícito:

- perfil del usuario disponible para la aplicación
- likes relevantes
- conjunto de películas candidatas

## Output

Preferir structured output cuando el modelo lo soporte.

Aun con schema estructurado, validar en servidor:

- tipos
- campos requeridos
- `tmdbId`
- longitud razonable del texto
- coherencia con candidatos

## Regla crítica

El modelo solamente puede seleccionar una película entre los candidatos.

Si el `tmdbId` retornado no pertenece al conjunto de candidatos:

- no persistir como COMPLETED
- registrar fallo controlado
- aplicar la política de retry solamente si el fallo es recuperable

## Rate limiting

Antes de llamar Groq usar el rate limiter distribuido de Redis.

No implementar un contador local por worker.

## Errors

Tratar 429, timeouts, network errors y 5xx como potencialmente recuperables.

Respetar `Retry-After`.

No guardar secretos ni datos sensibles innecesarios en prompts.
