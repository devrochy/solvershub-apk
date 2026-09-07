---
estado: completada
tags: [tarea]
---

# Tarea: apk-trayectoria-offline (encolar la trayectoria GPS en modo offline)

- **Origen:** Plan aprobado del usuario para dejar la APK desarrollada (Fase 4a, 2026-09-01). HU-49/64. Requiere el backend `sync-trayectoria-offline` (#84, ya mergeado).
- **Estado:** completada
- **Fecha inicio:** 2026-09-02
- **Fecha cierre:** 2026-09-02

## Objetivo
Que la trayectoria GPS registrada se encuele como evento `trayectoria` cuando el envío online falla por red, para sincronizarse después vía `POST /sync-offline/eventos` (HU-49).

## Fuera de alcance
- Mapa de la trayectoria (pendiente del plan del panel/APK).

## Bloques (checklist TDD)
- [x] Bloque 1: `DiaScreen.detenerYEnviarTrayectoria` — en error de red, `offline.encolar("trayectoria", { puntos })` y aviso "se sincronizará".
  - Test(s): `src/screens/DiaScreen.test.tsx` (+1 con mock de `useTrayectoria`).
- [x] Bloque 2: `scripts/check.sh` verde (134 tests) + commit/PR.

## Decisiones tomadas durante la implementación
- Reusa `esErrorDeRed` (todo lo que no es `ApiError`) para distinguir fallo de red del resto.
- El payload del evento es `{ puntos }` (mismo shape que `RegistrarTrayectoriaRealDto` del backend).
- El mock de `useTrayectoria` en el test define un default inactivo para no romper los demás tests.

## Ambigüedades resueltas con el usuario
- (ninguna abierta)

## Resultado final
- Comandos ejecutados para verificar: `scripts/check.sh` verde (134 tests, 20 suites).
- Archivos modificados: `src/screens/DiaScreen.tsx` (encolado de trayectoria), `src/screens/DiaScreen.test.tsx` (+1 + mock), `docs/ai/tasks/apk-trayectoria-offline.md`.
- Pendientes/seguimiento: verificación end-to-end real (offline → sync → reporte diario con trayectoria real).