---
estado: completada
tags: [tarea]
---

# Tarea: flags de ruta en la liquidación del día (APK)

- **Origen:** `docs/ai/tasks/requerimientos-apk.md` → `REQ-APK-005` (hallazgo H-24; Bloque B del plan de benchmark).
- **Estado:** completada
- **Fecha inicio:** 2026-09-16

## Objetivo
Que la configuración de ruta del admin module lo que el cobrador ve en la liquidación del día.

## Fuera de alcance
- `ocultarCartera` (decisión de producto) y los flags sin UI (`eliminar*Apk`, `registrarInyeccionApk`, `permitirCambioFechaPrestamo`) → `REQ-APK-022`.
- Flags de captura (`metodosPago`, `bloquearCambioInteres`) → sub-lote B1-B.

## Bloques (checklist TDD)
- [x] Bloque 1: `mostrarCaja` oculta "Caja anterior"/"Caja actual".
- [x] Bloque 2: `mostrarCobroEstimado` oculta "Estimado a cobrar".
- [x] Bloque 3: `mostrarCobradoLiquidada` oculta "Total cobrado día".
- [x] Bloque 4: `mostrarPrestamos` oculta "Suma cartera".
  - Test(s) de todos: `src/screens/DiaScreen.test.tsx` (on/off).

## Decisiones tomadas durante la implementación
- Default **mostrar** cuando el flag es `undefined` (`?? true`), para no romper rutas sin config completa.
- El gating se aplica en las líneas del modal de liquidación (`DiaScreen`), que es donde la APK muestra estos datos.

## Resultado final
- Verificación: `npx tsc --noEmit` limpio; `npx jest --runInBand` → **56 suites / 398 tests verde** (base `develop` sin el PR #64 aún).
- Archivos: `src/screens/DiaScreen.tsx` (+ test).
- Pendientes/seguimiento: B1-B (captura), B3/B4; merge del PR #64 (B2) pendiente.
