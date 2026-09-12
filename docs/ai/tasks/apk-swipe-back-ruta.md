---
estado: completada
tags: [tarea]
---

# Tarea: apk-swipe-back-ruta

- **Origen:** petición del usuario (2026-09-09): al navegar de la lista de rutas a una ruta específica, poder regresar con el gesto de deslizar de izquierda a derecha y ocultar el botón atrás.
- **Estado:** completada (implementado y verificado).

## Contexto de navegación (verificado en App.tsx)
El flujo "lista de rutas → ruta específica" es: `SeleccionRutaScreen` (stack) →
`navigate("Main")` → pestaña **Ruta** que renderiza `RutaDetalleScreen`
**directamente** dentro de `ContenidoTab` (`App.tsx:30-36`), NO como overlay.
- El botón atrás que se quita es el del header del propio `RutaDetalleScreen` en
  la pestaña Ruta (columna izquierda). Su `cerrar` hace
  `navigation.navigate("SeleccionRuta")` (`RutaDetalleScreen.tsx:66`).
- El overlay `OverlayDetalle` SOLO se usa en producción para clientes
  (`abrir({ tipo: "cliente" })`, `ClientesScreen.tsx:349`); su case "ruta" es
  código muerto y NO se tocó.
- Android: back físico ya vuelve (native-stack + BackHandler).

## Plan aprobado (Opción A — global) y corrección tras code-review
Planteamiento inicial: gesto en `OverlayDetalle`. El code-reviewer detectó que el
flujo real pasa por la pestaña Ruta, no por el overlay (caso "ruta" es código
muerto), y que quitar el back ahí dejaría iOS sin forma de volver. Corrección:
el gesto vive en `RutaDetalleScreen`, que es la pantalla real del flujo.

## Implementación real
- `src/navigation/swipe-cerrar.ts` + `swipe-cerrar.test.ts` (nuevos):
  - `debeCerrarConSwipe(dx)`: swipe horizontal a la derecha > 120 px.
  - `crearPanResponderCerrar({ onCerrar, translateX })` → devuelve `config`
    (handlers planos, testeables sin el responder system) + `panHandlers`
    (`PanResponder.create(config).panHandlers`).
  - `onMoveShouldSetPanResponder`: dx > 10 y movimiento predominantemente
    horizontal. `onPanResponderMove`: seguir al dedo (solo dx>0).
    `onPanResponderRelease`: reset translateX y `onCerrar()` si supera el umbral.
    `onPanResponderTerminate`: reset sin cerrar.
  - Los tests invocan los handlers de `config` directamente.
- `src/screens/RutaDetalleScreen.tsx`:
  - Raíz del estado "con ruta" ahora es un `Animated.View` con `translateX` y
    `panHandlers`; el swipe cierra la pestaña (navega a `SeleccionRuta`) o cierra
    el overlay si algún día se usa con `onCerrar`.
  - Eliminado `Pressable` `btn-back-ruta` del header (columna izquierda vacía →
    título alineado a la izquierda con `bloqueTitulo`).
  - `translateX` con `useState` (no `useRef`) para respetar la regla
    `react-hooks/refs` de eslint-config-expo v57.

## Bloques
- [x] Bloque 1: gesto swipe en la pantalla real (RutaDetalleScreen), helper puro testeable.
- [x] Bloque 2: quitar botón atrás del header de `RutaDetalleScreen`.
- [x] Bloque 3: check.sh verde + validación.
  - Tests: 41 suites / 314 tests.
  - Nuevo `swipe-cerrar.test.ts` (9 tests: umbral + handlers puros de config).
  - `RutaDetalleScreen.test.tsx`: test "NO muestra botón back" reforzado (espera
    contenido antes de afirmar ausencia) + test de wiring: la raíz del detalle
    (testID `ruta-detalle-root`) recibe los handlers del responder
    (`onMoveShouldSetResponder`, `onResponderRelease`, `onResponderTerminate`).
    La lógica del gesto (dx>umbral → cerrar) se testea en el helper puro
    invocando `config.onPanResponderRelease({}, { dx })` directamente; los
    handlers públicos del PanResponder computan el gestureState internamente vía
    touchHistory, por lo que no se pueden simular con fireEvent/props.

## Pendiente
- Validación manual en dispositivo (Expo): swipe de izquierda a derecha en la
  pestaña Ruta vuelve a la lista de rutas; ya no hay botón atrás.
- Commits + PR de la tarea (working tree sin commitear, junto con refinamientos del PR #36).
