import type { ClienteDiaPublic } from "../types/cobrador";

/**
 * Cuenta los clientes en mora (color rojo) de una lista del día.
 * Usado por los KPIs de `RutasScreen`/`SeleccionRutaScreen` y `RutaDetalleScreen`.
 */
export function contarEnMora(clientes: ClienteDiaPublic[]): number {
  return clientes.filter((c) => c.color === "rojo").length;
}
