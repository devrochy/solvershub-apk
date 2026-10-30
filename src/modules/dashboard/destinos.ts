import { urlPanelDestino } from "@shared/panel-urls";
import type { DestinoNavegacion } from "@shared/navegacion-evento";
import type { DestinoResumen } from "./api";

/**
 * Del destino lógico del backend (`ruta`) a la navegación de la app (ADR-0171).
 *
 * El backend no conoce las pantallas: manda `comercio.pedidos`, no una URL. Aquí vive la tabla.
 * Cuando la app no tiene la pantalla (agentes, suscripciones), `urlDeResumen` devuelve la del
 * panel web para que la cifra siga siendo accionable.
 */
const DESTINOS: Record<string, DestinoNavegacion> = {
  conversaciones: { tab: "conversaciones", pestana: "conversaciones" },
  escalaciones: { tab: "conversaciones", pestana: "escalaciones" },
  leads: { tab: "conversaciones", pestana: "leads" },
  costos: { tab: "negocio", pestana: "costos" },
  "comercio.pedidos": { tab: "comercio", pestana: "pedidos" },
  "calendario.citas": { tab: "calendario", pestana: "semana" },
  "cobranza.pagos": { tab: "cobranza", pestana: "pagos" },
  "cobranza.carteras": { tab: "cobranza", pestana: "carteras" },
  "cobranza.promesas": { tab: "cobranza", pestana: "promesas" },
};

export function destinoDeResumen(
  destino: DestinoResumen | null | undefined,
): DestinoNavegacion | undefined {
  if (!destino) return undefined;
  return DESTINOS[destino.ruta];
}

/** URL del panel para lo que la app no tiene; `null` si la ruta no existe en ninguno de los dos. */
export function urlDeResumen(
  destino: DestinoResumen | null | undefined,
  tenantId: string | null,
): string | null {
  if (!destino) return null;
  return urlPanelDestino(destino, tenantId);
}
