# Tarea: apk-housekeeping-eas (commit app.json + limpieza de ramas)

- **Origen:** Plan aprobado del usuario para dejar la APK desarrollada (Fase 0 del plan 2026-09-01).
- **Estado:** en progreso
- **Fecha inicio:** 2026-09-01

## Objetivo
Commitear los cambios pendientes de `app.json` (permisos Android de ubicación + `extra.eas.projectId` necesarios para el build EAS real) y limpiar las ramas feature locales/remotas ya mergeadas.

## Fuera de alcance
- El build EAS en sí (se hace al final del plan).
- Cualquier cambio de código de producción.

## Bloques (checklist TDD)
- [ ] Bloque 1: `app.json` — permisos Android `ACCESS_COARSE_LOCATION`/`ACCESS_FINE_LOCATION` + `extra.eas.projectId`.
  - Test(s): `npx expo config` (resuelve el projectId y los permisos).
- [ ] Bloque 2: limpiar ramas feature locales y remotas de PRs ya mergeados (#1-#10).
  - Test(s): `git branch -a` (sin ramas feature).
- [ ] Bloque 3: `scripts/check.sh` verde + commit/PR.

## Decisiones tomadas durante la implementación
- El `extra.eas.projectId` (`a6fbd941-...`) ya existía localmente (se agregó para el build EAS del usuario); se commitea para reproducir builds.
- Los permisos de ubicación se declararon para que el APK instalado pueda usar `expo-location` en la trayectoria GPS.

## Ambigüedades resueltas con el usuario
- (ninguna abierta)

## Resultado final (llenar al completar)
- Comandos ejecutados para verificar: ...
- Archivos modificados: ...
- Pendientes/seguimiento: ...