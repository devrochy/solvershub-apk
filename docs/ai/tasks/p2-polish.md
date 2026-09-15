---
estado: completada
tags: [tarea]
---

# Tarea: P2 — Pulido APK restante

- **Origen:** Petición directa del usuario (2026-09-12) — workstream **P2 UX**; ítems del backlog APK de baja prioridad.
- **Estado:** completada
- **Fecha inicio:** 2026-09-12

## Objetivo
Cerrar ítems de pulido: código muerto, doble capa de permisos en la liquidación y drift de estilos.

## Bloques (checklist TDD)
- [x] Bloque 1: eliminar `inicialesDe` (código muerto) de `Avatar.tsx` y su test.
  - Test(s): `src/components/Avatar.test.tsx`
- [x] Bloque 2: `RutaActiva` expone `permisos` (de `mis-rutas`) y `DiaScreen` gatea la liquidación por `generar_reporte` además de `config.generarReportesApk`.
  - Test(s): `src/screens/DiaScreen.test.tsx`, `src/screens/SeleccionRutaScreen.test.tsx`
- [x] Bloque 3: verificar que `TrayectosLista` ya usa `estilosHeader` (sin cambio de código; ítem cerrado).

## Decisiones tomadas durante la implementación
- El gate de permisos usa `!permisos || permisos.some(...)`: si `permisos` no está (contexto incompleto), se mantiene el comportamiento previo; en la app `SeleccionRutaScreen` siempre lo setea.
- No se incluye el date picker nativo (requiere dependencia nueva) ni la extracción de `EvidenciasModal` (refactor mayor); quedan en el backlog.

## Ambigüedades resueltas con el usuario
- Bloque P2: APK polish restante.

## Resultado final (llenar al completar)
- Comandos ejecutados para verificar: `bash scripts/check.sh` (50 suites, 358 tests) → verde.
- Archivos modificados:
  - `src/components/Avatar.tsx` (+ `.test.tsx`) — se elimina `inicialesDe`.
  - `src/session/ruta-activa-context.tsx`, `src/screens/SeleccionRutaScreen.tsx` (+ test), `src/screens/DiaScreen.tsx` (+ test) — permisos en la liquidación.
  - `docs/ai/tasks/backlog.md` — ítems movidos a historial.
- Pendientes/seguimiento: date picker nativo y extracción de `EvidenciasModal` (siguen en el backlog).