---
estado: completada
tags: [tarea]
---

# Tarea: flags de ruta en la captura — método de pago e interés (APK)

- **Origen:** `docs/ai/tasks/requerimientos-apk.md` → `REQ-APK-005` (hallazgo H-24; sub-lote **B1-B** del Bloque B).
- **Estado:** completada
- **Fecha inicio:** 2026-09-16

## Objetivo
Que la configuración de ruta module los formularios de captura del cobrador: métodos de pago permitidos y bloqueo del cambio de interés.

## Fuera de alcance
- `ocultarCartera` (decisión de producto) y flags sin UI (`eliminar*Apk`, `registrarInyeccionApk`, `permitirCambioFechaPrestamo`) → `REQ-APK-022`.

## Bloques (checklist TDD)
- [x] Bloque 1: `metodosPago` filtra los chips de método en el pago/abono (si la config está vacía, se ofrecen todos).
- [x] Bloque 2: el método seleccionado se ajusta si queda fuera de los permitidos.
- [x] Bloque 3: `bloquearCambioInteres` deshabilita el campo de interés en "Nuevo préstamo".
  - Test(s) de todos: `src/screens/ClienteScreen.test.tsx`.

## Decisiones tomadas durante la implementación
- Default "todos" si `config.metodosPago` está vacío (rutas sin config completa no bloquean la captura).
- El filtrado se hace con `useMemo` sobre `config.metodosPago` y un `useEffect` que reajusta `metodoPago`.
- `bloquearCambioInteres` usa `editable={false}` en `CampoModal` (el interés de la ruta se sigue aplicando desde el backend).

## Resultado final
- Verificación: `npx tsc --noEmit` limpio; `npx jest --runInBand` → **57 suites / 408 tests verde**.
- Archivos: `src/screens/ClienteScreen.tsx` (+ test; helper `renderConApi` ahora acepta `config`).
- Pendientes/seguimiento: B3 (persistir trayectoria) y B4 (operaciones que exigen conexión).
