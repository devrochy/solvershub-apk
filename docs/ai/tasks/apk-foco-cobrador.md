---
estado: en progreso
tags: [tarea]
---

# Tarea: apk-foco-cobrador (paridad del flujo cobrador vs referencia)

- **Origen:** `app-cobranza-admin/docs/ai/tasks/panel-benchmark-smart369.md` (mejora #6, esfuerzo medio).
- **Estado:** en progreso (relevamiento **completado** 2026-09-16; implementación pendiente).
- **Fecha inicio:** 2026-09-15

## Objetivo
Relevar y cerrar brechas del **flujo del cobrador** (APK) frente a la APK de referencia **Smart 369** (`com.example.smart`, Flutter).

---

## 1. Ficha técnica de la APK de referencia
- Flutter (release AOT), package `com.example.smart`, **v1.2.2 (build 10)**, minSdk 24 / target 34.
- Backend: `API_HOST=smartadmin-app.com` (mismo Yii que el panel web).
- **Offline-first** con SQLite (`cliente, ruta, prestamo, cuotas, pago, abono, gasto, inyecciones, liquidada, posicion(GPS), pago_eliminado, cacheObject`), flags `sincronizado`/`eliminado` y geo por registro.
- SDKs: Firebase, Sentry, Google Maps, `geolocator`, `image_picker`, `share_plus`, `open_file`, `url_launcher`.
- Multi-país / multi-idioma; métodos de pago por país (Efectivo, QR, Transferencia, **YAPE**, **PIX**, Binance).
- Seguridad (observaciones): Maps API key y DSN embebidos, `.env.production` bundleado; **login con `FLAG_SECURE`** (resto de pantallas no).

## 2. Inventario de pantallas (relevado)
Menú lateral (**Sincronizar / Sincronizar general / Cambiar idioma / Cerrar sesión / Última sincronización**); menú de ruta (**Cliente Cercano, Cliente Nuevo, Lista Clientes, Clientes Pendientes, Clientes del día, Ruta Manual, Agregar Gastos, Reporte diario, Información Ruta**, y engranaje con **Historial de clientes, Lista de cuentas, Notas, Configuración de pago, Estadísticas**); cadena de cliente (**detalle → Cuentas → detalle de cuenta con Cuotas/Abonos y grilla por color**); **Mapa** (Google Maps con markers); **Reporte diario** (Estimado, Caja sin/con gastos, Hora 1ª/última cuota, Ver mapa); **Información Ruta** (caja, cobrado/ventas/gastos, comisión, cartera); **Estadísticas** (actual vs anterior); **Configuración de pago** (QR/PIX); tabs inferiores **Contactos / Métodos de pago / Configuración**.

## 3. Matriz de brechas (resumen)
`Estadísticas por ruta` (falta) · `Cliente Cercano` (más débil) · `Ruta Manual` (más débil) · `Última sincronización/Sincronizar` (más débil) · `KPIs de reporte diario` (más débil) · `QR/PIX y métodos de pago` (extra) · `i18n` (extra) · `Ubicación/Ubicación casa`, `eliminar cuenta/depósito/pago`, `grilla de cuotas` (cubiertos).

---

## 4. Bloques (items verificables, TDD)

> Cada item es una unidad TDD independiente; se marca al completar y debe dejar `scripts/check.sh` en verde (aislando la flakiness conocida).

### Tema A — Visibilidad de sincronización
- [ ] A1: mostrar **"Última sincronización: <fecha hora>"** en el menú.
  - Prueba: test del componente del menú (`src/navigation`/`src/components`) — renderiza el timestamp formateado.
- [ ] A2: acción **Sincronizar** manual (fuerza el envío de la cola pendiente).
  - Prueba: test del hook/contexto offline — dispara `sincronizar()` y refleja resultado.
- [ ] A3: acción **Sincronizar general** (recarga completa).
  - Prueba: test del contexto offline — dispara el resync completo.

### Tema B — Cliente Cercano
- [ ] B1: acción **"Cliente Cercano"** que abre el detalle del cliente más próximo por GPS.
  - Prueba: test de la pantalla de ruta/selección — con dos clientes y posición actual, navega al más cercano.

### Tema C — KPIs del reporte diario
- [ ] C1: KPI **Estimado a cobrar**.
  - Prueba: test de la pantalla de reporte.
- [ ] C2: KPI **Caja del día (sin gastos)**.
  - Prueba: test de la pantalla de reporte.
- [ ] C3: KPI **Caja del día (gastos aprobados incluidos)**.
  - Prueba: test de la pantalla de reporte.
- [ ] C4: **Hora primera cuota** y **Hora última cuota**.
  - Prueba: test de la pantalla de reporte.
- [ ] C5: contadores **Pagaron N / Faltan N de M / Clientes sin cuentas N**.
  - Prueba: test de la pantalla de reporte.

### Tema D — Estadísticas por ruta
- [ ] D0 (bloqueante): verificar el endpoint de estadísticas (coordinar con `panel-estadisticas-ruta`).
  - Prueba: contrato escrito en este doc.
- [ ] D1: pantalla de **Estadísticas** con pares **actual vs anterior** (atrasados, vencidos, total, no visitados).
  - Prueba: test de pantalla — renderiza los 4 pares.

### Tema E — Métodos de pago / QR
- [ ] E1: pantalla **Métodos de pago** con **QR por país** (solo lectura).
  - Prueba: test de pantalla — lista las banderas/QR.
- [ ] E2 (depende backend): **cobro con QR/PIX** del cobrador.
  - Prueba: test del flujo — genera/muestra el QR con el monto.

### Tema F — Ruta Manual
- [ ] F1: **Ruta Manual** permite reordenar/seleccionar paradas.
  - Prueba: test de pantalla — reordenar actualiza el orden persistido en el día.

### Tema G — i18n (si el negocio lo requiere)
- [ ] G1: **selector de idioma** + extracción de strings base.
  - Prueba: test — cambia el idioma y los labels base cambian.

## 5. Propuestas a decidir
- Seguro de vida · PIX/YAPE/Binance · multi-idioma (Tema G).

## Requerimientos
- Requerimientos detallados derivados: `docs/ai/tasks/requerimientos-apk.md` (`REQ-APK-001..008`) y `app-cobranza-admin/docs/ai/tasks/requerimientos-transversal.md` (i18n, estados).
- Validación contra CobraIA: `app-cobranza-admin/docs/ai/tasks/benchmark-validacion-cobraia.md`.

## Dependencias / riesgos
- El backend es `smartadmin-app.com` (Yii); replicar KPIs puede requerir endpoint en `app-cobranza`.
- No copiar antipatrones de seguridad de la referencia.
- Flakiness preexistente de `check.sh` (paralelización): verificar cada item aislando su suite.

## Resultado final (parcial)
- Ficha técnica, inventario y matriz de brechas completados; 15 items verificables definidos.
- Pendiente: Temas A-G (implementación).
