import type { ClienteTrayectoDiarioPublic } from "@shared/types/gestor";

/**
 * Cuenta los clientes en mora (color rojo) de una lista del día.
 * Usado por los KPIs de `CarterasScreen`/`SeleccionCarteraScreen` y `CarteraDetalleScreen`.
 */
export function contarEnMora(clientes: ClienteTrayectoDiarioPublic[]): number {
  return clientes.filter((c) => c.color === "rojo").length;
}
