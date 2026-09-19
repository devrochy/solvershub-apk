import type { ClienteGestorPublic } from "../types/gestor";

export type FiltroClientes = "todos" | "al_dia" | "en_mora" | "sin_prestamos";

/**
 * Filtros de la lista de clientes:
 * - `al_dia`: tiene préstamo vigente y sin cuotas vencidas.
 * - `en_mora`: tiene cuotas vencidas (diasMora > 0).
 * - `sin_prestamos`: no tiene préstamos vigentes.
 */
export function filtrarClientes(
  clientes: ClienteGestorPublic[],
  filtro: FiltroClientes,
): ClienteGestorPublic[] {
  switch (filtro) {
    case "al_dia":
      return clientes.filter((c) => c.numPrestamos > 0 && c.diasMora === 0);
    case "en_mora":
      return clientes.filter((c) => c.diasMora > 0);
    case "sin_prestamos":
      return clientes.filter((c) => c.numPrestamos === 0);
    default:
      return clientes;
  }
}
