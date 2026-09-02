# Tarea: A1 — Autocompletar préstamo desde la config de la ruta

- **Origen:** Plan consolidado aprobado por el usuario 2026-09-02 (Epic A1).
- **Estado:** completada
- **Fecha inicio:** 2026-09-02

## Objetivo
Al abrir "Nuevo préstamo" en la APK, el formulario se autocompleta con los defaults de la ruta activa: `tipoInteres`, `numCuotas` y valor sugerido (`cupoDefault`).

## Bloques (checklist TDD)
- [x] Bloque 1 (backend): `GET /cobrador/mis-rutas` expone `tipoInteres`/`numCuotas` (PR #87).
- [x] Bloque 2 (APK): `RutaActivaContext` guarda la ruta completa (tipoInteres, numCuotas, config); `RutasScreen` la setea al elegir ruta.
- [x] Bloque 3 (APK): `ClienteScreen` autocompleta interés/cuotas/valor al abrir el formulario.
- [x] Verificación: `scripts/check.sh` APK verde (152 tests).

## Resultado final
- Comandos: `scripts/check.sh` APK (152 tests) + backend (826 tests).
- Archivos modificados (APK): `src/session/ruta-activa-context.tsx`, `src/screens/RutasScreen.tsx`, `src/screens/ClienteScreen.tsx`, `src/types/cobrador.ts`, `src/screens/RutasScreen.test.tsx`, `src/screens/ClienteScreen.test.tsx`, `src/screens/ClientesScreen.test.tsx`, `src/screens/DiaScreen.test.tsx`.
- Archivos modificados (backend): `src/modules/cobrador/cobrador.service.ts` (+spec), tarea `a1-backend-mis-rutas-defaults.md`.
- Pendientes: mergear PR #87; el valor de "días entre cuotas" no tiene default de ruta (queda en blanco).