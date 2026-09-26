---
estado: completado
tags: [tarea, dispositivo]
---

# Tarea: apk-e-autovinculacion (sub-tanda E de F6)

- **Origen:** HU-39/43 (bloqueante de producción). ADR-0068.
- **Estado:** completado (2026-09-25).

## Qué se hizo (APK)

- `expo-application`: **Android ID** como identificador de equipo (`imeiDelEquipo`);
  se persiste el **WhatsApp** de vinculación en SecureStore (`features/dispositivo`).
- **Login** (`apiLogin`) envía `imei` + `whatsapp`; `LoginResult` gana `telefono`,
  `dispositivoVinculado`, `estadoDispositivo`, `requiereVinculacion`.
- **`session-context`**: expone `requiereVinculacion` y `marcarDispositivoVinculado`;
  al loguear prellena el WhatsApp con `telefono` del gestor.
- **`VincularDispositivoScreen`**: muestra el identificador del equipo + WhatsApp
  (editable) → `POST /gestor/dispositivo` → "solicitud enviada, esperando aprobación";
  el gestor puede **continuar** (no bloqueante mientras el admin aprueba).
- **`App.tsx`**: si el gestor tiene sesión y `requiereVinculacion`, se muestra la
  pantalla de vinculación; si no, el flujo normal.

## Verificación

- `npm run check` (lint + typecheck + **488 tests**) en verde; test de `dispositivo`.

## Dependencia

- Stackeada sobre **D** (#94). El pack (ADR-0068) valida el equipo en el login y
  expone la vinculación + la aprobación.
