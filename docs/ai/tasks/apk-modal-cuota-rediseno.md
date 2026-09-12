---
estado: completada
tags: [tarea]
---

# apk-modal-cuota-rediseno

- **Rama:** `feature/apk-modal-cuota-rediseno` (desde `develop`)
- **Estado:** completada
- **Dependencias:** backend `apk-pago-liquidado` (pagos[].liquidado, abonos[])
- **Alcance (TDD):** rediseñar la modal de detalle de cuota para registrar
  pago/abono y no pago dentro de ella, y borrar pagos/abonos no liquidados.

## Objetivo

La modal de cuota del detalle de cliente pasa a ser la única vía de registrar
pago/abono y no pago (se eliminan los botones del detalle del préstamo).
Detalle con scroll, formularios desplegables en la misma modal y borrado de
pagos/abonos no liquidados.

## Cambios (`src/screens/ClienteScreen.tsx` + `src/api/cobrador.ts` + tipos)

- Tipos `DetalleCuotaPublic`: `pagos[].liquidado` y `abonos[]` (nuevo contrato).
- `api.eliminarPago(rutaId, pagoId, { password, motivo })` → `DELETE /pagos/:id`.
- Modal de cuota:
  - Contenido en `ScrollView`; acciones en la parte inferior ("Registrar pago"
    y "No pago") solo si la cuota NO está paga (`pendiente`/`atrasada`).
  - Al tocar una acción, el formulario se despliega dentro de la misma modal
    (pago con toggle pago de cuota/abono parcial; no pago con motivo/fecha
    prometida). Guardado vía `registrarVisitaPago/NoPago` + cola offline.
  - Lista de pagos y abonos con botón de borrar (password + motivo) solo si
    `!liquidado` y el permiso de la ruta lo permite (`eliminarPagosApk` /
    `eliminarAbonosApk`).
  - Se eliminan los modales independientes `pago`/`no_pago` y sus estados.

## Definición de Terminado
- `scripts/check.sh` APK verde.
- Tests `ClienteScreen.test.tsx` actualizados + nuevos (registrar abono/no pago,
  dedupe offline, cuota pagada sin acciones, borrar pago no liquidado, pago
  liquidado sin borrar).
- Commit convencional + PR a `develop` (CI verde).

## Resultado real
- Tipos de `DetalleCuotaPublic` alineados al backend: `pagos[].liquidado` + `abonos[]`.
- `api.eliminarPago` nuevo.
- Modal de cuota rediseñada: ScrollView, acciones inferiores (solo cuota no
  paga), formularios pago/abono y no pago desplegables en la misma modal,
  borrado de pago/abono no liquidado (password+motivo, gateado por permisos).
- Se eliminaron los modales independientes pago/no_pago y los botones del
  detalle del préstamo.
- Code-review: se recarga `estadoPrestamo` tras mutaciones (canvas no stale);
  paneles accionCuota/borrar excluyentes; error de red en borrado; sección
  "Abonos del préstamo"; helper `esPendienteOAtrasada` reutilizado.
- Tests: `ClienteScreen.test.tsx` (52→56) con borrar abono y 400 del backend.
  `scripts/check.sh` APK verde (283 tests).
- Backlog backend: `eliminarAbono` no valida `liquidado` (gap registrado).