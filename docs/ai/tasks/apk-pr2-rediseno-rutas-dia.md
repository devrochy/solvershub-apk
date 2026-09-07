---
estado: completada
tags: [tarea]
---

# Tarea: APK PR2 — Dashboard y detalle de ruta, +Nuevo cliente y Cobros del día

- **Origen:** Rediseño APK aprobado 2026-09-03.
- **Estado:** completado (2026-09-03) — `scripts/check.sh` verde (237 tests).
- **Rama:** `feature/rediseno-rutas-dia` (base `develop` @ `35a6271`).
- **Fecha inicio:** 2026-09-03
- **PR:** https://github.com/devrochy/app-cobranza-apk/pull/25

## Objetivo
Rediseñar la sección Rutas (dashboard por ruta + detalle con notas), la sección Clientes (+Nuevo cliente) y la sección Día (Cobros del día + gastos en modal), manteniendo el menú inferior siempre visible (patrón B1 ya implementado).

## Decisiones del usuario (registradas)
- Dashboard de ruta: **solo datos existentes** (total clientes, clientes del día, en mora por color, estado de la ruta). Sin endpoint nuevo de KPIs.
- Editar ruta: **solo lectura** por ahora (el panel edita); pendiente habilitar si el rol tiene permiso (backlog).
- Notas de ruta: endpoint nuevo del cobrador `GET/POST /cobrador/rutas/:rutaId/notas` (backend PR #91).
- Header CobraIA: quitar de arriba, pasar a **esquina inferior derecha flotante** sobre el menú (con padding para no solapar).
- Menú Día: header "Cobros del día" + "+ Gastos" (modal).

## Resultado

### Integración base (B1 portado desde `feature/rediseno-detalle-cliente`)
- Portados: `pantalla-activa-context.tsx` (+test), `OverlayDetalle.tsx` (+test), `ContenidoTab.tsx`, `ModalConFooter.tsx` (+test), `MapaPin.tsx` (+test), `auth.ts` login dual (+test), `session/*` (token-store con rol, session-context login dual), `LoginScreen` dual (+test), `ClienteScreen` rediseñado (+test), `App.tsx` (ContenidoRutas/Dia/Clientes, RootContent con resetKey, Stack solo Login+Main), tipos/features asociados, `jest.setup.ts` (webview con injectJavaScript), deps `expo-sharing` + `react-native-view-shot`.
- Screens de tabs usan `navigation?` opcional + `usePantallaActiva()`.

### B3 — RutasScreen dashboard + RutaDetalleScreen
- Header CobraIA eliminado del header superior; flotante en esquina inferior derecha (`bottom: 90, right: 16`, gris claro, `pointerEvents="none"`, paddingBottom en la lista).
- Tarjetas por ruta con KPIs calculados con `Promise.all` (mis-rutas + `listarClientesDeRuta` + `dia`): total clientes, del día, en mora (`color === "rojo"`), estado. Sin "permisos habilitados".
- Botón "Consultar" → setea ruta activa + navega al tab Clientes. Tocar la tarjeta → `abrir({tipo:"ruta", rutaId, rutaNombre})`.
- `RutaDetalleScreen` nuevo: header con nombre + "Editar" (solo lectura, aviso) + X (cierra), sección información (KPIs + estado), sección Notas con "+ Nota" (ModalConFooter textarea → `crearNota`) y lista (`listarNotas`) con creador/fecha. Renderizado en `OverlayDetalle` case "ruta".
- `CobradorApi`: `listarNotas`, `crearNota` (`GET/POST /cobrador/rutas/:rutaId/notas`), tipo `RutaNotaPublic`.

### B4 — ClientesScreen +Nuevo cliente
- Botón "+ Cliente" en header (solo con ruta activa) → `ModalConFooter` "Nuevo cliente" con nombre, apellido, negocio, teléfono, lat/lng (MapaPin + inputs sincronizados), tope opcional, y foto/documento (`useEvidenciasCliente`).
- Guardar → `api.crearCliente(rutaId, input, evidencias)` (`POST /cobrador/rutas/:rutaId/clientes` multipart). Tras crear cierra el modal y refresca la lista.

### B5 — DiaScreen Cobros del día + gastos en modal
- Header "Cobros del día" con "+ Gastos" a la izquierda → el formulario de gasto pasa a `ModalConFooter`.
- Se preserva: gating A12 (trayecto + GPS), generar/ver trayectos, trayectoria activa, apertura, re-fetch 30s, y los tests de gasto offline.
- Tocar un cliente del día abre el detalle con `prestamoAutoSeleccionado: true`.

### Tests
- `api/cobrador.test.ts`: `listarNotas`, `crearNota`, `crearCliente`.
- `RutasScreen.test.tsx`: header flotante, KPIs por ruta, Consultar, apertura de detalle, sin permisos habilitados.
- `RutaDetalleScreen.test.tsx` (nuevo): KPIs/estado, lista de notas, "+ Nota" crea, Editar read-only, cerrar.
- `OverlayDetalle.test.tsx`: case "ruta" + case "prestamo" (no renderiza).
- `ClientesScreen.test.tsx`: "+ Cliente" abre modal, guardar crea vía `crearCliente` y refresca, solo con ruta activa.
- `DiaScreen.test.tsx`: header "Cobros del día", "+ Gastos" modal + guardar, detalle con `prestamoAutoSeleccionado`.

## Bloque
- [x] B3: RutasScreen dashboard + detalle ruta + notas + header CobraIA flotante.
- [x] B4: ClientesScreen +Nuevo cliente (`POST /cobrador/rutas/:rutaId/clientes`).
- [x] B5: DiaScreen Cobros del día + gastos modal + auto-préstamo visita.

## Correcciones de code-review (veredicto: RECHAZADO → corregido, re-check)
- [x] Crítico: "Consultar" no navegaba en producción (`navigation` nunca se pasaba a `RutasScreen`). Fix: `useNavigation<BottomTabNavigationProp<RootTabParamList, "Rutas">>` dentro del screen.
- [x] Importante: DiaScreen disparaba requests con `rutaId=0` sin ruta activa. Fix: guards `if (!rutaId) return` en los 3 efectos y en `cargar`.
- [x] Importante: coordenadas vacías → se enviaban `0,0`. Fix: validar `trim() !== ""` y lat/lng no cero.
- [x] Importante: `topeMaximoDeuda` NaN/negativo. Fix: `Number.isFinite` y `>= 0`.
- [x] Importante: un KPI fallido tumbaba todo el dashboard. Fix: `Promise.allSettled` por ruta (tarjeta con KPIs 0 si falla parcial).
- [x] Menor: error de pull-to-refresh invisible con rutas cargadas → aviso inline (`aviso-error-refresh`).
- [x] Menor: `guardarNota` mostraba "No se pudo guardar" si fallaba el re-fetch tras crear. Fix: aislar el guardado del re-fetch (`void cargar()`).
- [x] Menor: `gastoMensaje` siempre verde. Fix: `{texto, esError}` + estilo rojo para errores (`gasto-mensaje`).
- [x] Menor: props muertas (`navigation` en DiaScreen, `_props` en ClientesScreen) eliminadas.
- [x] Menor: comentario engañoso en OverlayDetalle "prestamo" corregido.
- [x] Backlog: duplicación de "en mora" registrada en `backlog.md`.