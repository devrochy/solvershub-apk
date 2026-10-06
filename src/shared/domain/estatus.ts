const ETIQUETAS: Record<string, string> = {
  activo: "Activo",
  bloqueado: "Bloqueado",
  vigente: "Vigente",
  liquidado: "Liquidado",
  pagada: "Pagada",
  pendiente: "Pendiente",
  atrasada: "Atrasada",
  pendiente_revalidacion: "Pendiente de revalidación",
  revocado: "Revocado",
};

/**
 * Etiqueta legible para un estatus crudo del backend (p. ej. `vigente` →
 * "Vigente"). Si es desconocido, capitaliza y reemplaza `_` por espacios.
 */
export function etiquetaEstatus(estatus: string): string {
  const valor = estatus.trim();
  if (!valor) {
    return "";
  }
  if (ETIQUETAS[valor]) {
    return ETIQUETAS[valor];
  }
  const legible = valor.replace(/_/g, " ");
  return legible.charAt(0).toUpperCase() + legible.slice(1);
}
