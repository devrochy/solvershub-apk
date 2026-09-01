# Tarea: apk-trayectoria-gps (trayectoria real con GPS)

- **Origen:** Fase A del plan de la APK (A3) aprobado por el usuario 2026-09-01. El cobrador debe poder registrar la trayectoria real GPS del día y enviarla a `POST /cobrador/rutas/:id/trayectoria-real` (>= 2 puntos).
- **Estado:** en progreso
- **Fecha inicio:** 2026-09-01

## Objetivo
Que el cobrador inicie/registre su recorrido GPS desde la pantalla del día, acumule puntos (lat/lng) y los envíe al cierre (>= 2 puntos), con permiso y estado de grabación visible.

## Fuera de alcance
- Sincronización offline de la trayectoria (Fase B).
- Mostrar la trayectoria en mapa.

## Bloques (checklist TDD)
- [x] Bloque 1: hook `useTrayectoria` (`src/features/trayectoria/use-trayectoria.ts`) — permiso foreground, `watchPositionAsync` (distanceInterval 20m / timeInterval 15s), acumula puntos, `detener` devuelve los puntos y limpia la suscripción.
  - Test(s): `src/features/trayectoria/use-trayectoria.test.ts` (3, mock expo-location)
- [x] Bloque 2: UI en `DiaScreen` — botón iniciar/detener con indicador rojo + contador, y al detener `api.registrarTrayectoriaReal` (aviso si < 2 puntos).
  - Test(s): check.sh + bundle web compila
- [x] Bloque 3: config plugin `expo-location` en `app.json` + `scripts/check.sh` verde (36 tests, 8 suites).

## Decisiones tomadas durante la implementación
- `expo-location` ~57.0.14; `watchPositionAsync` con `distanceInterval` + `timeInterval`.
- Se acumula en un ref (para que `detener` devuelva los puntos sin closure stale) y se refleja en state para el UI.

## Ambigüedades resueltas con el usuario
- Pregunta: ¿arrancar A2+A3? → "arranquemos como dices" (A3 tras A2).

## Resultado final
- Comandos ejecutados para verificar: `scripts/check.sh` verde (lint + typecheck + 36 tests, 8 suites); bundle web 200.
- Archivos modificados: `src/features/trayectoria/use-trayectoria.ts` (+test, 3), `src/screens/DiaScreen.tsx` (botón GPS + envío), `app.json` (plugin expo-location), `package.json` (expo-location ~57.0.14), `docs/ai/tasks/apk-trayectoria-gps.md`.
- Pendientes/seguimiento: A4 promesa + A5 abono; A6 UX.