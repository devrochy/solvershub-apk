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
 *   - `animarSalida=false` (tabs): llama `onCerrar` de inmediato sin animar
 *     (la transición de vuelta la hace la navegación nativa, que muestra la
 *     pantalla destino).
 * - Si no supera el umbral, vuelve con spring a 0 sin cerrar.
 * Los handlers se exponen como funciones planas en `config` para poder
 * testearlos sin el responder system de RN.
 */
export function crearPanResponderCerrar(opts: {
  onCerrar(): void;
  translateX: Animated.Value;
  /** Ancho al que deslizar la ventana antes de cerrar. Default: ancho de pantalla. */
  anchoSalida?: number;
  /** Si false, se llama onCerrar sin animar la salida. Default: true. */
  animarSalida?: boolean;
}) {
  const { onCerrar, translateX, animarSalida = true } = opts;
  const anchoSalida = opts.anchoSalida ?? anchoDePantalla();

  function animarSalidaOCerrar() {
    if (!animarSalida) {
      onCerrar();
      return;
    }
    Animated.timing(translateX, {
      toValue: anchoSalida,
      duration: DURACION_SALIDA_MS,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        onCerrar();
      }
    });
  }

  function volver() {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
  }

  const config = {
    onMoveShouldSetPanResponder: (
      _: unknown,
      gestureState: { dx: number; dy: number },
    ) =>
      gestureState.dx > 10 && Math.abs(gestureState.dy) < Math.abs(gestureState.dx),
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