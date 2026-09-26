---
estado: completado
tags: [tarea, flujo-campo]
---

# Tarea: apk-b-flujo-campo (sub-tanda B de F6)

- **Origen:** backlog REQ-APK (sub-tanda B).
- **Estado:** completado (2026-09-25).
- **REQ cubiertos:** REQ-APK-002 (cliente cercano), REQ-APK-003 (KPIs del día, UI),
  REQ-APK-005 (flags), REQ-APK-014 (401 preserva), REQ-APK-017 (documento en edición).
  REQ-APK-018 ya estaba resuelto en develop.

## Qué se hizo (APK)

- **REQ-APK-002**: `features/cliente/cliente-cercano.ts` (haversine + `clienteMasCercano`)
  y botón **"Cliente cercano"** en la pantalla del día: ubicación one-shot → abre la
  tarjeta del cliente más próximo (coords que ahora envía el pack en `trayecto-diario`).
- **REQ-APK-003**: el modal de liquidación muestra los conteos del día
  (`pagaron`/`faltan`/`totalDia`/`sinCuentas`/hora primera-última) que calcula el pack.
- **REQ-APK-005**: se filtran las carteras con `ocultarCartera` en la selección. Los
  flags sin UI (`registrarInyeccionApk`, `borrarClientesSinDeuda`,
  `permitirCambioFechaPrestamo`, `bloqueoAutomaticoClientes`) quedan N/A.
- **REQ-APK-014**: `offline/borrador.ts`; ante un **401** a mitad de captura se
  persiste el borrador (cobro/abono, no-pago, gasto) y se restaura al volver a entrar.
- **REQ-APK-017**: la edición exige documento si `registroDocumentoCliente` lo pide.

## Verificación

- `npm run check` (lint + typecheck + **482 tests**) en verde. Tests nuevos:
  `cliente-cercano.test.ts`.

## Dependencia

- Stackeada sobre **F6a** (#91). El pack aporta `latitud`/`longitud` en `trayecto-diario`
  y los KPIs de la liquidación (PR de pack).
