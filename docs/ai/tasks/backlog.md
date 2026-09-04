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
## Modal de evidencias duplicado en ClienteScreen
- Detectado en: tarea apk-pr1-rediseno-detalle-cliente (2026-09-03)
- Descripción: los modales de avatar (foto) y documento comparten el mismo cuerpo (preview + botones librería/cámara + estados). Candidato a extraer un componente `EvidenciasModal` reutilizable.
- Prioridad sugerida: baja

## Edición de ruta desde la APK (solo lectura en B3)
- Detectado en: rediseño B3 (2026-09-03)
- Descripción: el detalle de ruta (`RutaDetalleScreen`) muestra el botón "Editar" pero es **solo lectura** (avisa "La edición de ruta se realiza desde el panel"); el permiso `actualizar_ruta` del cobrador aún no se expone en la APK. Habilitar la edición real cuando el rol del cobrador lo permita.
- Prioridad sugerida: media

## Cálculo de "en mora" duplicado (RutasScreen + RutaDetalleScreen)
- Detectado en: code-review PR2 rediseño rutas-dia (2026-09-03)
- Descripción: el conteo `clientes.filter(c => c.color === "rojo")` se repite en `RutasScreen` (KPIs de dashboard) y `RutaDetalleScreen` (KPI en mora). Candidato a un helper `contarEnMora(clientes)` compartido.
- Prioridad sugerida: baja

## Mapa "Cómo llegar" no refleja la nueva ubicación tras guardar (N6)
- Detectado en: code-review apk-navegacion-ruta-rediseno (2026-09-03)
- Descripción: tras guardar la ubicación (PATCH actualizarCliente), `ClienteTarjetaPublic` no expone lat/lng, así que el mapa "Cómo llegar" del detalle sigue usando las props fijas al abrir el overlay. Candidato a exponer latitud/longitud/latitudDomicilio en la tarjeta del backend (PR #91) para refrescar el pin.
- Prioridad sugerida: media

## SeleccionRutaScreen dispara 2 requests por ruta al montar
- Detectado en: code-review apk-navegacion-ruta-rediseno (2026-09-03)
- Descripción: con N rutas son 2N llamadas en paralelo (clientes + día por ruta). Aceptable hoy por la decisión de "solo datos existentes"; revisar si crece el número de rutas.
- Prioridad sugerida: baja

## inicialesDe en Avatar.tsx (código muerto)
- Detectado en: code-review fix 413/avatar (2026-09-04)
- Descripción: `inicialesDe` está exportada y testeada pero ningún componente la usa (el Avatar renderiza el icono person). Eliminar o reutilizar en el backlog.
- Prioridad sugerida: baja

## Doble capa de permisos en liquidación del día (APK)
- Detectado en: code-review apk-liquidacion-dia (2026-09-04)
- Descripción: la APK gatea el botón con `config.generarReportesApk`, pero el
  backend exige además el permiso `generar_reporte` de la matriz del cobrador.
  Si el permiso falta, el botón se muestra y el backend responde 403. Mejor
  gatear también por `rutaActiva.permisos` (requiere exponer permisos en el
  contexto RutaActiva). Prioridad: baja.
