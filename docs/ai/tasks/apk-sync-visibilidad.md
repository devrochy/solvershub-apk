---
estado: completada
tags: [tarea]
---

# Tarea: última sincronización y sincronizar manual (APK)

- **Origen:** `docs/ai/tasks/requerimientos-apk.md` → `REQ-APK-001` (hallazgo H-20; Bloque B del plan de benchmark).
- **Estado:** completada
- **Fecha inicio:** 2026-09-16

## Objetivo
Que el cobrador vea cuándo fue la última sincronización, cuántos eventos faltan por subir, y pueda forzar una sincronización (y un "general" que además refresca datos).

## Fuera de alcance
- Vincular el dispositivo (la sincronización seguirá fallando hasta que el `device` esté `activo`).
- Sincronización en segundo plano/automática (ya existe al reconectar).

## Bloques (checklist TDD)
- [x] Bloque 1: persistencia `guardarUltimaSincronizacion`/`leerUltimaSincronizacion` en AsyncStorage.
  - Test(s): `src/offline/sync-meta.test.ts`.
- [x] Bloque 2: `offline-context` expone `ultimaSincronizacion` (persistida) y `sincronizar()` la actualiza al tener éxito.
  - Test(s): `src/offline/offline-context.test.tsx`.
- [x] Bloque 3: `sincronizarGeneral()` = flush de cola + refetch (`versionRecarga`); expuesto en `OfflineValue`.
  - Test(s): `src/offline/offline-context.test.tsx`.
- [x] Bloque 4: `SeleccionRutaScreen` y `DiaScreen` re-consultan cuando `versionRecarga` cambia.
  - Test(s): suites de ambas pantallas verdes.
- [x] Bloque 5: pantalla `ConfiguracionScreen` con última sincronización, pendientes y botones Sincronizar / Sincronizar general + feedback.
  - Test(s): `src/screens/ConfiguracionScreen.test.tsx`.

## Decisiones tomadas durante la implementación
- `sincronizar` actualiza la marca de tiempo en cada llamada exitosa (incluida la cola vacía), para dar feedback del intento.
- "Sincronizar general" = flush de cola + `versionRecarga++` (refetch en las pantallas).
- La pantalla se ubica en **Configuración** (donde ya vivía la info de la app).

## Resultado final
- Verificación: `npx tsc --noEmit` limpio; `npx jest --runInBand` → **57 suites / 403 tests verde**.
- Archivos: `src/offline/sync-meta.ts` (+ test), `src/offline/offline-context.tsx` (+ test), `src/screens/SeleccionRutaScreen.tsx`, `src/screens/DiaScreen.tsx`, `src/screens/ConfiguracionScreen.tsx` (+ test) y fixtures de test actualizados.
- Pendientes/seguimiento: vincular dispositivo para que el sync funcione en producción.
