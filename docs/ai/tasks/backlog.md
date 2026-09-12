# Backlog — APK del cobrador (app-cobranza-apk)

Ítems de seguimiento detectados durante la implementación (no se resuelven en el mismo cambio).

## Tests de integración de pantalla (gasto multipart + GPS desde DiaScreen)
- Detectado en: revisión code-reviewer Fase A (2026-09-01)
- Descripción: `DiaScreen` no tiene test de integración (envío del gasto con evidencias multipart y el flujo del botón GPS, incl. aviso <2 puntos). Los hooks/componentes sí están cubiertos; el wiring de pantalla no.
- Prioridad sugerida: baja

## Fecha prometida con date picker nativo
- Detectado en: tarea apk-promesa-abono (2026-09-01)
- Descripción: la fecha se ingresa como texto `YYYY-MM-DD` (cross-platform). Candidato a `@react-native-community/datetimepicker` (con shim web) para mejor UX.
- Prioridad sugerida: baja

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

## Vinculación autoservicio del dispositivo desde la APK (HU-39/43) — Opción 2b
- Detectado en: decisión de diseño Épica 8 APK (2026-09-11)
- Descripción: la APK vincula su propio device tras el primer login (Android ID
  automático + WhatsApp del perfil + clave X25519) y el admin lo aprueba (el
  device queda en `pendiente_revalidacion`). En el MVP se decidió **no**
  implementar el envío en el login (Opción 1) ni el autoservicio, para poder
  probar con cualquier cobrador sin piezas adicionales.
- Detalle del plan: `apk-autovinculacion-dispositivo.md`.
- Prioridad sugerida: media (post-MVP)

---

## Resueltos (historial)

- **JWT en localStorage (web)** → `apk-seguridad-jwt-web`: tokens y perfil en memoria (`Map`) en web; `expo-secure-store` en nativo.
- **Evidencias de gasto en offline** → `apk-evidencias-offline`: fotos en base64 en el payload del evento `gasto`, persistidas por `EvidenciasOfflineService` al sincronizar.
- **Cambio de cliente offline (HU-47)** → `apk-cambio-cliente-offline`: UI de edición que encola `cambio_cliente` con dedupe por cliente.
- **Device key inválida deja la cola atascada** → `apk-feedback-device-key`: `OfflineProvider.errorSync` + aviso en `RutasScreen`; la cola no se vacía ante fallo.
- **Doble lenguaje visual del estado del cliente** → `p2-ux-visual`: `ClientesScreen` pasa de fondo pastel completo a tarjeta blanca + barra de acento + sombra (mismo lenguaje que `DiaScreen`).
- **Contraste de enlaces cian** → `p2-ux-visual`: `#0891b2` → `#0e7490` (cyan-700, ~4.9:1) en todo `src/`.
- **`inicialesDe` código muerto** → `p2-polish`: eliminado de `Avatar.tsx` (y su test).
- **Doble capa de permisos en liquidación** → `p2-polish`: `RutaActiva` expone `permisos` y `DiaScreen` gatea el botón por `generar_reporte` además del flag de ruta.
- **`TrayectosLista` con estilos locales** → ya usaba `estilosHeader` (resuelto en `apk-headers-estandar`); se cierra el ítem.

