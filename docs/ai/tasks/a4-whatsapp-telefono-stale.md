---
estado: completada
tags: [tarea]
---

# Tarea: A4 — WhatsApp usa el teléfono editado (fix stale)

- **Origen:** Plan consolidado aprobado por el usuario 2026-09-02 (Epic A4) + reporte del usuario: "cambié el número y no se reflejó al enviar por WhatsApp".
- **Estado:** completada
- **Fecha inicio:** 2026-09-02

## Objetivo
Tras editar los datos del cliente (`guardarCambioCliente`), la cabecera y el botón WhatsApp usan el teléfono/nombre nuevos. Antes la `tarjeta` quedaba stale (solo se encolaba el cambio offline sin actualizar el estado local).

## Bloques (checklist TDD)
- [x] Bloque 1: `guardarCambioCliente` actualiza `tarjeta` local optimistamente (nombre, negocio, teléfono).
- [x] Verificación: test "tras editar el teléfono, el WhatsApp usa el número nuevo" + `scripts/check.sh` verde (155 tests).

## Resultado final
- Comandos: `scripts/check.sh` APK (155 tests).
- Archivos: `src/screens/ClienteScreen.tsx`, `src/screens/ClienteScreen.test.tsx`, `docs/ai/tasks/a4-whatsapp-telefono-stale.md`.
- Pendientes: ninguno.