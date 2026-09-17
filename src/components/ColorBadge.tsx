import { useEffect, useState } from "react";
import { Animated, StyleSheet } from "react-native";

const COLORES: Record<string, string> = {
  verde: "#16a34a",
  rojo: "#dc2626",
  azul: "#172f6c",
  blanco: "#94a3b8",
};

const FONDOS: Record<string, string> = {
  verde: "#dcfce7",
  rojo: "#fee2e2",
  azul: "#dbeafe",
  blanco: "#f1f5f9",
};

const BORDES: Record<string, string> = {
  verde: "#bbf7d0",
  rojo: "#fecaca",
  azul: "#bfdbfe",
  blanco: "#e2e8f0",
};

/** Color sólido de un estado (verde/rojo/azul/blanco). */
export function colorDeEstado(color: string): string {
  return COLORES[color] ?? "#94a3b8";
}

/** Fondo suave (pastel) de tarjeta según el estado del cliente (N4). */
export function fondoDeEstado(color: string): string {
  return FONDOS[color] ?? "#f1f5f9";
}

/** Borde suave (pastel) de tarjeta según el estado. */
export function bordeDeEstado(color: string): string {
  return BORDES[color] ?? "#e2e8f0";
}

const COLOR_POR_DEFECTO = "#94a3b8";

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
        { backgroundColor: COLORES[color] ?? COLOR_POR_DEFECTO },
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
