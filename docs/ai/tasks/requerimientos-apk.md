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

---

## REQ-APK-009 — Cola offline acotada y evidencias redimensionadas
- **Tipo:** Mejora · **Valor:** Alto · **Esfuerzo:** M · **Prioridad:** P1
- **Estado actual (validado):** cola sin límite y re-serialización O(n); evidencias de gasto en base64 sin redimensionar → riesgo de 6MB/413 (H-66, H-67, H-89).
- **Historia:** Como cobrador quiero que mi cola offline no se corrompa ni pierda evidencias.
- **Criterios de aceptación (Gherkin):**
  - Dado un gasto con fotos, entonces se redimensionan/comprimen (reusar manipulador de cliente) y se maneja 413 con mensaje claro.
  - Dado que la cola supera un umbral, entonces se avisa/bloquea el encolado (no se pierde silenciosamente).
  - Dado evidencia de cliente: puede encolarse o, si no, al cerrar el modal se conserva hasta subir.
- **Datos/API:** local (AsyncStorage) + `features/gastos/use-evidencias.ts`.
- **Trazabilidad:** RA-009 (H-66/H-67/H-89).

## REQ-APK-010 — Sync: exponer errores por evento y reintentar
- **Tipo:** Mejora · **Valor:** Medio · **Esfuerzo:** M · **Prioridad:** P2
- **Estado actual (validado):** se descartan los `ack.error`; un evento en error bloquea la cola (H-68).
- **Criterios de aceptación (Gherkin):**
  - Dado un evento rechazado, entonces se marca y se explica cuál/por qué, sin bloquear el resto.
  - Dado el aviso, puedo reintentar o descartar el evento.
- **Datos/API:** **verificar contrato** `POST /sync-offline/eventos` (ack por evento).
- **Trazabilidad:** RA-010 (H-68).

## REQ-APK-011 — Resolución de conflictos en edición offline
- **Tipo:** Mejora · **Valor:** Medio · **Esfuerzo:** M · **Prioridad:** P3
- **Estado actual (validado):** la 2ª edición offline del mismo cliente se descarta por dedupe (H-69).
- **Criterios de aceptación (Gherkin):**
  - Dado que edito dos veces al mismo cliente sin conexión, entonces los cambios se fusionan o se avisa del conflicto (no se pierde el 2º).
- **Trazabilidad:** RA-011 (H-69).

## REQ-APK-012 — Persistir la trayectoria en curso
- **Tipo:** Mejora · **Valor:** Alto · **Esfuerzo:** M · **Prioridad:** P1
- **Estado actual (validado):** los puntos viven en memoria; se pierden al reiniciar (H-72).
- **Criterios de aceptación (Gherkin):**
  - Dado reiniciar/cierre de la app a mitad de ruta, al reabrir se recuperan los puntos grabados y se puede continuar.
- **Trazabilidad:** RA-012 (H-72).

## REQ-APK-013 — GPS: foreground/background, batería y AppState
- **Tipo:** Mejora · **Valor:** Medio · **Esfuerzo:** M · **Prioridad:** P3
- **Estado actual (validado):** polling re-solicita permiso en cada tick; sin pausa en background (H-73).
- **Criterios de aceptación (Gherkin):**
  - Dado entrar en background, la captura se pausa/reanuda de forma controlada y avisa si se detiene.
  - Dado el permiso, se solicita una sola vez.
- **Trazabilidad:** RA-013 (H-73).

## REQ-APK-014 — 401 a mitad de operación: preservar datos
- **Tipo:** Mejora · **Valor:** Medio · **Esfuerzo:** M · **Prioridad:** P2
- **Estado actual (validado):** 401 descarta el formulario y hace logout (H-74).
- **Criterios de aceptación (Gherkin):**
  - Dado un 401 durante un cobro a medio capturar, tras re-loguear se conservan los datos (o se confirma antes de descartar).
- **Trazabilidad:** RA-014 (H-74).

## REQ-APK-015 — Cache offline con TTL y limpieza
- **Tipo:** Mejora · **Valor:** Bajo · **Esfuerzo:** S · **Prioridad:** P4
- **Estado actual (validado):** cache sin expiración (H-70).
- **Criterios de aceptación (Gherkin):**
  - Dado un dato cacheado antiguo, se marca/expira y no se muestra como "actual".
- **Trazabilidad:** RA-015 (H-70).

## REQ-APK-016 — Permisos de cámara: deep-link a Ajustes
- **Tipo:** Mejora · **Valor:** Bajo · **Esfuerzo:** S · **Prioridad:** P4
- **Estado actual (validado):** permiso denegado permanente solo muestra mensaje (H-71).
- **Criterios de aceptación (Gherkin):**
  - Dado `canAskAgain === false`, se ofrece "Abrir Ajustes".
- **Trazabilidad:** RA-016 (H-71).

## REQ-APK-017 — Desbloquear edición de cliente sin documento
- **Tipo:** Mejora · **Valor:** Alto · **Esfuerzo:** S · **Prioridad:** P1
- **Estado actual (validado):** sin documento en tarjeta, la edición completa queda bloqueada con mensaje engañoso (H-76).
- **Criterios de aceptación (Gherkin):**
  - Dado un cliente sin documento, puedo editar nombre/teléfono/negocio; el documento se exige solo si la ruta lo requiere.
  - Dado que la config exige documento, se pide completarlo con mensaje correcto.
- **Trazabilidad:** RA-017 (H-76).

## REQ-APK-018 — Validaciones de captura (monto y teléfono)
- **Tipo:** Mejora · **Valor:** Medio · **Esfuerzo:** S · **Prioridad:** P2
- **Estado actual (validado):** pago/abono sin tope; edición no valida teléfono (H-75, H-77).
- **Criterios de aceptación (Gherkin):**
  - Dado un pago, no se permite mayor al saldo/valor de cuota (mensaje claro).
  - Dado editar cliente, el teléfono se valida igual que en el alta.
- **Trazabilidad:** RA-018 (H-75/H-77).

## REQ-APK-019 — UX móvil: tap targets, modales, feedback
- **Tipo:** Mejora · **Valor:** Medio · **Esfuerzo:** M · **Prioridad:** P3
- **Estado actual (validado):** tap targets <44dp, modales sin scroll/teclado, refresh silencioso, estatus crudos, banner único (H-78..H-82, H-86, H-87).
- **Criterios de aceptación (Gherkin):**
  - Controles ≥44dp; modales con scroll y `KeyboardAvoidingView`.
  - Pull-to-refresh fallido muestra feedback aunque haya datos.
  - Errores en rojo y éxito en verde; estatus con etiqueta.
  - Cerrar modal con cambios pide confirmación.
  - Precarga del día con throttle (no 2N cada 30s).
- **Trazabilidad:** RA-019 (H-78..H-82/H-86/H-87).

## REQ-APK-020 — Accesibilidad móvil (labels/roles)
- **Tipo:** Mejora · **Valor:** Bajo · **Esfuerzo:** M · **Prioridad:** P4
- **Estado actual (validado):** sin `accessibilityLabel/Role` (H-80).
- **Criterios de aceptación (Gherkin):**
  - Botones de solo ícono y controles clave tienen etiqueta/rol para lectores.
- **Trazabilidad:** RA-020 (H-80).

## REQ-APK-021 — Seguridad/estado local del dispositivo
- **Tipo:** Mejora · **Valor:** Medio · **Esfuerzo:** M · **Prioridad:** P3
- **Estado actual (validado):** datos sensibles en AsyncStorage sin cifrar; sin deep links; ruta activa no persiste (H-83, H-85, H-88).
- **Criterios de aceptación (Gherkin):**
  - Datos sensibles del cache/cola no quedan en claro (o se cifran).
  - La ruta activa se conserva al reiniciar.
  - Se definen deep links donde aporten (p. ej. abrir un cliente).
- **Trazabilidad:** RA-021 (H-83/H-85/H-88). (La device key estática → `REQ-PROD-008`.)

## REQ-APK-022 — Fiador y flags sin feature (eliminar gasto/préstamo, inyección)
- **Tipo:** Nuevo · **Valor:** Medio · **Esfuerzo:** M · **Prioridad:** P3 (depende de backend/config)
- **Estado actual (validado):** fiador tipado pero no capturado; flags de eliminar gasto/préstamo e inyección sin UI (H-90, H-91).
- **Criterios de aceptación (Gherkin):**
  - Dado la ruta/config lo permite, el cobrador puede registrar fiador.
  - Dado los flags habilitados, existen las acciones de eliminar gasto/préstamo y registrar inyección según permiso.
- **Datos/API:** **verificar backend** (endpoints y gating por permiso).
- **Trazabilidad:** RA-022 (H-90/H-91).
