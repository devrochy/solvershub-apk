---
estado: completada
tags: [tarea]
---

# Tarea: throttle de la precarga del día (APK)

- **Origen:** `docs/ai/tasks/requerimientos-apk.md` → `REQ-APK-019` (hallazgo H-86; sub-lote **019c** del plan de benchmark).
- **Estado:** completada
- **Fecha inicio:** 2026-09-16

## Objetivo
Evitar que la precarga offline (tarjeta + préstamos de cada cliente del día) se repita completa en cada re-fetch periódico (cada 30s → ~2N requests), sin perder la disponibilidad offline.

## Fuera de alcance
- Cambios de backend.
- Otros quick wins de la APK (ya entregados).

## Bloques (checklist TDD)
- [x] Bloque 1: helper `clientesAprecargar(clientes, precargados, ahora, ttlMs)` (omite los precargados dentro del TTL).
  - Test(s): `src/offline/precarga.test.ts` (3).
- [x] Bloque 2: `DiaScreen` usa el helper con un `Map<clienteId, timestamp>` en `useRef` (TTL 5 min) y lo reinicia al cambiar de ruta.
  - Test(s): suite de `DiaScreen` verde (la lógica de decisión queda cubierta por el helper).

## Decisiones tomadas durante la implementación
- TTL de **5 minutos**: suficiente para evitar la repetición cada 30s y no dejar el cache demasiado stale (el detalle igual refetchea online).
- Se marca el timestamp **antes** de lanzar las peticiones para evitar solapamientos concurrentes.
- El `Map` se reinicia al cambiar de ruta (para precargar los clientes de la nueva ruta).

## Resultado final
- Verificación: `npx tsc --noEmit` limpio; `npx jest --runInBand` → **56 suites / 396 tests verde** (serie, evita la flakiness por paralelización).
- Archivos: `src/offline/precarga.ts` (+ `.test.ts`), `src/screens/DiaScreen.tsx`.
- Pendientes/seguimiento: `REQ-APK-019` completo (019a/019b/019c).
