# Tarea: apk-feedback-device-key (error de sync visible)

- **Origen:** Plan aprobado del usuario para dejar la APK desarrollada (Fase 1, 2026-09-01) + backlog (item "Device key inválida deja la cola atascada sin feedback").
- **Estado:** completada
- **Fecha inicio:** 2026-09-02
- **Fecha cierre:** 2026-09-02

## Objetivo
Que un fallo de sincronización (device key inválida/ausente, 401 del backend, error de red) no deje la cola atascada en silencio: `OfflineProvider` expone `errorSync` y la UI (RutasScreen) lo muestra como aviso.

## Fuera de alcance
- Auto-reintentos con backoff de la sincronización.
- Vincular/regenerar la device key desde la APK (se hace en el backend/admin).

## Bloques (checklist TDD)
- [x] Bloque 1: `OfflineProvider` — `errorSync: string | null`; `sincronizar` lo setea al fallar (mensaje legible) y lo limpia al éxito; la cola NO se vacía ante fallo.
  - Test(s): `src/offline/offline-context.test.tsx` (+2).
- [x] Bloque 2: `RutasScreen` — aviso visible cuando `errorSync` no es null (testID `aviso-error-sync`).
  - Test(s): `src/screens/RutasScreen.test.tsx` (+2).
- [x] Bloque 3: `scripts/check.sh` verde (101 tests) + commit/PR.

## Decisiones tomadas durante la implementación
- `sincronizar()` sigue lanzando (throw) tras setear `errorSync` para no cambiar el contrato de quien lo llama; el efecto de auto-sync lo silencia con `.catch(() => undefined)` (el estado ya se actualizó).
- `OfflineValue.errorSync` es parte del contrato: los fixtures de test de las pantallas se actualizaron.

## Ambigüedades resueltas con el usuario
- (ninguna abierta)

## Resultado final
- Comandos ejecutados para verificar: `scripts/check.sh` verde (101 tests, 17 suites).
- Archivos modificados: `src/offline/offline-context.tsx` (+test), `src/screens/RutasScreen.tsx` (+aviso), `src/screens/RutasScreen.test.tsx` (+2), `src/screens/ClienteScreen.test.tsx`/`DiaScreen.test.tsx` (fixture `errorSync`), `docs/ai/tasks/apk-feedback-device-key.md`, `docs/ai/tasks/backlog.md`.
- Pendientes/seguimiento: reintentos con backoff y re-vinculación de device key quedan fuera.