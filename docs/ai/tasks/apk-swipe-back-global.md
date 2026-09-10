---
estado: terminado
tags: [tarea]
---

# Tarea: apk-swipe-back-global

- **Origen:** petición del usuario (2026-09-09): el swipe-back de la pestaña
  Ruta (tarea `apk-swipe-back-ruta`) funcionaba, pero (1) solo estaba habilitado
  en la vista de información de la ruta y (2) la transición final era muy
  brusca: quería que se viera la vista de la página a la que se retorna durante
  la transición, en TODAS las ventanas de la APK (cobro día, lista clientes,
  trayectos, detalle del cliente, etc.).
- **Estado:** terminado (implementado y verificado con `scripts/check.sh`).

## Flujo real de ventanas (verificado en App.tsx)
- Pestañas **Ruta / Día / Clientes**: cada una renderiza su contenido dentro de
  `ContenidoTab` (`App.tsx:30-63`). Volver de cualquier pestaña =
  `navigation.navigate("SeleccionRuta")` (pop del stack nativo, cuya transición
  nativa muestra la pantalla destino).
- **Overlay detalle de cliente**: `ClienteScreen` se monta en `OverlayDetalle`
  (capa `absoluteFill` opaca sobre el contenido del tab). El destino (tab) está
  debajo y se revela al deslizar la capa.
- **Overlay de trayectos**: `TrayectosLista` se monta en el overlay de
  `DiaScreen` (`trayectosOverlay`, `DiaScreen.tsx:608-624`). El destino (Día)
  está debajo y se revela al deslizar la capa.

## Decisiones confirmadas por el usuario
1. Ocultar `btn-back-cliente` (`ClienteScreen`) y `back-trayectos`
   (`TrayectosLista`), misma regla que Ruta: el swipe los sustituye, y el back
   físico de Android cierra el overlay (más el pop de stack en las pestañas).
2. Las tres pestañas (Ruta, Día, Clientes) vuelven a `SeleccionRuta` con el
   swipe.

## Implementación real
- `src/navigation/swipe-cerrar.ts` (extendido de `apk-swipe-back-ruta`):
  - `DURACION_SALIDA_MS = 200`. `crearPanResponderCerrar` acepta ahora
    `animarSalida` (default `true`) y `anchoSalida` (default `Dimensions`).
  - Al soltar con swipe > umbral:
    - `animarSalida=true` (overlays): `Animated.timing` de `translateX` hacia
      fuera de pantalla (~200 ms, useNativeDriver) y `onCerrar` al completar —
      así se ve la ventana que hay debajo durante la salida.
    - `animarSalida=false` (pestañas): llama `onCerrar` de inmediato sin animar
      (la transición de vuelta la hace el pop nativo del stack, que muestra la
      pantalla destino); ya no hace `setValue(0)` (era el snap brusco).
    - Si no supera el umbral: `Animated.spring` de vuelta a 0 (también en
      `onPanResponderTerminate`).
- `src/navigation/VentanaCerrarConSwipe.tsx` (nuevo): componente reutilizable
  que envuelve una ventana con el gesto (crea `translateX` + responder con
  `useState` inicializador, respetando `react-hooks/refs` de eslint-config-expo
  v57). Lo usan `ContenidoTab`, `OverlayDetalle` y el overlay de trayectos.
- `src/navigation/ContenidoTab.tsx` (+`ContenidoTab.test.tsx` nuevo): acepta
  `onCerrar?` y envuelve `{children}` en `VentanaCerrarConSwipe`
  (`animarSalida=false`, testID `contenido-tab`). El `OverlayDetalle` se queda
  como hermano encima con su propio gesto.
- `App.tsx`: `ContenidoRuta/Dia/Clientes` pasan
  `onCerrar={() => navigation.navigate("SeleccionRuta")}` vía hook
  `useNavegacionSeleccionRuta`.
- `src/navigation/OverlayDetalle.tsx`: cada case se envuelve en
  `VentanaCerrarConSwipe` (testID `overlay-detalle`, style `capa` opaca →
  revela el tab al deslizar). Deja de pasar `onCerrar` a `ClienteScreen`.
- `src/screens/ClienteScreen.tsx`: eliminado `btn-back-cliente` y el prop
  `onCerrar` (interface + extracción). El cierre es gesto + back físico.
- `src/screens/RutaDetalleScreen.tsx`: revertido a `View` raíz (testID
  `ruta-detalle-root`) — el gesto ahora lo pone `ContenidoTab`.
- `src/screens/DiaScreen.tsx`: el overlay de trayectos se envuelve en
  `VentanaCerrarConSwipe` (testID `trayectos-overlay`) y se añade un
  `BackHandler` (sin él, al quitar el botón, Android no podría cerrar el
  overlay). `src/components/TrayectosLista.tsx`: eliminados `back-trayectos` y
  el prop `onCerrar`.

## Bloques
- [x] Bloque 1: helper con salida animada (timing→onCerrar / spring de vuelta /
      `animarSalida=false` directo). `swipe-cerrar.test.ts`: 11 tests.
- [x] Bloque 2: componente reutilizable `VentanaCerrarConSwipe` (+3 tests).
- [x] Bloque 3: gesto global en `ContenidoTab` + `App.tsx` + revert de gesto en
      `RutaDetalleScreen` (+4 tests en `ContenidoTab.test.tsx`, ajustes en
      `RutaDetalleScreen.test.tsx`).
- [x] Bloque 4: gesto en `OverlayDetalle` + eliminar `btn-back-cliente`
      (+test de wiring del responder).
- [x] Bloque 5: gesto en overlay de trayectos + `BackHandler` + eliminar
      `back-trayectos` (+2 tests en `DiaScreen.test.tsx`; ajustes en
      `TrayectosLista.test.tsx`). Nota: el handler de `BackHandler` se invoca
      con `await act(async ...)` porque el `act` síncrono no flushea la
      actualización de estado en React 19 ocasionando contaminación entre tests.
- [x] Bloque 6: `scripts/check.sh` verde: **43 suites / 325 tests**, lint
      0 errores, typecheck OK.

## Iteración de revisión (code-reviewer: aprobado sin bloqueantes)
Cambios aplicados tras el review:
- `swipe-cerrar.ts:78`: clamp `Math.min(dx, anchoSalida)` en
  `onPanResponderMove` (un fling brusco ya no deja `translateX` más allá del
  ancho de pantalla ni anima en reversa al cerrar) + test.
- `ContenidoTab.test.tsx`: el mock de `OverlayDetalle` ahora solo se renderiza
  con `pantalla`, y se añadió el test de integración "el back físico de Android
  cierra la pantalla activa (overlay)" (cubre el `BackHandler` de
  `ContenidoTab`, que antes no tenía test).
- Test "recibe la prop onCerrar ... se lo envía al responder al soltar" →
  renombrado a algo que no promete más de lo que verifica.
- `DiaScreen.test.tsx`: el test de back físico filtra las llamadas por
  `"hardwareBackPress"` (más robusto si el árbol crece).
No aplicado (observaciones aceptadas sin cambio):
- Closure stale de `onCerrar` en `VentanaCerrarConSwipe` (inicializador de
  `useState`): hoy inofensivo (todos los consumidores pasan callbacks estables);
  se evitaría con un ref "latest", no aplicado por simplicidad.
- Case `ruta` de `OverlayDetalle` como código muerto: se mantiene a propósito.
- `anchoDePantalla()` evaluado al crear el responder (stale ante rotación):
  la app es portrait-only.

## Pendiente
- Validación manual en dispositivo (Expo): swipe en Día/Clientes y en el detalle
  de cliente y en trayectos vuelve mostrando la ventana destino; back físico de
  Android cierra los overlays; ya no hay botones atrás en Cliente/Trayectos.
- Commits + PR de la tarea.