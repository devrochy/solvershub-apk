# Backlog — APK del cobrador (app-cobranza-apk)

Ítems de seguimiento detectados durante la implementación (no se resuelven en el mismo cambio).

## Seguridad — JWT en localStorage (web)
- Detectado en: revisión code-reviewer Fase A (2026-09-01)
- Descripción: en la build web el access token vive en `localStorage` (expuesto a XSS), a diferencia del panel (cookie httpOnly). Necesario porque `expo-secure-store` no existe en web. Mitigaciones a evaluar en Fase C (empaquetado/seguridad): expiración corta, purga en logout, posible `expo-crypto`/memoria.
- Prioridad sugerida: media

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
- Descripción: el gasto offline encola solo `{ descripcion, valor }` sin evidencias (el online envía FormData con fotos). Decisión: el backend `AplicarEventosOfflineService` acepta gasto sin evidencias, pero para no perderlas habría que encolar las fotos (base64) en el payload del evento `gasto` y que el procesador las persista. Pendiente de evaluar.
- Prioridad sugerida: media

## Device key inválida deja la cola atascada sin feedback
- Detectado en: revisión code-reviewer apk-offline-first (2026-09-01)
- Descripción: `sincronizar().catch(() => undefined)` silencia cualquier fallo (incluido 401 por device key inválida o `EXPO_PUBLIC_DEVICE_KEY` vacío); los eventos quedan en la cola sin avisar al usuario. Evaluar exponer estado de error de sync.
- Prioridad sugerida: baja