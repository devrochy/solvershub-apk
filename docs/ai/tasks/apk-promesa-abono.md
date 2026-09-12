---
estado: completada
tags: [tarea]
---

# Tarea: apk-promesa-abono (promesa de pago + abono parcial)

- **Origen:** Fase A del plan de la APK (A4 + A5) aprobado por el usuario 2026-09-01. La visita no-pago hoy solo manda el motivo; el pago solo de cuota completa.
- **Estado:** completada
- **Fecha inicio:** 2026-09-01

## Objetivo
- A4: en la visita **no-pago**, registrar también la promesa de pago (`fechaPrometida` YYYY-MM-DD + `valorPrometido`).
- A5: en el registro de pago, permitir **abono parcial** (`tipoPago: "abono"`, sin `cuotaId`) además del pago de cuota.

## Fuera de alcance
- Date picker nativo (se usa input de texto con validación; candidato a mejorar).
- Cálculo automático de cuota por pagar según abonos.

## Bloques (checklist TDD)
- [x] Bloque 1: `validaciones.ts` (`src/features/visita/validaciones.ts`) — `validarFechaPrometida` (YYYY-MM-DD válida y no en el pasado) y `validarMonto`.
  - Test(s): `src/features/visita/validaciones.test.ts` (7)
- [x] Bloque 2: ClienteScreen — formulario no-pago con `fechaPrometida` + `valorPrometido` (validados) y envío en la visita; formulario pago con selector cuota/abono (abono sin cuotaId).
  - Test(s): `src/screens/ClienteScreen.test.tsx` (2)
- [x] Bloque 3: `scripts/check.sh` verde (45 tests, 8 suites) + bundle web 200.

## Decisiones tomadas durante la implementación
- Fecha como input de texto `YYYY-MM-DD` (cross-platform; funciona en web y Expo Go).
- `tipoPago: "abono"` no requiere `cuotaId`; se envía `prestamoId` + `valor` + `metodoPago`.

## Ambigüedades resueltas con el usuario
- Pregunta: ¿arrancar A2+A3? → "arranquemos como dices" (A4+A5 tras A3).

## Resultado final
- Comandos ejecutados para verificar: `scripts/check.sh` verde (lint + typecheck + 45 tests, 8 suites); bundle web 200.
- Archivos modificados: `src/features/visita/validaciones.ts` (+test, 7), `src/screens/ClienteScreen.tsx` (tipo cuota/abono + promesa), `src/screens/ClienteScreen.test.tsx` (2), `docs/ai/tasks/apk-promesa-abono.md`.
- Pendientes/seguimiento: A6 UX (pull-to-refresh, estados).