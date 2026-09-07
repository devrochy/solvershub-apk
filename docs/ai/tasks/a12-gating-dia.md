---
estado: completada
tags: [tarea]
---

# Tarea: A12 — Gating de la lista del día (trayecto + GPS)

- **Origen:** Plan consolidado aprobado por el usuario 2026-09-02 (Epic A12) + decisión "lista bloqueada con aviso" + "generar desde la APK".
- **Estado:** completada
- **Fecha inicio:** 2026-09-02

## Objetivo
En `DiaScreen`, la lista de clientes para cobrar se bloquea hasta que exista trayecto planificado **y** el GPS esté activo. Si no hay trayecto, botón "Generar trayecto" (POST /cobrador/rutas/:id/trayecto, B5); si falta GPS, aviso de activarlo.

## Bloques (checklist TDD)
- [x] Bloque 1: API `generarTrayecto(rutaId)` en la APK.
- [x] Bloque 2: `DiaScreen` — botón "Generar trayecto" si `trayectos == null`; aviso GPS si no `trayectoria.activa`; lista `disabled` hasta cumplir ambas.
- [x] Verificación: test de gating + `scripts/check.sh` verde (168 tests).

## Resultado final
- Comandos: `scripts/check.sh` APK (168 tests).
- Archivos: `src/api/cobrador.ts`, `src/screens/DiaScreen.tsx`, `src/screens/DiaScreen.test.tsx`, `docs/ai/tasks/a12-gating-dia.md`.
- Pendientes: ninguno.