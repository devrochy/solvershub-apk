# Backlog — APK del cobrador (app-cobranza-apk)

Ítems de seguimiento detectados durante la implementación (no se resuelven en el mismo cambio).

## Seguridad — JWT en localStorage (web)
- Detectado en: revisión code-reviewer Fase A (2026-09-01)
- **Resuelto en `apk-seguridad-jwt-web` (2026-09-01):** en la build web los tokens (access + refresh) y el perfil viven SOLO en memoria (`Map` de módulo vía `Platform.OS === "web"`); se eliminó el fallback a `localStorage` (exfiltrable por XSS). Tradeoff aceptado por el usuario: al recargar la página en web hay que volver a iniciar sesión. La build nativa (APK) sigue usando `expo-secure-store` sin cambios.

## Tests de integración de pantalla (gasto multipart + GPS desde DiaScreen)
- Detectado en: revisión code-reviewer Fase A (2026-09-01)
- Descripción: `DiaScreen` no tiene test de integración (envío del gasto con evidencias multipart y el flujo del botón GPS, incl. aviso <2 puntos). Los hooks/componentes sí están cubiertos; el wiring de pantalla no.
- Prioridad sugerida: baja

## Fecha prometida con date picker nativo
- Detectado en: tarea apk-promesa-abono (2026-09-01)
- Descripción: la fecha se ingresa como texto `YYYY-MM-DD` (cross-platform). Candidato a `@react-native-community/datetimepicker` (con shim web) para mejor UX.
- Prioridad sugerida: baja

## Evidencias de gasto se pierden en modo offline
- Detectado en: revisión code-reviewer apk-offline-first (2026-09-01)
- **Resuelto en `apk-evidencias-offline` (2026-09-02):** el gasto offline encola las fotos en base64 en el payload del evento `gasto` (`{descripcion, valor, evidencias:[{nombre, mimetype, base64}]}`); el backend las persiste vía `EvidenciasOfflineService` al sincronizar.

## Cambio de cliente offline (HU-47)
- Detectado en: tareas apk-offline-first / apk-cache-offline (2026-09-01)
- **Resuelto en `apk-cambio-cliente-offline` (2026-09-02):** UI de edición de cliente en `ClienteScreen` (nombre, negocio, WhatsApp) que encola `cambio_cliente` (`{clienteId, input}`) con dedupe por cliente. El backend aplica directo si el cobrador tiene `actualizar_cliente`, o crea propuesta.

## Device key inválida deja la cola atascada sin feedback
- Detectado en: revisión code-reviewer apk-offline-first (2026-09-01)
- **Resuelto en `apk-feedback-device-key` (2026-09-02):** `OfflineProvider` expone `errorSync` (se setea al fallar el sync, se limpia al éxito) y `RutasScreen` muestra el aviso. La cola no se vacía ante fallo (se conserva para reintento).