---
estado: pendiente
tags: [tarea, migracion]
---

# Tarea: migracion-api-agent-core (APK del gestor → API de campo de agent-core)

- **Origen:** decisión de arquitectura 2026-09-24 — el vertical cobranza vive ahora en
  **agent-core** (`pack_cobranza`), no en el backend NestJS `app-cobranza`.
- **ADR:** `agent-core/docs/adr/0065-api-de-campo-del-gestor.md`.
- **Plan del pack:** `agent-core/packages/pack-cobranza/docs/api-gestor.md`.
- **Estado:** F0–F5 completas (2026-09-24). Falta F6 (backlog REQ-APK + autovinculación).
- **Decisión:** el **pack implementa el contrato exacto de la APK** (mismas rutas, camelCase,
  IDs como string). Paridad total de lecturas y escrituras. La APK cambia lo mínimo.

## Objetivo

Que la APK funcione contra `agent-core` (pack-cobranza) cambiando **solo**: base URL,
`id: number → string`, y la sesión (access+refresh) — sin reescribir pantallas.

## Contexto / contrato actual

- `src/api/gestor.ts` define ~30 rutas `/gestor/…`; `src/api/auth.ts` usa `usuario/password`;
  `src/api/offline-sync.ts` usa `x-device-key`.
- `src/types/gestor.ts` es el contrato de respuestas (camelCase, IDs numéricos).
- Base URL hoy: `EXPO_PUBLIC_API_URL` (backend NestJS `:3000`).

## Cambios en la APK

- **Base URL** (`src/config.ts`): apuntar al prefijo público del pack
  (`<host>/api/pack/pack_cobranza`).
- **IDs `number → string`**: `src/types/gestor.ts` y todo lo que compare/construya IDs.
- **Sesión**: `api/auth.ts` (login gestor; propietario según decisión), `session/*` con
  access+refresh contra el pack.
- **Offline**: `api/offline-sync.ts` con Bearer + ack por evento
  (`[{eventoIdCliente, estado, error?}]`).
- **Limpieza**: quitar dependencia de `x-device-key`.

## Fases (espejo de `api-gestor.md`)

- **F0 — Contrato y esqueleto:** `config.ts` al pack (feature flag); dejar los tipos listos
  para IDs string.
- **F1 — Auth y perfil:** login/refresh/`PUT /perfil` contra el pack.
- **F2 — Lecturas:** mis-carteras (+config+permisos), trayecto-diario, clientes, tarjeta,
  estado-cuenta, préstamos, detalle-cuota, notas, estadísticas, liquidaciones, notificaciones.
- **F3 — Escrituras:** visitas, gastos/evidencias/clientes (multipart), préstamos, cuotas,
  bajas de pago/abono, liquidación+PDF, apertura/posición/trayectoria, editar cartera/config, notas.
- **F4 — Offline:** sync-offline (5 tipos, ack por evento) + trayecto-diario offline.
- **F5 — Adaptación final:** IDs string en pantallas, sesión, limpieza; `npm run check` verde.
- **F6 — Backlog + producción:** `REQ-APK-001..011`; autovinculación de dispositivo (HU-39/43).

## Definición de "Terminado" (DoD)

1. `npm run check` (lint + typecheck + tests) pasa completo.
2. Pruebas nuevas por comportamiento (Red → Green → Refactor).
3. Este archivo refleja el resultado real por fase.
4. Sin TODO/FIXME sin registrar.
5. Commit + PR por fase: rama `feature/<slug>` desde `develop`, PR a `develop`, CI verde.

## Riesgos

- Refactor transversal de IDs (`number → string`).
- `/auth/propietario/login` (el propietario es el tenant; decisión pendiente).
- `password`+`motivo` en bajas: se mantiene y se audita en el pack.
- PDF de liquidación (v1: HTML imprimible).

## Resultado (F0–F5, 2026-09-24)

- **F1 (APK)**: login envía `{tenant, usuario, password}` (`EXPO_PUBLIC_TENANT`).
- **F5 (APK)**:
  - **IDs `number → string`** en `types/*`, `api/gestor.ts`, `session/*`, `navigation/types.ts`,
    `offline/*`, `components/*` y `screens/*` (incl. fixtures de tests).
  - **Offline**: `sincronizarCola` usa **Bearer** del gestor (sin `x-device-key`);
    se eliminó `EXPO_PUBLIC_DEVICE_KEY`/`DEVICE_API_KEY`; `offline-context` toma el
    token de `sessionGateway`.
  - **Eventos offline**: `gasto` y `trayectoria` incluyen `carteraId`.
  - `session/jwt.ts`: `AccessTokenPayload` alineado al token del pack
    (`admin_id`, `gestor_id?`, `rol`, `typ`).
- **Pack**: `TrayectoPublic.ordenClientes` se devuelve **anidado** (`ParadaGeo[][]`,
  ADR-0065) para que la APK lo itere como espera.
- **Verificación**: `npm run check` (lint + typecheck + **461 tests**) en verde.

Pendiente **F6**: `REQ-APK-001..011` + autovinculación de dispositivo (HU-39/43).
