---
estado: pendiente
tags: [requerimientos]
---

# Requerimientos — APK cobrador (`app-cobranza-apk`)

- **Origen:** `app-cobranza-admin/docs/ai/tasks/benchmark-validacion-cobraia.md` (H-20..H-30, H-46/H-47) y `docs/ai/tasks/apk-foco-cobrador.md`.
- **Estado:** pendiente (requerimientos definidos).
- **Formato:** tipo, valor, esfuerzo y prioridad (`P#`).

---

## REQ-APK-001 — Última sincronización + sincronizar manual
- **Tipo:** Mejora · **Valor:** Media · **Esfuerzo:** S · **Prioridad:** P1
- **Estado actual (validado):** sync automática al reconectar; solo badge "N sin subir"; sin fecha de última sync ni acción manual (H-20).
- **Historia:** Como cobrador quiero ver cuándo fue la última sincronización y forzarla manualmente para tener certeza de que mis cobros subieron.
- **Criterios de aceptación (Gherkin):**
  - Dado el menú/sesión, entonces se muestra "Última sincronización: <fecha hora>" (persistida en `AsyncStorage`).
  - Dado que toco "Sincronizar", entonces se procesa la cola pendiente y se actualiza el contador "N sin subir" y la fecha.
  - Dado que toco "Sincronizar general", entonces se recargan datos del servidor y se reintenta la cola.
  - Dado que un evento falla, entonces se muestra el motivo y no se borra de la cola.
- **UX:** acción con estado de carga y confirmación ("Todo sincronizado").
- **Datos/API:** usa `offline-context.sincronizar()`; persistir `ultimaSincronizacion`.
- **Trazabilidad:** RA-001 (H-20), HU-64.

## REQ-APK-002 — Cliente Cercano
- **Tipo:** Nuevo · **Valor:** Media · **Esfuerzo:** S · **Prioridad:** P2
- **Estado actual (validado):** no existe (H-21), aunque hay GPS y clientes con coordenadas.
- **Historia:** Como cobrador quiero ir al cliente más próximo a mi ubicación para optimizar el recorrido en campo.
- **Criterios de aceptación (Gherkin):**
  - Dado que tengo permisos de ubicación y clientes con coordenadas, cuando toco "Cliente Cercano", entonces se abre la tarjeta del cliente con menor distancia.
  - Dado que no hay ubicación o clientes geolocalizados, entonces se informa "No hay clientes con ubicación".
- **Datos/API:** cálculo local con las coordenadas ya disponibles en la tarjeta/día.
- **Trazabilidad:** RA-002 (H-21), HU-35.

## REQ-APK-003 — KPIs del reporte diario en la app
- **Tipo:** Mejora · **Valor:** Alto · **Esfuerzo:** M · **Prioridad:** P1
- **Estado actual (validado):** solo dentro del modal de liquidación (`estimadoACobrar`, `caja`) (H-22).
- **Historia:** Como cobrador quiero ver el resumen del día (cobrado/prestado, caja, pagaron/faltan) para cerrar mi jornada con claridad.
- **Criterios de aceptación (Gherkin):**
  - Dado el reporte/liquidación del día, entonces se muestran "Estimado a cobrar", "Total cobrado", "Total prestado", "Gastos", "Caja del día (sin gastos)", "Caja del día (con gastos aprobados)", "Pagaron N", "Faltan N de M", "Clientes sin cuentas", "Hora primera/última cuota".
  - Dado que no hay datos, entonces cada KPI muestra 0/—.
- **Datos/API:** **verificar backend** (`/cobrador/rutas/:id/dia` / liquidaciones); puede requerir campos nuevos.
- **Trazabilidad:** RA-003 (H-22), HU-18.

## REQ-APK-004 — Estadísticas por ruta en la app
- **Tipo:** Nuevo · **Valor:** Media · **Esfuerzo:** M · **Prioridad:** P3 (depende de `REQ-PANEL-001`)
- **Estado actual (validado):** no existe (H-23).
- **Historia:** Como cobrador/socio quiero ver estadísticas de mi ruta (actual vs anterior) para entender mi desempeño.
- **Criterios de aceptación (Gherkin):**
  - Dado que el backend expone `GET /rutas/:id/estadisticas`, entonces la app muestra los pares actual/anterior (atrasados, vencidos, total, no visitados).
  - Dado sin conexión, entonces se usa el último dato cacheado con aviso "sin conexión".
- **Datos/API:** reutiliza el endpoint de `REQ-PANEL-001` (**backend**).
- **Trazabilidad:** RA-004 (H-23).

## REQ-APK-005 — Consumir los flags de `ruta-config` en la UI
- **Tipo:** Mejora · **Valor:** Alto · **Esfuerzo:** M · **Prioridad:** P1
- **Estado actual (validado):** `mostrarCaja`, `mostrarCobroEstimado`, `metodosPago`, `registrarInyeccionApk` (y otros) están tipados pero **no se usan** (H-24/H-46).
- **Historia:** Como administrador quiero que lo que configuro en la ruta realmente module lo que ve el cobrador.
- **Criterios de aceptación (Gherkin):**
  - Dado `mostrarCaja=false`, entonces la app no muestra saldos de caja.
  - Dado `mostrarCobroEstimado=false`, entonces no se muestra el estimado a cobrar.
  - Dado `metodosPago=[...]`, entonces el selector de método de pago solo ofrece los permitidos.
  - Dado `registrarInyeccionApk=false`, entonces no se ofrece registrar inyección.
- **Datos/API:** la config ya llega en `mis-rutas`/día; solo consumirla.
- **Trazabilidad:** RA-005 (H-24), HU-10.

## REQ-APK-006 — Reordenamiento manual de la ruta
- **Tipo:** Nuevo · **Valor:** Baja · **Esfuerzo:** M · **Prioridad:** P4
- **Estado actual (validado):** solo trayecto óptimo automático (H-25).
- **Historia:** Como cobrador quiero reordenar manualmente las paradas cuando conozco mejor la zona.
- **Criterios de aceptación (Gherkin):**
  - Dado la lista del día, entonces puedo reordenar paradas (drag o subir/bajar) y el orden queda persistido para el día.
  - Dado que regenero el trayecto óptimo, entonces se advierte que se sobrescribirá el orden manual.
- **Datos/API:** **verificar backend** (persistir orden manual por ruta/día).
- **Trazabilidad:** RA-006 (H-25), HU-35.

## REQ-APK-007 — Cobro digital (QR / link de pago)
- **Tipo:** Nuevo · **Valor:** Media · **Esfuerzo:** L · **Prioridad:** P3 (depende de backend)
- **Estado actual (validado):** "qr" es solo una opción de método; sin generar/escaniar QR ni link (H-26).
- **Historia:** Como cobrador quiero mostrar un QR/link para que el cliente pague sin efectivo.
- **Criterios de aceptación (Gherkin):**
  - Dado que la ruta habilita pago por QR, entonces la app puede mostrar el QR del cobrador con el monto de la cuota.
  - Dado que se comparte el link, entonces se registra el pago al confirmarse en backend.
- **Datos/API:** **requiere backend** (QR del cobrador / link de pago).
- **Trazabilidad:** RA-007 (H-26), HU-15.

## REQ-APK-008 — Offline: claridad y reintento de operaciones que hoy exigen conexión
- **Tipo:** Mejora · **Valor:** Media · **Esfuerzo:** S · **Prioridad:** P3
- **Estado actual (validado):** borrar pago/abono, crear préstamo y exportar PDF requieren conexión (H-47); error de sync con banner.
- **Historia:** Como cobrador quiero entender por qué una operación no está disponible offline y poder reintentarla.
- **Criterios de aceptación (Gherkin):**
  - Dado una acción que requiere conexión, cuando estoy offline, entonces se muestra "Requiere conexión" (deshabilitada con explicación), no un error genérico.
  - Dado un fallo de sincronización, entonces puedo reintentar desde el aviso.
- **Trazabilidad:** RA-008 (H-47), HU-64.
