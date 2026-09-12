---
estado: completada
tags: [tarea]
---

# Tarea: P2 — Editar ruta desde la APK

- **Origen:** Petición directa del usuario (2026-09-12) — workstream **P2**; ítem del backlog "Edición de ruta desde la APK (solo lectura)". Consume el backend (`app-cobranza`, PR del mismo slug).
- **Estado:** completada
- **Fecha inicio:** 2026-09-12

## Objetivo
Que el cobrador edite nombre, interés y cuotas de su ruta asignada desde el detalle, gated por el permiso `actualizar_ruta`.

## Bloques (checklist TDD)
- [x] Bloque 1: API `actualizarRuta`/`actualizarConfiguracionRuta` + tipo `CobradorPermisoEstado` con `actualizar_ruta`.
- [x] Bloque 2: `RutaDetalleScreen` con modal de edición (nombre/interés/cuotas) y gate por permiso (sin permiso mantiene el aviso).
  - Test(s): `src/screens/RutaDetalleScreen.test.tsx`

## Decisiones tomadas durante la implementación
- `RutaActiva` expone `permisos` (de `mis-rutas`) para gatear el botón; `DiaScreen` y `RutaDetalleScreen` lo consumen.
- Tras guardar, se actualiza `rutaActiva` (nombre/interés/cuotas) y se re-consulta para reflejar el cambio.

## Ambigüedades resueltas con el usuario
- Alcance: nombre/interés/cuotas.

## Resultado final (llenar al completar)
- Comandos ejecutados para verificar: `bash scripts/check.sh` (50 suites, 361 tests) → verde.
- Archivos modificados:
  - `src/api/cobrador.ts` — 2 endpoints.
  - `src/types/cobrador-permisos.ts` — `actualizar_ruta`.
  - `src/session/ruta-activa-context.tsx`, `src/screens/SeleccionRutaScreen.tsx` (+ test) — `permisos` en `RutaActiva`.
  - `src/screens/RutaDetalleScreen.tsx` (+ test) — modal de edición + gate.
- Pendientes/seguimiento: depende de que el admin habilite `actualizar_ruta` en la matriz del cobrador. `permisos` en `RutaActiva` también viene en el PR de polish (se re-aplicó aquí de forma idéntica).