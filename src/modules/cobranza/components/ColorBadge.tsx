import { useEffect, useState } from "react";
import { Animated, StyleSheet } from "react-native";

import type { Tema } from "@core/theme/theme";
import { kitDeTema, useKit, useReduceMotion, type Tono } from "@shared/ui";

/**
 * Colores de estado del cliente (verde/rojo/azul/blanco) sobre los tonos del
 * kit (HU-DS-10): verde → `success`, rojo → `danger`, azul → `info` y blanco o
 * desconocido → `neutral`. Así sólidos y pasteles salen de los mismos tokens
 * de estado que el panel (`statusXFg/Bg/Border`).
 */
const TONOS: Record<string, Tono> = {
  verde: "success",
  rojo: "danger",
  azul: "info",
  blanco: "neutral",
};

/** Tono del kit para un estado del cliente. */
export function tonoDeEstado(color: string): Tono {
  return TONOS[color] ?? "neutral";
}

/**
 * Color sólido de un estado. Por defecto, el del tema claro: es el que da AA
 * con texto blanco encima (cabeceras de tarjeta). Para un punto o una barra
 * sin texto encima se pasa el tema activo.
 */
export function colorDeEstado(color: string, tema: Tema = "claro"): string {
  return kitDeTema(tema).tonos[tonoDeEstado(color)].fg;
}

/** Fondo suave (pastel) de tarjeta según el estado del cliente (N4). */
export function fondoDeEstado(color: string, tema: Tema = "claro"): string {
  return kitDeTema(tema).tonos[tonoDeEstado(color)].bg;
}

/** Borde suave (pastel) de tarjeta según el estado. */
export function bordeDeEstado(color: string, tema: Tema = "claro"): string {
  return kitDeTema(tema).tonos[tonoDeEstado(color)].border;
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
  const { tema } = useKit();
  const reducir = useReduceMotion();
  const [opacidad] = useState(() => new Animated.Value(1));

  useEffect(() => {
    // Con "reducir movimiento" el punto queda fijo (DESIGN.md, motion).
    if (!animar || reducir) {
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
  }, [animar, reducir, opacidad]);

  return (
    <Animated.View
      testID={`color-badge-${color}`}
      style={[
        styles.punto,
        { backgroundColor: colorDeEstado(color, tema) },
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
