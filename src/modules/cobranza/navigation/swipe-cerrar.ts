import { Animated, Dimensions, PanResponder } from "react-native";

/** Distancia mínima (px) del swipe horizontal a la derecha para cerrar. */
export const UMBRAL_SWIPE_CERRAR = 120;

/** Duración del timing de salida (deslizar fuera de pantalla antes de cerrar). */
export const DURACION_SALIDA_MS = 200;

function anchoDePantalla(): number {
  return Dimensions.get("window").width;
}

/**
 * True si el release del gesto debe cerrar/volver: swipe horizontal a la
 * derecha que supera el umbral. dx negativo (hacia la izquierda) o corto
 * no cierra.
 */
export function debeCerrarConSwipe(dx: number): boolean {
  return dx > UMBRAL_SWIPE_CERRAR;
}

/**
 * Crea el PanResponder del swipe-back. El translateX sigue al dedo durante el
 * arrastre (solo dx>0). Al soltar:
 * - Si el swipe supera el umbral:
 *   - `animarSalida=true` (overlays): anima el translateX hacia fuera de
 *     pantalla (~200 ms) para que se vea la ventana debajo, y llama `onCerrar`
 *     al completar.
 *   - `animarSalida="alInicio"` (pestañas): llama `onCerrar` de inmediato y en
 *     paralelo desliza la ventana hacia fuera (~200 ms), de modo que la
 *     pantalla destino (que el `onCerrar` empieza a revelar) se vea debajo
 *     mientras la ventana actual sale. Requiere que `onCerrar` NO desmonte
 *     esta vista de forma síncrona (el pop nativo deja la pantalla montada
 *     durante la transición; un cierre por estado la cortaría sin revelar).
 *   - `animarSalida=false`: llama `onCerrar` de inmediato sin animar.
 * - Si no supera el umbral, vuelve con spring a 0 sin cerrar.
 * Los handlers se exponen como funciones planas en `config` para poder
 * testearlos sin el responder system de RN.
 */
export function crearPanResponderCerrar(opts: {
  onCerrar(): void;
  translateX: Animated.Value;
  /** Ancho al que deslizar la ventana antes de cerrar. Default: ancho de pantalla. */
  anchoSalida?: number;
  /**
   * `true`: anima la salida y llama `onCerrar` al completar (overlays).
   * `"alInicio"`: llama `onCerrar` al instante y anima la salida en paralelo.
   * `false`: llama `onCerrar` sin animar (pop nativo). Default: `true`.
   */
  animarSalida?: boolean | "alInicio";
  /**
   * Si true, reclama el gesto también en la fase de captura
   * (`onMoveShouldSetPanResponderCapture`) para que esta vista gane el swipe
   * frente a ancestros con su propio responder (p. ej. el overlay de trayectos
   * dentro del contenido del tab). Default: false.
   */
  capturarGesto?: boolean;
}) {
  const { onCerrar, translateX, animarSalida = true, capturarGesto = false } = opts;
  const anchoSalida = opts.anchoSalida ?? anchoDePantalla();

  function animarSalidaOCerrar() {
    if (animarSalida === "alInicio") {
      onCerrar();
      deslizarHaciaFuera().start();
      return;
    }
    if (!animarSalida) {
      onCerrar();
      return;
    }
    deslizarHaciaFuera().start(({ finished }) => {
      if (finished) {
        onCerrar();
      }
    });
  }

  function deslizarHaciaFuera() {
    return Animated.timing(translateX, {
      toValue: anchoSalida,
      duration: DURACION_SALIDA_MS,
      useNativeDriver: true,
    });
  }

  function volver() {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
  }

  function esSwipeHorizontalDerecha(gestureState: { dx: number; dy: number }): boolean {
    return (
      gestureState.dx > 10 &&
      Math.abs(gestureState.dy) < Math.abs(gestureState.dx)
    );
  }

  const config = {
    onMoveShouldSetPanResponder: (
      _: unknown,
      gestureState: { dx: number; dy: number },
    ) => esSwipeHorizontalDerecha(gestureState),
    ...(capturarGesto
      ? {
          onMoveShouldSetPanResponderCapture: (
            _: unknown,
            gestureState: { dx: number; dy: number },
          ) => esSwipeHorizontalDerecha(gestureState),
        }
      : {}),
    onPanResponderMove: (_: unknown, gestureState: { dx: number }) => {
      if (gestureState.dx > 0) {
        translateX.setValue(Math.min(gestureState.dx, anchoSalida));
      }
    },
    onPanResponderRelease: (_: unknown, gestureState: { dx: number }) => {
      if (debeCerrarConSwipe(gestureState.dx)) {
        animarSalidaOCerrar();
      } else {
        volver();
      }
    },
    onPanResponderTerminate: () => {
      volver();
    },
  };

  return {
    config,
    panHandlers: PanResponder.create(config).panHandlers,
  };
}