import { useEffect, useState } from "react";
import { Animated, StyleSheet } from "react-native";

import { shColor } from "../theme/tokens";

/**
 * Colores de estado del cliente derivados de los tokens de marca (SolversHub).
 * Los tonos suaves (fondo/borde) se componen con alfa sobre el color semántico,
 * así una sola fuente (tokens.json) gobierna sólidos y pasteles.
 */
const COLORES: Record<string, string> = {
  verde: shColor.success,
  rojo: shColor.danger,
  azul: shColor.navy["700"],
  blanco: shColor.slate["400"],
};

const COLOR_POR_DEFECTO = shColor.slate["400"];

/** Hex → rgba con alfa (para los tonos suaves derivados del token). */
function conAlfa(hex: string, alfa: number): string {
  const limpio = hex.replace("#", "");
  const r = parseInt(limpio.slice(0, 2), 16);
  const g = parseInt(limpio.slice(2, 4), 16);
  const b = parseInt(limpio.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alfa})`;
}

/** Color sólido de un estado (verde/rojo/azul/blanco). */
export function colorDeEstado(color: string): string {
  return COLORES[color] ?? COLOR_POR_DEFECTO;
}

/** Fondo suave (pastel) de tarjeta según el estado del cliente (N4). */
export function fondoDeEstado(color: string): string {
  return conAlfa(colorDeEstado(color), 0.12);
}

/** Borde suave (pastel) de tarjeta según el estado. */
export function bordeDeEstado(color: string): string {
  return conAlfa(colorDeEstado(color), 0.3);
}

/**
 * Indicador de color de una tarjeta/cliente: un punto circular del color
 * semántico, sin texto (A8). Aplica en listas de clientes, lista del día y
 * tarjeta de cliente. Con `animar` el punto titila (parpadeo de opacidad en
 * bucle), usado en la lista de carteras para señalar el estado.
 */
export function ColorBadge({
  color,
  animar = false,
}: {
  color: string;
  label?: string;
  animar?: boolean;
}) {
  const [opacidad] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (!animar) {
      return undefined;
    }
    const animacion = Animated.loop(
      Animated.sequence([
        Animated.timing(opacidad, {
          toValue: 0.15,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.timing(opacidad, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
      ]),
    );
    animacion.start();
    return () => animacion.stop();
  }, [animar, opacidad]);

  return (
    <Animated.View
      testID={`color-badge-${color}`}
      style={[
        styles.punto,
        { backgroundColor: colorDeEstado(color) },
        animar ? { opacity: opacidad } : null,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  punto: {
    width: 14,
    height: 14,
    borderRadius: 999,
  },
});
