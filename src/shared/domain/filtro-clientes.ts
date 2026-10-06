import type { ClienteGestorPublic } from "@shared/types/gestor";

export type FiltroClientes = "todos" | "al_dia" | "en_mora" | "sin_prestamos";

/** Estado de un cliente (excluye el filtro "todos"). */
export type EstadoCliente = Exclude<FiltroClientes, "todos">;

/**
 * Estado de un cliente según sus préstamos vigentes:
 * - `en_mora`: tiene cuotas vencidas (diasMora > 0), aunque tenga otro préstamo al día.
 * - `sin_prestamos`: no tiene préstamos vigentes.
 * - `al_dia`: tiene préstamo vigente y sin mora.
 */
export function estadoCliente(cliente: ClienteGestorPublic): EstadoCliente {
  if (cliente.diasMora > 0) {
    return "en_mora";
  }
  if (cliente.numPrestamos === 0) {
    return "sin_prestamos";
  }
  return "al_dia";
}

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
  if (filtro === "todos") {
    return clientes;
  }
  return clientes.filter((c) => estadoCliente(c) === filtro);
}
