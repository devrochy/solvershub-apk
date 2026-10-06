/** Utilidades de color sobre los tokens (tema RN). */

/** Hex (#RRGGBB) → rgba con alfa, para tonos suaves derivados de un token. */
export function conAlfa(hex: string, alfa: number): string {
  const limpio = hex.replace("#", "");
  const r = parseInt(limpio.slice(0, 2), 16);
  const g = parseInt(limpio.slice(2, 4), 16);
  const b = parseInt(limpio.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alfa})`;
}
