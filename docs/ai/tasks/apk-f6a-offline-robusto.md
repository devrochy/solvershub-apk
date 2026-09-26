---
estado: completado
tags: [tarea, offline]
---

# Tarea: apk-f6a-offline-robusto (F6a)

- **Origen:** backlog REQ-APK (sub-tanda A de F6).
- **Estado:** completado (2026-09-24).
- **REQ cubiertos:** REQ-APK-010 (errores por evento + reintento), REQ-APK-009 (cola
  acotada), REQ-APK-011 (conflicto en edición offline), REQ-APK-015 (cache con TTL).
  REQ-APK-012 (persistir trayectoria) ya estaba implementado (`trayectoria-storage`).

## Qué se hizo

### REQ-APK-010 — Error por evento + reintentar/descartar
- `api/offline-sync.ts`: `sincronizarCola` devuelve el **ack por evento**
  (`sincronizado`/`duplicado`/`error`), no solo los confirmados.
- `offline-context`: los confirmados y los rechazados salen de la cola (los
  rechazados **no bloquean** el resto); los rechazados quedan en `eventosError`
  (persistido en `sync-meta`), con `reintentarEvento` (vuelve a la cola con su
  mismo `eventoIdCliente`) y `descartarEvento`.
- `ConfiguracionScreen`: sección "Eventos con error" con Reintentar/Descartar.

### REQ-APK-009 — Cola acotada
- `cola.ts`: `MAX_COLA = 200`; `encolar` devuelve `null` si está llena; la UI avisa
  ("La cola offline está llena…") en vez de perder el dato en silencio.
- Evidencias: gasto y cliente ya se redimensionan (`reducir-imagen`).

### REQ-APK-011 — Conflicto en edición offline
- `cola.fusionarPendiente`: una 2ª edición offline del mismo cliente **fusiona**
  `input` en el evento pendiente en vez de descartarse.

### REQ-APK-015 — Cache con TTL
- `cache.ts`: envuelve cada entrada con `{v, t}` y expira a las **24 h**
  (`CACHE_TTL_MS`); `leer*` devuelve `null` si está vencida.

## Verificación

- `npm run check` (lint + **typecheck** + **477 tests**) en verde.
- Tests nuevos en `cola.test.ts`: tope de cola y fusión de edición.

## Pendiente (otras sub-tandas de F6)

B (flujo de campo), C (UX/a11y/seguridad), D (cobro digital), E (autovinculación).
