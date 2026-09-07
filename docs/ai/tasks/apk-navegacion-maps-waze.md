---
estado: completada
tags: [tarea]
---

# Tarea: apk-navegacion-maps-waze (navegación externa desde el día y el cliente)

- **Origen:** Plan aprobado del usuario para dejar la APK desarrollada (Fase 2, 2026-09-01). HU-37/59 (docs/APP_REQUIREMENTS.md:103,109). Decisión del usuario: navegación externa (Google Maps/Waze), sin react-native-maps.
- **Estado:** completada
- **Fecha inicio:** 2026-09-02
- **Fecha cierre:** 2026-09-02

## Objetivo
Que el cobrador abra Google Maps o Waze hacia la ubicación del cliente desde la lista del día (HU-37) y desde el detalle del cliente (HU-59), usando las coordenadas que ya expone el trayecto planificado del día.

## Fuera de alcance
- Mapa embebido (react-native-maps) — descartado por decisión del usuario.
- Coordenadas del cliente cuando no hay trayecto planificado (el backend solo las expone en `trayectos.ordenClientes`).

## Bloques (checklist TDD)
- [x] Bloque 1: helper `src/features/navegacion/navegacion.ts` — `coordenadaDeCliente(trayectos, clienteId)`, `enlaceGoogleMaps(lat, lng)`, `enlaceWaze(lat, lng)`, `abrirNavegacion(lat, lng, app)`.
  - Test(s): `src/features/navegacion/navegacion.test.ts` (6).
- [x] Bloque 2: `ClienteScreen` — botones Google Maps/Waze cuando llegan coordenadas por params (`latitud`/`longitud` opcionales en `RootStackParamList`).
  - Test(s): `src/screens/ClienteScreen.test.tsx` (+3).
- [x] Bloque 3: `DiaScreen` — botón "Cómo llegar" por cliente con coords en el trayecto; pasa coords al navegar al detalle.
  - Test(s): `src/screens/DiaScreen.test.tsx` (+2).
- [x] Bloque 4: `scripts/check.sh` verde (112 tests) + commit/PR.

## Decisiones tomadas durante la implementación
- Las coordenadas del cliente viven solo en `trayectos.ordenClientes` (ParadaGeo). Si no hay trayecto o el cliente no tiene coords, no se muestra el botón (no se inventan coordenadas).
- `RootStackParamList.Cliente` gana `latitud?`/`longitud?` para no re-consultar (la tarjeta del backend no expone coords).
- Enlaces universales (no deep links de app instalada): `google.com/maps/dir` y `waze.com/ul` — funcionan con app instalada o fallback web.

## Ambigüedades resueltas con el usuario
- Mapa: navegación externa (maps/waze), no mapa embebido.

## Resultado final
- Comandos ejecutados para verificar: `scripts/check.sh` verde (112 tests, 18 suites).
- Archivos modificados: `src/features/navegacion/navegacion.ts` (+test), `src/screens/DiaScreen.tsx` (botón "Cómo llegar" + estado trayectos), `src/screens/DiaScreen.test.tsx` (+2), `src/screens/ClienteScreen.tsx` (botones maps/waze), `src/screens/ClienteScreen.test.tsx` (+3), `src/navigation/types.ts` (params opcionales), `docs/ai/tasks/apk-navegacion-maps-waze.md`.
- Pendientes/seguimiento: las coordenadas dependen del trayecto planificado; si el backend algún día expone coords en la lista del día o la tarjeta, los botones aparecerían en más casos.