---
estado: en progreso
tags: [tarea]
---

# Tarea: apk-foco-cobrador (paridad del flujo cobrador vs referencia)

- **Origen:** `app-cobranza-admin/docs/ai/tasks/panel-benchmark-smart369.md` (mejora #6, esfuerzo medio).
- **Estado:** en progreso (relevamiento de la referencia **completado** 2026-09-16; implementación pendiente).
- **Fecha inicio:** 2026-09-15

## Objetivo
Relevar y cerrar brechas del **flujo del cobrador** (APK) frente a la APK de referencia **Smart 369** (`com.example.smart`, Flutter), y priorizar las mejoras por esfuerzo.

---

## 1. Ficha técnica de la APK de referencia

- **App:** Flutter (release AOT), package `com.example.smart`, **v1.2.2 (build 10)**, minSdk 24 / target 34.
- **Backend:** `API_HOST=smartadmin-app.com` (mismo backend que el panel web Yii); `.env.production/.beta/.development` embebidos.
- **Offline-first:** base local **SQLite** con sync; tablas `cliente, ruta, prestamo, cuotas, pago, abono, gasto, inyecciones, liquidada, posicion(GPS), pago_eliminado, cacheObject`; flags `sincronizado`/`eliminado` y geolocalización por registro (`lat_registro`, `lng_registro`, `fecha_registro`).
- **SDKs:** Firebase (Analytics/Performance/Crashlytics/Remote Config), Sentry, Google Maps, `geolocator`, `image_picker`, `share_plus`, `open_file`, `url_launcher`.
- **Multi-país / multi-idioma:** banderas y QR por país; i18n con selector de idioma; métodos de pago por país (Efectivo, QR, Transferencia, **YAPE** (PE), **PIX** (BR), Binance).
- **Seguridad (observaciones, no explotadas):** Google Maps API key embebida; DSN de Sentry; `.env.production` bundleado; `allowBackup=false`; `QUERY_ALL_PACKAGES`; el **login usa `FLAG_SECURE`** (bloquea capturas), el resto de pantallas no.

## 2. Inventario de pantallas y flujos (evidencia: capturas en el teléfono)

- **Login** (protegido). **Rutas** (lista de rutas del cobrador) con tabs inferiores **Contactos · Métodos de pago · Configuración**.
- **Menú lateral:** `Sincronizar`, `Sincronizar general`, `Cambiar idioma`, `Cerrar sesión`, **"Última sincronización: <fecha hora>"**, versión.
- **Menú de ruta** (grilla): `Cliente Cercano`, `Cliente Nuevo`, `Lista Clientes`, `Clientes Pendientes`, `Clientes del día`, `Ruta Manual`, `Agregar Gastos`, `Reporte diario`, `Información Ruta`, y **engranaje** con `Historial de clientes`, `Lista de cuentas`, `Notas de la ruta`, `Configuración de pago`, `Estadísticas`.
- **Lista de clientes / pendientes / ruta manual:** buscador, "Total clientes: N", filas con avatar+iniciales, ID, negocio, chip de frecuencia (`Diario`), **borde rojo para morosos**; tabs **Lista Clientes · Mapa** (Google Maps con markers).
- **Detalle de cliente:** cabecera con foto, nombre, teléfono, `Doc:`, botón **Editar**, acciones (mensaje, QR, campana); campos nombre/apellido/negocio/teléfono (WhatsApp + llamar)/dirección/fiador; tabs **Cliente · Cuentas · Ubicación · Ubicación casa**.
- **Cuentas:** `Agregar cuenta` + tarjetas (`Valor`, `Fecha`, `Deuda`, `# Cuotas`, `Retraso`, frecuencia).
- **Detalle de cuenta:** fechas inicial/final, valor, retraso, cuotas, cliente (copiar/descargar), valor cuota, deuda actual; tabs **Cuotas / Abonos**; **grilla de cuotas por color** (verde/azul/naranja/rojo); acciones Cancelar/Guardar.
- **Cliente nuevo:** foto + **cédula frontal/reverso** (carrusel) y campos obligatorios (cédula, nombre, apellido, negocio, teléfono con país, dirección…).
- **Agregar gastos:** `Gasto` + adjunto (clip) + `Descripción` + Guardar.
- **Reporte diario:** filtros `Fecha` + `base` + `Consultar` → **Estimado a cobrar**, **Caja del día (sin gastos)**, **Caja del día (gastos aprobados incluidos)**, `Total cobrado/prestado/gastos`, `Pagaron N clientes`, `Faltan N de hoy M`, `Clientes sin cuentas N`, `Hora Primera/Última Cuota`, **Ver mapa**, export.
- **Información Ruta:** caja última liquidada/actual, fecha última liquidada, cobrado/ventas/gastos, estimado, pagaron/faltan/sin cuentas, `Inyección [Ver]`, `Total cobrado día [Ver]`, comisión, cartera actual.
- **Estadísticas:** "Actualizado: <fecha hora>" y comparativos **actual vs anterior**: `Clientes atrasados`, `Clientes vencidos`, `Total clientes`, `No visitados hoy` (y más).
- **Configuración de pago:** QR de pago (Editar QR) y **PIX** (guardar).
- **Métodos de pago:** QR por país. **Contactos:** soporte/redes (WhatsApp/tel, YouTube, FB, TikTok, IG).
- **Cliente Cercano:** abre el **detalle del cliente más próximo** (GPS).

---

## 3. Matriz comparativa (Smart 369 APK ↔ nuestra APK ↔ PRD)

| # | Smart 369 (APK) | Nuestra APK | PRD | Clase |
|---|---|---|---|---|
| 1 | Estadísticas por ruta (actual vs anterior) | No | — | (i) Falta |
| 2 | Cliente Cercano (GPS) | Trayectoria/GPS, sin acceso "más cercano" | HU-35/37 | (ii) Más débil |
| 3 | Ruta Manual (reordenar/seleccionar) | Trayecto óptimo automático | HU-35/55 | (ii) Más débil |
| 4 | "Última sincronización" + Sincronizar / Sincronizar general | Cola offline; visibilidad parcial | HU-64 | (ii) Más débil |
| 5 | Reporte diario: caja sin/con gastos aprobados, hora 1ª/última cuota, "clientes sin cuentas" | Reporte/liquidación con otros KPIs | HU-18/20/49/50 | (ii) Más débil |
| 6 | Configurar QR/PIX y "Métodos de pago" por país | Métodos de pago en registro; sin QR del cobrador | HU-15; Fase 2/3 | (v) Extra |
| 7 | Multi-idioma (i18n) | Español | i18n en PRD (3.5) | (v) Extra |
| 8 | Cliente: tabs Ubicación / Ubicación casa | Negocio + domicilio (mapa) | HU-14/57 | (iv) Cubierto |
| 9 | Eliminar cuenta/depósito/pago en app | Eliminar pago/abono con permiso | HU-48 | (iv) Cubierto |
| 10 | Seguro de vida | No | No en PRD | (v) Extra — decidir |
| 11 | Grilla de cuotas por color con leyenda | Estados de cuota por color | HU-48/54 | (iv) Cubierto |

---

## 4. Sub-tareas priorizadas por esfuerzo (bajo → alto)

1. **[Bajo] `apk-sync-visibilidad`** — mostrar "Última sincronización" y acción de **Sincronizar / Sincronizar general** en el menú (si no existe).
2. **[Bajo] `apk-cliente-cercano`** — acceso rápido al **cliente más próximo** por GPS.
3. **[Bajo-Medio] `apk-reporte-diario-kpis`** — añadir KPIs faltantes del reporte diario (caja sin/con gastos aprobados, hora 1ª/última cuota, "clientes sin cuentas", estimado a cobrar).
4. **[Medio] `apk-estadisticas-ruta`** — vista de estadísticas por ruta (actual vs anterior) consumiendo el endpoint del benchmark de panel (`panel-estadisticas-ruta`).
5. **[Medio] `apk-metodos-pago-qr`** — cobro digital: QR por país / PIX-YAPE del cobrador (depende de backend).
6. **[Medio] `apk-ruta-manual`** — reordenar/seleccionar paradas manualmente (alternativa al trayecto óptimo).
7. **[Alto] `apk-i18n`** — internacionalización (si el negocio la requiere).

## 5. Propuestas a decidir (extras de la referencia)
- **Seguro de vida** (ver `panel-benchmark-smart369.md`).
- **Métodos de pago regionales** (PIX/YAPE/Binance) y **QR del cobrador**.
- **Multi-idioma**.

## Dependencias / riesgos
- El backend es `smartadmin-app.com` (Yii); para replicar KPIs puede requerirse endpoint nuevo en `app-cobranza` (coordinar).
- No copiar antipatrones de seguridad: la referencia embebe API key, DSN y `.env`.
- El login de la referencia usa `FLAG_SECURE`; el barrido dinámico se hizo con capturas (el login no se capturó).

## Bloques (checklist)
- [x] Bloque 0: relevamiento estático (ficha técnica) y dinámico (pantallas) de la APK de referencia.
- [x] Bloque 1: matriz de brechas y sub-tareas priorizadas por esfuerzo.
- [ ] Bloque 2: implementar sub-tareas priorizadas (una por una, TDD).
- [ ] Bloque 3: tests de pantalla/hook por sub-tarea.

## Resultado final (parcial)
- Ficha técnica, inventario de pantallas y matriz de brechas completados (2026-09-16).
- 7 sub-tareas priorizadas por esfuerzo; 3 propuestas a decidir.
- Pendiente: implementación (Bloque 2-3).
