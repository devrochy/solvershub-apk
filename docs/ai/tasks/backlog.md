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

## Doble lenguaje visual del estado del cliente (lista del día vs otras pantallas)
- Detectado en: code-review apk-dia-ui (2026-09-07)
- Descripción: `DiaScreen` ahora usa tarjeta blanca + barra de acento + chips,
  mientras `ClientesScreen` sigue con fondo completo (`fondoDeEstado`) y
  `ClienteScreen` con punto `ColorBadge`. Los tres representan el mismo estado
  verde/rojo/blanco. Migrar a un único lenguaje visual (acento + chips) en las
  demás pantallas.
- Prioridad sugerida: baja

## Contraste de enlaces cian (#0891b2) por debajo de WCAG AA
- Detectado en: code-review apk-dia-ui (2026-09-07)
- Descripción: los enlaces/botones fantasma cian `#0891b2` a 13px/700 sobre
  blanco tienen ~3:1 de contraste (< 4.5:1 WCAG AA). Conviene oscurecer a
  `#0e7490` (cyan-700, ~4.9:1) de forma repo-wide (theme), no por pantalla.
- Prioridad sugerida: baja

## TrayectosLista replico estilos del estándar sin componer estilosHeader
- Detectado en: code-review apk-headers-estandar (2026-09-09)
- Descripción: el header del modal TrayectosLista mantiene estilos locales que
  replican padding 16/12, gap 8 y título 18 del canon `estilosHeader`, con
  overrides de color (fondo blanco). Coherente con la decisión de overlay, pero
  expuesto a drift si cambia el estándar.
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

