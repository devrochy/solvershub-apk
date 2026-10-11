/**
 * Motion del kit sobre `shMotion` (SPEC-29 §7). Con "reducir movimiento" del
 * sistema todas las duraciones valen 0 (la animación salta al estado final).
 *
 * HU-DS-12 (motion y microinteracciones) puede subir esto a
 * `src/core/theme/motion.ts`, como prevé el diseño.
 */
import { useEffect, useState } from "react";
import { AccessibilityInfo, Easing } from "react-native";
import { shMotion } from "@core/theme/tokens";

export type DuracionMotion = keyof typeof shMotion.duration;
export type CurvaMotion = keyof typeof shMotion.easing;

/** `true` si el usuario activó "reducir movimiento" (se actualiza en vivo). */
export function useReduceMotion(): boolean {
  const [reducir, setReducir] = useState(false);
  useEffect(() => {
    let vivo = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((valor) => {
        if (vivo) setReducir(valor);
      })
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReducir);
    return () => {
      vivo = false;
      sub?.remove();
    };
  }, []);
  return reducir;
}

/** Duración en ms del token, o 0 con movimiento reducido. */
export function duracion(nombre: DuracionMotion, reducir: boolean): number {
  return reducir ? 0 : shMotion.duration[nombre];
}

/** Curva del token como `Easing.bezier`. */
export function curva(nombre: CurvaMotion) {
  const [x1, y1, x2, y2] = shMotion.easing[nombre];
  return Easing.bezier(x1, y1, x2, y2);
}
