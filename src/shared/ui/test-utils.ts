import { StyleSheet, type Insets } from "react-native";

/** Lo mínimo de un nodo de RNTL que hace falta para medir su área táctil. */
interface NodoConProps {
  props: { style?: unknown; hitSlop?: number | Insets | null };
}

/**
 * Área táctil efectiva de un control (dp): tamaño mínimo declarado en el estilo
 * (`minHeight`/`height`, `minWidth`/`width`) más el `hitSlop`. Sirve para
 * verificar la regla de 48 × 48 dp de la app sin un layout real.
 */
export function areaTactil(nodo: NodoConProps): { alto: number; ancho: number } {
  const estilo = (StyleSheet.flatten(nodo.props.style as never) ?? {}) as Record<string, unknown>;
  const hit = nodo.props.hitSlop;
  const slop: Required<Insets> =
    typeof hit === "number"
      ? { top: hit, bottom: hit, left: hit, right: hit }
      : { top: hit?.top ?? 0, bottom: hit?.bottom ?? 0, left: hit?.left ?? 0, right: hit?.right ?? 0 };
  const num = (v: unknown) => (typeof v === "number" ? v : 0);
  const alto = Math.max(num(estilo.minHeight), num(estilo.height)) + slop.top + slop.bottom;
  const ancho = Math.max(num(estilo.minWidth), num(estilo.width)) + slop.left + slop.right;
  return { alto, ancho };
}
