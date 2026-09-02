# Tarea: A11 — Lista de préstamos del cliente con color de estado

- **Origen:** Plan consolidado aprobado por el usuario 2026-09-02 (Epic A11) + petición: "ver en la lista de préstamo el color del estado".
- **Estado:** completada
- **Fecha inicio:** 2026-09-02

## Objetivo
En `ClienteScreen` se lista **todos** los préstamos del cliente (no solo el vigente), cada uno con su ColorBadge del estado (vigente/liquidado→verde, cancelado→blanco) y navegación al canvas de cada préstamo.

## Bloques (checklist TDD)
- [x] Bloque 1: Sección "Préstamos" en ClienteScreen con items navegables al canvas.
- [x] Bloque 2: ColorBadge del estado por préstamo.
- [x] Verificación: test de lista multi-préstamo + `scripts/check.sh` verde (165 tests).

## Resultado final
- Comandos: `scripts/check.sh` APK (165 tests).
- Archivos: `src/screens/ClienteScreen.tsx`, `src/screens/ClienteScreen.test.tsx`, `docs/ai/tasks/a11-lista-prestamos-color.md`.
- Pendientes: ninguno.