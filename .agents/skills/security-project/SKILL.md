---
name: security-project
description: Reglas de seguridad específicas del proyecto para auth, ownership, secrets, proveedores externos, logs, HTTP y Docker.
---

# Security

## Secrets

Nunca guardar:

- TMDB API key
- Groq API key
- Better Auth secret
- passwords
- session tokens

en código, Git, Dockerfiles o logs.

## Authentication

Better Auth es el único mecanismo de autenticación.

## Authorization

Siempre server-side.

Para recursos de usuario comprobar ownership.

## Input

Validar body, params y query.

Nunca confiar en el frontend.

## External providers

Validar outputs de TMDB y Groq antes de usarlos en lógica de negocio.

## Logs

Nunca registrar:

- Authorization headers
- cookies
- passwords
- API keys
- tokens

## HTTP

Mantener:

- Helmet
- CORS restringido
- cookies seguras
- rate limiting en puntos sensibles

No deshabilitar controles de seguridad para facilitar desarrollo.

## Docker

No copiar `.env`, `.git`, caches o credenciales a imágenes.
