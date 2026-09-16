---
estado: completada
tags: [tarea]
---

# Tarea: validaciones de captura — monto y teléfono (APK)

- **Origen:** `docs/ai/tasks/requerimientos-apk.md` → `REQ-APK-018` (hallazgos H-75/H-77; quick win del plan de benchmark).
- **Estado:** completada
- **Fecha inicio:** 2026-09-16

## Objetivo
Que el cobrador no pueda capturar montos por encima del saldo (de la cuota o del préstamo) ni un teléfono inválido al editar un cliente, con mensaje claro en la app antes de enviar.

## Fuera de alcance
- Validaciones equivalentes en el panel.
- `REQ-APK-019` (tap targets, scroll/teclado en modales, estatus con etiqueta, banner de error).

## Bloques (checklist TDD)
- [x] Bloque 1: helper `validarMontoContraTope(monto, tope)` (tope `null` = sin validación).
  - Test(s): `src/features/visita/validaciones.test.ts`.
- [x] Bloque 2: helper `validarTelefonoWhatsapp(telefono)` (≥7 dígitos).
  - Test(s): mismo archivo.
- [x] Bloque 3: `enviarAccionCuota` valida el monto contra `detalleCuota.saldoPendiente` (cuota) o `estadoPrestamo.saldoPendiente` (abono).
  - Test(s): `ClienteScreen.test.tsx` (abono y pago de cuota por encima del saldo no se registran).
- [x] Bloque 4: `guardarCambioCliente` valida el teléfono cuando se toca (consistencia con el alta).
  - Test(s): `ClienteScreen.test.tsx` (teléfono inválido no guarda).

## Decisiones tomadas durante la implementación
- El teléfono se valida solo si se tocó (comparando con el valor original), para no bloquear ediciones de otros campos.
- El tope del monto usa `saldoPendiente` (cuota o préstamo); `null` = sin tope. Tolerancia 0.001 por decimales.
- Defensa en profundidad: el backend sigue siendo la fuente de verdad.

## Resultado final
- Verificación: `tsc --noEmit` limpio; `ClienteScreen.test.tsx` 63/63 y `validaciones.test.ts` 13/13 verdes aislados (`--runInBand`). (La corrida completa de `check.sh` es flaky por paralelización, preexistente.)
- Archivos: `src/features/visita/validaciones.ts` (+ `.test.ts`), `src/screens/ClienteScreen.tsx` (+ test).
- Pendientes/seguimiento: `REQ-APK-018` cubierto (monto + teléfono). Falta `REQ-APK-019`.
