---
estado: completada
tags: [tarea]
---

# Tarea: A8 — ColorBadge como punto de color sin texto

- **Origen:** Plan consolidado aprobado por el usuario 2026-09-02 (Epic A8) + decisión "punto de color sin texto".
- **Estado:** completada
- **Fecha inicio:** 2026-09-02

## Objetivo
Las tarjetas de cliente muestran un punto circular del color semántico (verde/rojo/azul/blanco) sin el texto del color.

## Bloques (checklist TDD)
- [x] Bloque 1: `ColorBadge` → punto circular, sin texto.
- [x] Bloque 2: quitar `label` en ClientesScreen.
- [x] Verificación: tests de ColorBadge (2) + `scripts/check.sh` verde (158 tests).

## Resultado final
- Comandos: `scripts/check.sh` APK (158 tests).
- Archivos: `src/components/ColorBadge.tsx`, `src/components/ColorBadge.test.tsx`, `src/screens/ClientesScreen.tsx`, `docs/ai/tasks/a8-colorbadge-punto.md`.
- Pendientes: ninguno.