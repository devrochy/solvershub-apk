# Tarea: APK PR1 — Login dual, navegación con menú fijo y rediseño del detalle de cliente

- **Origen:** Rediseño APK aprobado 2026-09-03.
- **Estado:** B0, B1 y B2 completados (210 tests verdes).
- **Rama:** `feature/rediseno-detalle-cliente` (base `develop` @ `5dd7d66`).
- **Fecha inicio:** 2026-09-03

## Objetivo
Detalle del cliente rediseñado por completo, con menú inferior siempre visible, login dual (cobrador/socio), edición en modal, tarjeta de documento con verificación, "Cómo llegar" con mapa, notificación de próximo cobro, sección de préstamos con acordeón, canvas de cuotas con modal de detalle, WhatsApp con screenshot y botones de pago/no pago.

## Decisiones del usuario (registradas)
- Sesión dual: extender `/cobrador/mis-rutas` para rol socio (backend PR #91).
- Login: selector de rol en la pantalla.
- Editar ubicación: mapa táctil con pin (Leaflet).
- WhatsApp: screenshot real (react-native-view-shot + expo-sharing, ya instaladas).
- Menú: detalle dentro del tab (menú siempre visible).
- Detalle de cuota: endpoint nuevo `GET /cobrador/rutas/:rutaId/prestamos/:prestamoId/cuotas/:cuotaId/detalle`.

## Bloques
- [x] B0: login dual (selector rol, perfil con rol).
- [x] B1: navegación menú fijo (PantallaActivaContext, OverlayDetalle, ContenidoTab).
- [x] B2: rediseño ClienteScreen (ver instrucciones del agente).
  - [x] B2.1: endpoint `detalleCuota` en `CobradorApi` + factory + tipo.
  - [x] B2.2: componente `ModalConFooter` (header/body/footer) con test.
  - [x] B2.3: componente `MapaPin` (Leaflet draggable + bridge postMessage) con test.
  - [x] B2.4: Avatar con icono `person` cuando no hay foto + test.
  - [x] B2.5: `CambioClienteInput` con lat/lng negocio+domicilio y apellido + test.
  - [x] B2.6: reescritura `ClienteScreen` (header Editar, tarjeta cliente, documento, cómo llegar, notificación, préstamos acordeón, detalle préstamo, modal cuota, WhatsApp screenshot, modales pago/no-pago) + tests.
  - [x] B2.7: `scripts/check.sh` verde (210 tests).

## Resultado final B2
- **Comandos**: `scripts/check.sh` → lint 0 errores + typecheck limpio + **210 tests** (33 suites) en verde.
- **Archivos nuevos**: `src/components/ModalConFooter.tsx|.test.tsx`, `src/components/MapaPin.tsx|.test.tsx`.
- **Archivos modificados**: `src/api/cobrador.ts` (+`detalleCuota`), `src/api/cobrador.test.ts`, `src/types/cobrador.ts` (`DetalleCuotaPublic`, `PagoCuotaPublic`, `UltimaVisitaCuotaPublic`, `ClienteTarjetaPublic.documentoFrenteUrl`), `src/features/cliente/cambio-cliente.ts` (lat/lng + apellido), `src/features/cliente/use-evidencias-cliente.ts` (fuente librería/cámara, devuelve la evidencia), `src/components/Avatar.tsx` (icono `person`), `src/screens/ClienteScreen.tsx` (reescritura completa), `src/screens/ClienteScreen.test.tsx` (39 tests), `src/screens/ClientesScreen.test.tsx`, `src/components/Avatar.test.tsx`, `src/features/cliente/cambio-cliente.test.ts`, `docs/ai/tasks/apk-pr1-rediseno-detalle-cliente.md`.
- **Total de tests finales**: 210 (194 previos +16: +5 ModalConFooter, +3 MapaPin, +2 cambio-cliente, +1 cobrador, +5 neto ClienteScreen).

### Decisiones de diseño (desviaciones justificadas)
1. **Botón de cierre en el header** solo cuando hay `onCerrar` (modo overlay B1): sin él no hay forma de cerrar el overlay. "Editar" queda a la izquierda + título centrado + cerrar a la derecha.
2. **Coordenadas**: la tarjeta (`ClienteTarjetaPublic`) no trae lat/lng, así que "Cómo llegar" y el mapa usan **solo las props**; el botón se oculta sin coordenadas. El mapa está **colapsado por defecto** (se despliega con "Cómo llegar").
3. **Canvas del detalle**: usa `obtenerEstadoCuentaPrestamo` (endpoint existente) para abonos/saldo reales por cuota; el detalle del préstamo ahora es inline (se eliminó `PrestamoScreen` del flujo, la pantalla y su test quedan sin tocar).
4. **Saldo en tarjetas de préstamo**: `PrestamoPublic` no tiene saldo → la tarjeta muestra valor/cuotas/interés/estatus; el saldo se muestra en el detalle expandido.
5. **Editar/eliminar cuota fuera del ClienteScreen**: los cuadros del canvas ahora abren el modal informativo de detalle (pagos/abonos/saldo/última visita). Los métodos `editarCuota`/`eliminarCuota` siguen en la API.
6. **Avatar sin foto**: icono `person` de MaterialIcons (no iniciales); el testID `avatar-iniciales` pasó a `avatar-icono` (se actualizaron Avatar.test y ClientesScreen.test).
7. **Mensajes globales**: éxito/error de pago/no_pago/cambio_cliente/evidencias se muestran en un banner (`banner-mensaje`), no dentro del modal.
8. **Documento**: frente muestra URL si `documentoFrenteUrl` viene en la tarjeta; reverso siempre placeholder (backend aún no sube reverso).

### Endpoints que requieren el backend (registro)
- `GET /cobrador/rutas/:rutaId/prestamos/:prestamoId/cuotas/:cuotaId/detalle` → **`detalleCuota`** (PR #91, NO mergeado al momento de implementar). Contrato asumido: `{cuotaId, prestamoId, numeroCuota, valorEsperado, fechaVencimiento, estatus, pagos[{id, valor, metodoPago, fecha}], abonosAcumulados, saldoPendiente, ultimaVisita{resultado, motivoNoPago, fecha}|null}`.
- **`cambio_cliente` offline**: el payload ahora puede incluir `latitud`, `longitud`, `latitudDomicilio`, `longitudDomicilio` — el `AplicarEventosOfflineService` debe aceptarlos.
- **`tarjeta`**: exponer `documentoFrenteUrl` para que el badge "Verificado" del documento refleje el frente cargado.

### Pendientes/seguimiento
- La miniatura de documento "reverso" no tiene flujo de subida en backend (solo `documento_frente`); queda como placeholder "Pendiente".

## Notas de implementación B1
- `src/navigation/pantalla-activa-context.tsx`: `PantallaActiva` (cliente/prestamo/ruta), `abrir/cerrar`.
- `src/navigation/OverlayDetalle.tsx`: renderiza ClienteScreen como capa sobre el tab.
- `src/navigation/ContenidoTab.tsx`: envuelve el contenido de cada tab; el tab bar queda visible.
- `App.tsx`: Stack solo con Login + Main; los tabs usan ContenidoTab.
- ClienteScreen acepta `Props | ClienteScreenDirectProps` (Stack o directas con `onCerrar`).
- `usePantallaActiva` se usa para abrir el detalle desde Clientes/Día.
- Desde Día: `prestamoAutoSeleccionado: true` al abrir el detalle.