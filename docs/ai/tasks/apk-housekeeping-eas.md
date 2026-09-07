---
estado: completada
tags: [tarea]
---

# Tarea: apk-housekeeping-eas (commit app.json + limpieza de ramas)

- **Origen:** Plan aprobado del usuario para dejar la APK desarrollada (Fase 0 del plan 2026-09-01).
- **Estado:** completada
- **Fecha inicio:** 2026-09-01
- **Fecha cierre:** 2026-09-02

## Objetivo
Commitear los cambios pendientes de `app.json` (permisos Android de ubicación + `extra.eas.projectId` necesarios para el build EAS real) y limpiar las ramas feature locales/remotas ya mergeadas.

## Fuera de alcance
- El build EAS en sí (se hace al final del plan).
- Cualquier cambio de código de producción.

## Bloques (checklist TDD)
- [x] Bloque 1: `app.json` — permisos Android `ACCESS_COARSE_LOCATION`/`ACCESS_FINE_LOCATION` + `extra.eas.projectId`.
  - Test(s): `npx expo config` (resuelve el projectId y los permisos). ✅
- [x] Bloque 2: limpiar ramas feature locales y remotas de PRs ya mergeados (#1-#10).
  - Test(s): `git branch -a` (sin ramas feature). ✅
- [x] Bloque 3: `scripts/check.sh` verde + commit/PR. ✅

## Decisiones tomadas durante la implementación
- El `extra.eas.projectId` (`a6fbd941-...`) ya existía localmente (se agregó para el build EAS del usuario); se commitea para reproducir builds.
- Los permisos de ubicación se declararon para que el APK instalado pueda usar `expo-location` en la trayectoria GPS.

## Ambigüedades resueltas con el usuario
- (ninguna abierta)

## Resultado final
- Comandos ejecutados para verificar: `npx expo config` OK (projectId + permisos), CI build-and-test PASS en PR #11.
- Archivos modificados: `app.json` (permisos + projectId), `docs/ai/tasks/apk-housekeeping-eas.md` (este archivo).
- Pendientes/seguimiento: ramas obsoletas borradas (8 locales + 8 remotas); develop en `92d823a`.