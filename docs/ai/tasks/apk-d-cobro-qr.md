---
estado: completado
tags: [tarea, pagos]
---

# Tarea: apk-d-cobro-qr (sub-tanda D de F6)

- **Origen:** REQ-APK-007 (cobro digital con QR/link). ADR-0067.
- **Estado:** completado (2026-09-25).

## Qué se hizo (APK)

- Tipos: `CarteraApkPublic.pagoQrActivo` y `LinkPagoCobro`
  (`modo online|informativo`, `monto`, `url`, `qrPng`, datos de cuenta informativa).
- API: `crearLinkPago(carteraId, cuotaId)` → `POST /gestor/carteras/{id}/cuotas/{cid}/link-pago`.
- UI (`ClienteScreen`): acción **"Cobro con QR"** en el detalle de la cuota (gated por
  `pagoQrActivo`) → modal con el **QR (PNG)** y, según el modo:
  - **online**: la URL del link + **Compartir** (share nativo).
  - **informativo**: titular, banco, tipo/número de cuenta y alias + QR.

## Verificación

- `npm run check` (lint + typecheck + **486 tests**) en verde; test de
  `crearLinkPago` en `api/gestor.test.ts`.

## Dependencia

- Stackeada sobre **C** (#93). El pack (ADR-0067) aporta el endpoint, el QR PNG y la
  confirmación por EventBus (con `pack_payments`) o la cuenta informativa.
