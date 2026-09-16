---
estado: completada
tags: [tarea]
---

# Tarea: UX móvil — tap targets, modales y estatus (APK)

- **Origen:** `docs/ai/tasks/requerimientos-apk.md` → `REQ-APK-019` (hallazgos H-78, H-79, H-81; sub-lote **019a** del plan de benchmark).
- **Estado:** completada
- **Fecha inicio:** 2026-09-16

## Objetivo
Mejorar la calidad de uso en campo: áreas táctiles suficientes, modales que no se tapan con el teclado y estatus legibles (en lugar de crudos).

## Fuera de alcance (sub-lotes siguientes)
- **019b**: banner error vs éxito, feedback de pull-to-refresh, confirmación al cerrar modal con cambios.
- **019c**: throttle de la precarga del día.
- Sincronización offline (pendiente de vincular dispositivo).

## Bloques (checklist TDD)
- [x] Bloque 1: helper `etiquetaEstatus` (vigente→Vigente, etc.; capitaliza desconocidos).
  - Test(s): `src/domain/estatus.test.ts`.
- [x] Bloque 2: `EvidenciaPicker` — `hitSlop` en el botón "quitar" + `accessibilityLabel`.
  - Test(s): `src/components/EvidenciaPicker.test.tsx`.
- [x] Bloque 3: `ModalConFooter` — `hitSlop` en cerrar, y cuerpo con `ScrollView` + `KeyboardAvoidingView`.
  - Test(s): `src/components/ModalConFooter.test.tsx`.
- [x] Bloque 4: estatus legible en `ClienteScreen` (`p.estatus`, `detalleCuota.estatus`) y `RutaDetalleScreen`.
  - Test(s): `src/screens/RutaDetalleScreen.test.tsx`; `ClienteScreen.test.tsx` verde.
- [x] Bloque 5: legibilidad de cuotas (9px → 11px) en el canvas de `ClienteScreen`.
  - Test(s): suite de `ClienteScreen` verde.

## Decisiones tomadas durante la implementación
- Tap targets por **`hitSlop`** (amplía el área táctil sin cambiar el diseño visual).
- `ModalConFooter` envuelve el cuerpo en `ScrollView` (con `keyboardShouldPersistTaps`) y todo en `KeyboardAvoidingView` (iOS padding / Android height).
- `etiquetaEstatus` capitaliza y reemplaza `_` por espacios para estatus desconocidos.

## Resultado final
- Verificación: `npx tsc --noEmit` limpio; `npx jest --runInBand` → **54 suites / 390 tests verde** (serie, evita la flakiness por paralelización).
- Archivos: `src/domain/estatus.ts` (+ `.test.ts`), `src/components/EvidenciaPicker.tsx` (+ test), `src/components/ModalConFooter.tsx` (+ test), `src/screens/ClienteScreen.tsx`, `src/screens/RutaDetalleScreen.tsx` (+ test).
- Pendientes/seguimiento: `REQ-APK-019` 019b (feedback/estado) y 019c (performance).
