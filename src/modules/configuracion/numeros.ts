/** Campos numéricos de Configuración: el borrador es texto y aquí se limpia, se lee y se valida. */

/** Número del texto (acepta coma decimal); `null` si está vacío o no es un número completo. */
export function leerNumero(texto: string): number | null {
  const limpio = texto.trim().replace(",", ".");
  if (!/\d/.test(limpio)) return null;
  const n = Number(limpio.endsWith(".") ? limpio.slice(0, -1) : limpio);
  return Number.isFinite(n) ? n : null;
}

/**
 * Lo que queda de lo escrito en un campo numérico: solo dígitos (y un separador decimal si se
 * permite), sin ceros a la izquierda de sobra (`04` → `4`; `0,5` se conserva).
 */
export function limpiarNumero(texto: string, decimal: boolean): string {
  let salida = "";
  let hayCorte = false;
  for (const c of texto) {
    if (c >= "0" && c <= "9") salida += c;
    else if (decimal && (c === "." || c === ",") && !hayCorte) {
      hayCorte = true;
      salida += c;
    }
  }
  return salida.replace(/^0+(?=\d)/, "");
}

export interface RangoNumero {
  min?: number;
  max?: number;
  decimal?: boolean;
}

/** Mensaje si el texto no es un número válido dentro del rango, o `null` si está bien. */
export function errorDeNumero(etiqueta: string, texto: string, { min, max, decimal = false }: RangoNumero): string | null {
  const n = leerNumero(texto);
  if (n === null) return `«${etiqueta}» necesita un número.`;
  if (!decimal && !Number.isInteger(n)) return `«${etiqueta}» debe ser un número entero.`;
  if ((min !== undefined && n < min) || (max !== undefined && n > max)) {
    if (min !== undefined && max !== undefined) return `«${etiqueta}» debe estar entre ${min} y ${max}.`;
    return min !== undefined ? `«${etiqueta}» debe ser ${min} o más.` : `«${etiqueta}» debe ser ${max} o menos.`;
  }
  return null;
}
