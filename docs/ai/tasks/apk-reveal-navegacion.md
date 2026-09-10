---
estado: en_progreso
tags: [tarea]
---

# Tarea: apk-reveal-navegacion

- **Origen:** petición del usuario (2026-09-09). En `apk-swipe-back-reveal` se
  implementó `animarSalida="alInicio"` y `capturarGesto`, pero el usuario
  confirmó en dispositivo que el efecto NO es el esperado: (1) las pestañas no
  revelan la vista anterior al deslizar, y (2) el overlay de trayectos sigue
  yendo a la lista de rutas en vez de a «cobros del día».
- **Estado:** en progreso.
- **Fecha inicio:** 2026-09-09

## Objetivo
Que al deslizar (a) una pestaña se revele en vivo `SeleccionRuta` por debajo
(igual que el detalle del cliente revela la lista de clientes), y (b) el overlay
de trayectos se deslice revelando «cobros del día» (nunca navegue a la lista de
rutas). El header de trayectos ya quedó alineado en la tarea previa.

## Diagnóstico (por qué fallaba)
- El detalle del cliente funciona porque es un **overlay** (`OverlayDetalle`)
  renderizado como **hermano encima** del contenido del tab: la lista de clientes
  está siempre montada debajo y el `translateX` la revela en vivo.
- Las pestañas son **pantallas del stack nativo**: `SeleccionRuta` no está
  montada debajo mientras arrastras, así que no hay nada que revelar y el pop de
  Android es un fade.
- El overlay de trayectos estaba **anidado** dentro del wrapper de swipe del tab,
  por lo que competía con él (y perdía).

## Decisión de arquitectura (Opción B, aprobada por el usuario)
`SeleccionRuta` es la **base** (siempre montada) y las pestañas se renderizan
como una **capa deslizable encima** (`VentanaCerrarConSwipe`), de modo que el
swipe de las pestañas revele `SeleccionRuta` en vivo. Los overlays (detalle de
cliente y trayectos) se renderizan como **hermanos encima de la capa de
pestañas**, para que su gesto no compita con nadie (mismo patrón que el detalle
del cliente, que sí funciona).

## Bloques (checklist TDD)
- [x] Bloque 1: `InicioCobrador` (`src/navigation/InicioCobrador.tsx`) —
      `SeleccionRutaScreen` base + capa de pestañas deslizable (reveal).
      `SeleccionRutaScreen` recibe `onRutaSeleccionada`. `TabsNavigator` extraído
      (`src/navigation/TabsNavigator.tsx`). Test: `InicioCobrador.test.tsx`.
- [x] Bloque 2: eliminado `ContenidoTab`; pestañas = pantallas directas; overlays
      en `OverlaysActivos` (`OverlayDetalle` + `TrayectosOverlayHost`) al nivel
      de `InicioCobrador`, como **hermanos encima** de la capa de pestañas.
- [x] Bloque 3: overlay de trayectos vía `TrayectosOverlayProvider` +
      `TrayectosOverlayHost`; `DiaScreen` lo abre con `abrirTrayectosOverlay`.
      Cierra a «cobros del día» (revela la pestaña Día que queda debajo).
- [x] Bloque 4: tests actualizados (`DiaScreen`, `ClientesScreen`,
      `SeleccionRutaScreen`, nuevo `InicioCobrador`) + `scripts/check.sh` verde:
      **43 suites / 333 tests**.

## Notas de diseño
- El back físico de Android vive en `InicioCobrador`: cierra en orden
  overlay de detalle → overlay de trayectos → capa de pestañas.
- Cambio de comportamiento respecto a B1: los overlays a pantalla completa
  ahora se montan **encima de la capa de pestañas**, por lo que cubren también
  la tab bar (antes el detalle dejaba la tab bar visible). Es el trade-off para
  que el gesto del overlay no compita con el de la pestaña.

## Fuera de alcance
- Cambiar la lógica interna de cada pantalla (Día/Ruta/Clientes).
- Rediseño visual.

## Resultado final (llenar al completar)
- Comandos: `npx tsc --noEmit` OK; `bash scripts/check.sh` → 43 suites / 333
  tests, lint + typecheck OK.
- Archivos: `App.tsx` (simplificado), `src/navigation/InicioCobrador.tsx` (+test),
  `TabsNavigator.tsx`, `OverlaysActivos.tsx`, `TrayectosOverlayHost.tsx`,
  `trayectos-overlay-context.tsx`, `SeleccionRutaScreen.tsx`,
  `DiaScreen.tsx` (+test), `ClientesScreen.test.tsx`,
  `SeleccionRutaScreen.test.tsx`; eliminado `ContenidoTab.tsx` (+test).
- Pendiente: validación visual en dispositivo (Expo Go): swipe de pestañas
  revela SeleccionRuta en vivo; trayecto → cobros del día; detalle de cliente
  cierra revelando la lista.
