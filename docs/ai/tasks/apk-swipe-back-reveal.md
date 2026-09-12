---
estado: completada
tags: [tarea]
---

# Tarea: apk-swipe-back-reveal

- **Origen:** petición del usuario (2026-09-09): la transición del swipe-back
  solo se ve correcta en «detalle de cliente → lista de clientes». Se quiere esa
  misma transición (deslizar revelando la pantalla debajo) en TODAS las vistas,
  que cerrar el overlay de trayectos vaya a «cobro del día» (no a la lista de
  rutas) y que el header de trayectos tenga el mismo estilo que las demás.
- **Estado:** completada
- **Fecha inicio:** 2026-09-09

## Objetivo
Al deslizar cualquier vista (pestañas y overlays) hacia la derecha, la vista se
desliza hacia fuera revelando la pantalla destino debajo (mismo efecto que el
detalle del cliente); el overlay de trayectos cierra a «cobro del día»; el
header de trayectos queda alineado como el de las demás vistas.

## Fuera de alcance
- Cambiar a qué pantalla navega el swipe de las pestañas (siguen yendo a
  `SeleccionRuta`).
- Refactor estructural del overlay de trayectos a hermano del wrapper del tab
  (opción B2, solo si la captura del gesto no basta en dispositivo).
- `/tmp` ni logs de diagnóstico.

## Bloques (checklist TDD)
- [x] Bloque 1: modo de salida `"alInicio"` en `swipe-cerrar.ts`: al superar el
  umbral llama `onCerrar` de inmediato y desliza la vista hacia fuera (~200 ms).
  Test: `src/navigation/swipe-cerrar.test.ts` (13 → 16 tests).
- [x] Bloque 2: prop `capturarGesto` en `VentanaCerrarConSwipe` que activa el
  capture-phase del responder (`onMoveShouldSetPanResponderCapture`).
  Tests: `src/navigation/swipe-cerrar.test.ts` + `VentanaCerrarConSwipe.test.tsx`.
- [x] Bloque 3: `ContenidoTab` usa `animarSalida="alInicio"` (la pestaña se
  desliza y revela la lista de rutas debajo vía el pop nativo).
  Test: `src/navigation/ContenidoTab.test.tsx` (4 → 5 tests, wiring vía spy).
- [x] Bloque 4: el overlay de trayectos en `DiaScreen` usa `capturarGesto`.
  Test: `src/screens/DiaScreen.test.tsx` (28 → 29 tests).
- [x] Bloque 5: header de `TrayectosLista` sin `columnaIzq`/`columnaDerecha`
  vacías (título a la izquierda como Día/Clientes/Ruta).
  Test: `src/components/TrayectosLista.test.tsx` (3 → 4 tests).

## Decisiones tomadas durante la implementación
- `animarSalida` se tipa como `boolean | "alInicio"` (sin romper el API:
  `true`/`false` conservan su semántica). `"alInicio"` llama `onCerrar` al
  instante y anima la salida en paralelo (el pop nativo deja la pantalla
  montada durante la transición; por eso en pestañas sí se ve el reveal).
- `capturarGesto` activa `onMoveShouldSetPanResponderCapture` en el responder
  del overlay: en la fase de captura se evalúa **antes** que el bubble del
  ancestro (contenido del tab), por lo que el overlay de trayectos siempre gana
  el gesto y cierra a «cobro del día», nunca navega a `SeleccionRuta`.
- Header de trayectos: se quitaron las dos columnas vacías (72 px) y se dejó
  `bloqueTitulo` en la `fila` (título + subtítulo), alineado a x=16 igual que
  Día/Clientes/Ruta.
- El test de wiring de `ContenidoTab` espiando `crearPanResponderCerrar` no
  simula la negociación real del responder system (no simulable en RTL): valida
  que las opciones correctas llegan al helper; el comportamiento del modo
  `"alInicio"` está probado a nivel de helper (Bloque 1).

## Ambigüedades resueltas con el usuario
- Header de trayectos = estilo de Día/Clientes (título a la izquierda sin
  columnas vacías y con subtítulo). → Respuesta: sí, ese es el estilo buscado.
- En las pestañas la pantalla destino (lista de rutas) debe aparecer debajo
  mientras la pestaña se desliza (`"alInicio"`); lo mismo en trayecto → cobro
  del día. → Respuesta: sí.

## Análisis del reporte original (root cause)
- El detalle de cliente funcionaba porque `OverlayDetalle` se renderiza como
  **hermano posterior** del wrapper de swipe del tab (`ContenidoTab.tsx`), así
  que su gesto no compite con nadie. El overlay de trayectos estaba **anidado**
  dentro del contenido del tab, por lo que la contienda de gesto se la llevaba
  un ancestro → cerraba hacia `SeleccionRuta`. `capturarGesto` (fase de captura)
  corrige la contienda a favor del overlay.

## Iteración de revisión (code-reviewer: aprobado sin bloqueantes)
Cambios aplicados tras el review:
- Docstring de `crearPanResponderCerrar`: documento que `"alInicio"` requiere
  que `onCerrar` NO desmonte la vista síncronamente (swipe-cerrar.ts:29-32).
- Renombrados 2 tests que sobre-prometían ("ganar frente al contenido del tab",
  "alinea el título a la izquierda") → describen lo que realmente verifican
  (configuración con `capturarGesto`; header sin columnas vacías).
- Añadido test de regresión: `animarSalida=true` con animación interrumpida
  (`finished:false`) NO llama `onCerrar` (distingue `true` de `"alInicio"`).
No aplicado (deuda de cobertura registrada):
- No hay test que simule el release con dx>umbral en el overlay de trayectos
  por limitación de RTL con PanResponder (el `gestureState` no viaja en el
  evento). Se cubre la negociación real con validación manual en dispositivo.
- En `ventana-con-swipe` no se verifica el prop de captura en el árbol porque
  `PanResponder.create` siempre expone el handler de captura (devuelve false sin
  la opción); se verifican las opciones que recibe el helper vía spy.

## Resultado final (llenar al completar)
- Comandos ejecutados para verificar:
  - `npx jest` (suites afectadas): verde.
  - `npx jest --silent --maxWorkers=4`: verde salvo timeouts ambientales.
  - `npx jest --silent --testTimeout=30000`: **43 suites / 336 tests PASS**.
  - `bash scripts/check.sh`: lint + typecheck OK. Los tests ejecutados en su
    configuración estándar fallan de forma INTERMITENTE en 3-5 suites pesadas
    por timeout de 5000 ms, causado por el entorno (load average ~700 en una
    máquina de 12 cores, storm de procesos de Google Chrome), NO por el código:
    las mismas suites pasan en solitario y el primer `check.sh` del día (con
    estos cambios ya aplicados) pasó completo en 11.5 s. Validación de
    correctitud: 336/336 tests pasan con `--testTimeout=30000`.
- Archivos modificados:
  - `src/navigation/swipe-cerrar.ts` (+`.test.ts`): modo `"alInicio"`,
    `capturarGesto`, refactor `deslizarHaciaFuera`/`esSwipeHorizontalDerecha`.
  - `src/navigation/VentanaCerrarConSwipe.tsx` (+`.test.tsx`): tipos y
    `capturarGesto` propagado.
  - `src/navigation/ContenidoTab.tsx` (+`.test.tsx`): `animarSalida="alInicio"`.
  - `src/screens/DiaScreen.tsx` (+`.test.tsx`): `capturarGesto` en trayectos.
  - `src/components/TrayectosLista.tsx` (+`.test.tsx`): header sin columnas.
  - `docs/ai/tasks/apk-swipe-back-reveal.md`: este archivo.
- Pendientes/seguimiento:
  - Validación manual en dispositivo (Expo): el efecto visual de las pestañas
    (`pop nativo + translateX` simultáneos) puede percibirse como doble
    deslizamiento; si se ve raro, alternativa `animarSalida=false` (pop nativo
    solo) o reducir `DURACION_SALIDA_MS`.
  - Validar en dispositivo que `capturarGesto` resuelve el caso real
    trayecto → cobro del día; si no basta, aplicar opción B2 (overlay como
    hermano del wrapper del tab, patrón de `OverlayDetalle`).
  - El `check.sh` estándar debe pasar en configuración limpia (sin la carga
    externa) antes del merge del PR.