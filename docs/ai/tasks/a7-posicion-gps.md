# Tarea: A7 — Envío periódico de posición GPS en la APK

- **Origen:** Plan consolidado aprobado por el usuario 2026-09-02 (Epic A7) + B3 (backend polling).
- **Estado:** completada
- **Fecha inicio:** 2026-09-02

## Objetivo
Mientras la trayectoria está activa en `DiaScreen`, la APK envía la posición GPS del cobrador periódicamente (30 s) a `POST /cobrador/rutas/:rutaId/posicion` (B3).

## Bloques (checklist TDD)
- [x] Bloque 1: API `registrarPosicion` en la APK.
- [x] Bloque 2: hook `usePosicion` (expo-location + setInterval) — tests 3.
- [x] Bloque 3: integrar en DiaScreen (depende de `trayectoria.activa`).
- [x] Verificación: `scripts/check.sh` verde (174 tests).

## Resultado final
- Comandos: `scripts/check.sh` APK (174 tests).
- Archivos: `src/api/cobrador.ts`, `src/features/trayectoria/use-posicion.ts`, `src/features/trayectoria/use-posicion.test.ts`, `src/screens/DiaScreen.tsx`, `docs/ai/tasks/a7-posicion-gps.md`.
- Pendientes: ninguno.