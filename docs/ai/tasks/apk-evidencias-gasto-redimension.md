---
estado: completada
tags: [tarea]
---

# Tarea: redimensionar evidencias de gasto (APK)

- **Origen:** `docs/ai/tasks/requerimientos-apk.md` → `REQ-APK-009` (hallazgos H-66/H-67; quick win del plan de benchmark).
- **Estado:** completada
- **Fecha inicio:** 2026-09-16

## Objetivo
Que las evidencias de gasto se reduzcan/compriman (como las del cliente) antes de subirse o encolarse, y que un rechazo por tamaño (413) muestre un mensaje claro.

## Fuera de alcance
- Límite de tamaño de la cola offline y su serialización (parte restante de `REQ-APK-009`).
- Cambios de backend.

## Bloques (checklist TDD)
- [x] Bloque 1: helper compartido `reducirImagen` (1280px/JPEG 0.7, base64 opcional, fallback).
  - Test(s): `src/features/evidencias/reducir-imagen.test.ts` (4).
- [x] Bloque 2: `use-evidencias-cliente` reutiliza el helper compartido (sin cambiar su API).
  - Test(s): `use-evidencias-cliente.test.ts` (5, siguen verdes).
- [x] Bloque 3: `use-evidencias` (gastos) reduce cada evidencia y usa la base64 reducida.
  - Test(s): `use-evidencias.test.ts` (actualizado: resize + base64 + fallback).
- [x] Bloque 4: `DiaScreen` maneja `413` con mensaje claro.
  - Test(s): `DiaScreen.test.tsx` (test de 413).

## Decisiones tomadas durante la implementación
- Se extrajo `src/features/evidencias/reducir-imagen.ts` para no duplicar la lógica del cliente.
- La base64 se obtiene del resize (`manipulateAsync` con `base64:true`); si falla, se conserva la del asset.
- El picker de gastos ya no pide `base64` (se obtiene tras reducir), evitando cargar la foto original completa.

## Resultado final
- Verificación: suites afectadas verdes aisladas (`--runInBand`, 120 tests) y `tsc --noEmit` limpio. La corrida completa de `check.sh` mostró 7 fallos por **flakiness conocida** de tests de pantalla (RutaDetalle/Clientes/Cliente/DiaScreen), que pasan aisladas.
- Archivos: `src/features/evidencias/reducir-imagen.ts` (+ `.test.ts`), `src/features/cliente/use-evidencias-cliente.ts`, `src/features/gastos/use-evidencias.ts` (+ `.test.ts`), `src/screens/DiaScreen.tsx` (+ test).
- Pendientes/seguimiento: tope/compresión de la cola offline (`REQ-APK-009`, resto).
