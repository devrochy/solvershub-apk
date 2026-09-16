---
estado: completada
tags: [tarea]
---

# Tarea: feedback de estado — banner, refresh y cierre de edición (APK)

- **Origen:** `docs/ai/tasks/requerimientos-apk.md` → `REQ-APK-019` (hallazgos H-78, H-82, H-87; sub-lote **019b** del plan de benchmark).
- **Estado:** completada
- **Fecha inicio:** 2026-09-16

## Objetivo
Que el cobrador distinga visualmente un éxito de un error, reciba feedback cuando un refresco falla y no pierda cambios al cerrar la edición sin guardar.

## Fuera de alcance
- 019c (throttle de la precarga del día).
- Sincronización offline (pendiente de vincular dispositivo).

## Bloques (checklist TDD)
- [x] Bloque 1: componente `BannerMensaje` (verde éxito / rojo error).
  - Test(s): `src/components/BannerMensaje.test.tsx`.
- [x] Bloque 2: `ClienteScreen` usa `BannerMensaje` y marca tipo (`mensajeExito`/`mensajeError`); los 6 mensajes de éxito se distinguen de los 38 de error.
  - Test(s): suites de `ClienteScreen` verdes.
- [x] Bloque 3: feedback de refresh con datos presentes (`aviso-refresco`) en `DiaScreen` y `ClientesScreen`.
  - Test(s): suites de `DiaScreen`/`ClientesScreen` verdes.
- [x] Bloque 4: confirmación al cerrar la edición con cambios sin guardar (`Alert.alert`).
  - Test(s): `ClienteScreen.test.tsx` (spy de `Alert.alert`).

## Decisiones tomadas durante la implementación
- El banner se extrajo a `BannerMensaje` (reutilizable y testeable por color).
- `mensajeError` (default) vs `mensajeExito` en `ClienteScreen`: los mensajes de éxito ("Pago registrado.", "Guardado sin conexión", "Visita registrada.", "Ubicación actualizada.", "Cambio enviado") usan `mensajeExito`.
- El refresh fallido ya no es silencioso: si hay datos, se muestra `aviso-refresco` con el mensaje (mismo estilo que "Datos sin conexión").
- Cerrar la edición con cambios pide confirmación (Alert nativo) con opción "Seguir editando"/"Descartar".

## Resultado final
- Verificación: `npx tsc --noEmit` limpio; `npx jest --runInBand` → **55 suites / 393 tests verde** (serie, evita la flakiness por paralelización).
- Archivos: `src/components/BannerMensaje.tsx` (+ `.test.tsx`), `src/screens/ClienteScreen.tsx` (+ test), `src/screens/DiaScreen.tsx`, `src/screens/ClientesScreen.tsx`.
- Pendientes/seguimiento: 019c (performance).
