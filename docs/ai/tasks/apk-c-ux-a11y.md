---
estado: completado
tags: [tarea, ux, a11y, seguridad]
---

# Tarea: apk-c-ux-a11y (sub-tanda C de F6)

- **Origen:** backlog REQ-APK (sub-tanda C).
- **Estado:** completado (2026-09-25).
- **REQ cubiertos:** REQ-APK-013 (GPS/AppState), REQ-APK-016 (permisos → Ajustes),
  REQ-APK-019 (UX móvil), REQ-APK-020 (accesibilidad), REQ-APK-021 (estado local).

## Qué se hizo

- **REQ-APK-013**: `usePosicion` pide el permiso **una vez** por sesión y **pausa el
  polling en background** (batería); `useTrayectoria` cachea el permiso y
  **pausa/reanuda** la captura GPS según `AppState` (con reanudación al volver).
- **REQ-APK-016**: helper `features/permisos/permisos.ts` (`ofrecerAbrirAjustes`);
  si un permiso quedó bloqueado (`canAskAgain === false`) se ofrece **Abrir Ajustes**
  desde los hooks de evidencias (cámara/librería).
- **REQ-APK-019**: `ModalConFooter` ya tenía `ScrollView` + `KeyboardAvoidingView`; se
  subió el **tap target** del botón cerrar a 44×44 y del botón de menú a ≥44; el
  modal usa `keyboardShouldPersistTaps`. (Feedback de refresh y etiqueta de estatus ya
  existían: `etiquetaEstatus`.)
- **REQ-APK-020**: `accessibilityRole="button"` + `accessibilityLabel` en el cierre de
  `ModalConFooter` y del selector de país; se verificó el resto de botones de ícono
  (menú, notificaciones, overlay) que ya los tenían.
- **REQ-APK-021**: la **cartera activa se persiste** (AsyncStorage) y se **restaura**
  al reiniciar.

## Verificación

- `npm run check` (lint + typecheck + **485 tests**) en verde. Tests nuevos:
  `permisos.test.ts`.

## Pendiente (no bloqueante, misma sub-tanda)

- **REQ-APK-021**: cifrado en reposo de la cola/cache (requiere definir la clave en
  `expo-secure-store`) y deep links (p. ej. abrir un cliente). Quedan como ítem aparte.
