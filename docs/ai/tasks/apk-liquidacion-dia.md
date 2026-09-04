# apk-liquidacion-dia

- **Rama:** `feature/apk-liquidacion-dia` (desde `develop`)
- **Estado:** en progreso
- **Dependencias:** backend `backend-liquidacion-cobrador` (endpoints cobrador + PDF + visitaRegistrada)
- **Alcance (TDD):** generar la liquidación del día desde la pestaña "Día",
  ver el detalle de pagos/abonos y descargar el resumen en PDF.

## Objetivo

En el menú del día aparece "Liquidación del día", habilitada solo cuando todos
los clientes del día tienen `visitaRegistrada`. Abre una modal a pantalla
completa con el resumen (totales + comisión), el detalle de pagos/abonos del
día, botones "Generar liquidación" (POST) y "Descargar PDF" (bytes → archivo →
compartir).

## Cambios

- `src/types/cobrador.ts`: `LiquidacionPublic` + `ItemLiquidacionDetalle`.
- `src/api/client.ts`: `requestBytes(path)` para descargar el PDF (arrayBuffer).
- `src/api/cobrador.ts`: `generarLiquidacion`, `listarLiquidaciones`,
  `exportarLiquidacionPdf` (bytes).
- `src/screens/DiaScreen.tsx`:
  - Botón "Liquidación del día" (gate `generarReportesApk`; habilitado si
    `clientes.length > 0 && clientes.every(c => c.visitaRegistrada)`).
  - Modal a pantalla completa con resumen + detalle, "Generar" y "Descargar
    PDF" (expo-file-system + expo-sharing).

## Definición de Terminado
- `scripts/check.sh` APK verde (+ tests de DiaScreen y de los nuevos métodos api).
- Commit convencional + PR a `develop` (CI verde).

## Resultado real
- `requestBytes` en `ApiClient` (auth compartida + retry 401).
- `api.generarLiquidacion`, `listarLiquidaciones`, `exportarLiquidacionPdf`.
- `DiaScreen`: botón "Liquidación del día" (gate `generarReportesApk`,
  habilitado si todos los clientes del día tienen `visitaRegistrada`); modal a
  pantalla completa con resumen + detalle de pagos/abonos, "Generar
  liquidación" (POST) y "Descargar PDF" (bytes → archivo → compartir).
- `abrirLiquidacion` usa fecha local (no UTC) y solo toma la de hoy; 401 →
  logout; mensajes de éxito en verde.
- Code-review: `listar` del backend ahora incluye detalle (PR #96), y
  `visitaRegistrada` cuenta pago/abono o no pago (commit en ese PR).
- Tests: `client.test.ts` (requestBytes x5), `cobrador.test.ts` (x3),
  `DiaScreen.test.tsx` (liquidación x4). `scripts/check.sh` APK verde (295).
- Backlog: doble capa de permisos `generar_reporte` (APK).