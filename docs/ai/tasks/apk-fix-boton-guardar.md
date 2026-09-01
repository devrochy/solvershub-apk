# Tarea: apk-fix-boton-guardar (botón Guardar visible + no ofrecer cuota ya pagada)

- **Origen:** Prueba del usuario 2026-09-01: el form de pago/no-pago se abre pero su botón "Guardar" no se ve (invisible); además la app ofrecía pagar la cuota 1 ya pagada cuando no hay cuotas pendientes (errores "La cuota ya está pagada").
- **Estado:** en progreso
- **Fecha inicio:** 2026-09-01

## Objetivo
- El botón "Guardar" (submit del form) debe ser visible en `ClienteScreen`.
- `cuotaPorPagar` no debe ofrecer una cuota ya pagada: si no hay pendiente/atrasada → `undefined` + aviso "Sin cuotas pendientes".

## Fuera de alcance
- Trayectoria GPS offline, evidencias offline.

## Bloques (checklist TDD)
- [x] Bloque 1: `botonPrimario` en `ClienteScreen` con `backgroundColor: "#2563eb"` (el botón "Guardar" del form vuelve visible).
  - Test(s): smoke (guardar-visita presente; verificado visualmente al recargar)
- [x] Bloque 2: `cuotaPorPagar` sin fallback a `cuotas[0]` → `undefined` si no hay pendiente/atrasada; guard en el envío ("Sin cuotas pendientes para este préstamo.") + aviso en la sección.
  - Test(s): `ClienteScreen.test.tsx` (+1: préstamo sin cuotas pendientes → no se envía el pago)
- [x] Bloque 3: `scripts/check.sh` verde (84 tests, 16 suites) + bundle web 200.

## Decisiones tomadas durante la implementación
- `botonPrimario` mantiene sus colores override (pago/no-pago) pero ahora tiene fondo azul por defecto.
- El guard de pago de cuota sin cuota pendiente bloquea antes de llamar a la API/enviar.

## Ambigüedades resueltas con el usuario
- Confirmado: el form se abría pero el botón "Guardar" no se veía (invisible por fondo transparente).

## Resultado final
- Comandos ejecutados para verificar: `scripts/check.sh` verde (84 tests, 16 suites); bundle web 200.
- Archivos modificados: `src/screens/ClienteScreen.tsx` (+test), `docs/ai/tasks/apk-fix-boton-guardar.md`.
- Pendientes/seguimiento: verificar en el cel tras reload que el botón Guardar se ve y que no se ofrece una cuota ya pagada.