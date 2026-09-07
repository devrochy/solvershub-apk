---
estado: completada
tags: [tarea]
---

# Tarea: A2 — Un solo formulario activo a la vez (fix solapamiento)

- **Origen:** Plan consolidado aprobado por el usuario 2026-09-02 (Epic A2).
- **Estado:** completada
- **Fecha inicio:** 2026-09-02

## Objetivo
En `ClienteScreen` solo se renderiza un formulario a la vez. Antes `modoPrestamo` era ortogonal a `modo` y los diálogos de cuota convivían → se apilaban "Nuevo préstamo" + "Editar datos" + diálogo de cuota.

## Bloques (checklist TDD)
- [x] Bloque 1: `modo` ampliado a `"prestamo"`; `abrirModo()` cierra los demás formularios y los diálogos de cuota.
- [x] Bloque 2: handlers de los 4 botones usan `abrirModo`; `prestamo-form` se renderiza con `modo === "prestamo"`.
- [x] Verificación: tests de solapamiento (2 nuevos) + `scripts/check.sh` verde (154 tests).

## Resultado final
- Comandos: `scripts/check.sh` APK (154 tests).
- Archivos: `src/screens/ClienteScreen.tsx`, `src/screens/ClienteScreen.test.tsx`, `docs/ai/tasks/a2-formulario-unico.md`.
- Pendientes: ninguno.