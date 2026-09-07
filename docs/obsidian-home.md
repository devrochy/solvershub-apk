# APK CobraIA — App de Cobranza (Mapa de Contenido)

> Abre este repositorio como vault de Obsidian: *Open folder as vault* → `/Users/roaguilar/Projects/app-cobranza-apk`.

## Documentación clave

- [[AGENTS]] — reglas del sistema para agentes de IA (fuente de verdad de comportamiento).
- [[docs/ai/tasks]] — archivos de tarea por feature/epic (estado real persistido entre sesiones).
- [[docs/ai/tasks/backlog]] — pendientes/deuda técnica priorizada.

## Contexto de la plataforma

- Backend (`devrochy/app-cobranza`): PRD funcional `docs/APP_REQUIREMENTS.md`, plan `docs/plan-feature-roadmap.md`, mapa de contenido `docs/obsidian-home.md`.
- Panel admin (`devrochy/app-cobranza-admin`): plan `docs/plan-panel-admin.md`, matriz de permisos `docs/matriz-permisos.md`, mapa de contenido `docs/obsidian-home.md`.

## Estado del desarrollo

- Repo: `devrochy/app-cobranza-apk` (privado). Ramas: `main` (producción) + `develop` (integración).
- Expo Go + Metro (LAN) · API del backend NestJS en `http://localhost:3000` (vía túnel cloudflared o IP LAN para el dispositivo).
- Roles: cobrador (`POST /auth/cobrador/login`) y socio (`POST /auth/socio/login`).