import { PANEL_URL } from "@core/config";

/**
 * Enlaces al panel web que la app abre en el navegador (OAuth de Google y
 * fichas de conexión). El panel y la API comparten host; `tenant` le dice al
 * panel en qué negocio está la app para no conectar la cuenta en otro.
 */

function conTenant(base: string, tenantId: string | null): string {
  return tenantId ? `${base}${base.includes("?") ? "&" : "?"}tenant=${encodeURIComponent(tenantId)}` : base;
}

/** Ruta del panel donde vive la wiki (solo con sesión del panel: el navegador pedirá iniciar sesión). */
const RUTA_DOCUMENTACION = "/ayuda";

/** Wiki de documentación del panel; `null` si no hay host de panel configurado (el ítem no se muestra). */
export function urlDocumentacion(panelUrl: string = PANEL_URL): string | null {
  const base = panelUrl.trim().replace(/\/+$/, "");
  return base ? `${base}${RUTA_DOCUMENTACION}` : null;
}

/** Destino de «Documentación» en la tarjeta de cuenta, derivado del host del panel del entorno. */
export const URL_DOCUMENTACION: string | null = urlDocumentacion();

/** Agenda del panel con el cajón de ajustes abierto (donde se conecta otra cuenta de Google). */
export function urlPanelAgenda(tenantId: string | null, seccion: "agendas" | "tipos" | "horario" = "agendas"): string {
  return conTenant(`${PANEL_URL}/calendario?ajustes=${seccion}`, tenantId);
}

/** Ficha de una conexión de Google Calendar en el panel. */
export function urlPanelConexion(connectionId: string): string {
  return `${PANEL_URL}/conexiones/${encodeURIComponent(connectionId)}`;
}

/** Conexiones del panel (lista de canales). */
export function urlPanelConexiones(tenantId: string | null): string {
  return conTenant(`${PANEL_URL}/conexiones`, tenantId);
}

type DestinoPanel = { ruta: string; params?: Record<string, string> };

/**
 * URL del panel web para un destino lógico del Resumen (ADR-0171). La app usa su propia
 * pantalla cuando existe; cuando no (agentes, suscripciones), abre esta en el navegador.
 */
export function urlPanelDestino(destino: DestinoPanel, tenantId: string | null): string | null {
  const p = destino.params ?? {};
  const qs = (permitidos: string[]): string => {
    const params = new URLSearchParams();
    for (const clave of permitidos) if (p[clave]) params.set(clave, p[clave]);
    const texto = params.toString();
    return texto ? `?${texto}` : "";
  };
  switch (destino.ruta) {
    case "conversaciones":
      return conTenant(`${PANEL_URL}/conversaciones`, tenantId);
    case "escalaciones":
      return conTenant(`${PANEL_URL}/escalaciones${qs(["estado"])}`, tenantId);
    case "costos":
      return conTenant(`${PANEL_URL}/costos`, tenantId);
    case "agente": {
      if (!p.ref) return null;
      const tab = p.pestana && p.pestana !== "conversaciones" ? `?tab=${encodeURIComponent(p.pestana)}` : "";
      return conTenant(`${PANEL_URL}/agentes/${encodeURIComponent(p.ref)}${tab}`, tenantId);
    }
    case "comercio.pedidos":
      return conTenant(`${PANEL_URL}/comercio/pedidos${qs(["estado", "pago"])}`, tenantId);
    case "calendario.citas":
      return conTenant(`${PANEL_URL}/calendario`, tenantId);
    case "cobranza.pagos":
      return conTenant(`${PANEL_URL}/cobranza/pagos`, tenantId);
    case "cobranza.carteras":
      return conTenant(`${PANEL_URL}/cobranza/carteras${qs(["mora"])}`, tenantId);
    case "cobranza.promesas":
      return conTenant(`${PANEL_URL}/cobranza/promesas${qs(["estado"])}`, tenantId);
    case "suscripciones":
      return conTenant(`${PANEL_URL}/suscripciones`, tenantId);
    case "suscripciones.lista":
      return conTenant(`${PANEL_URL}/suscripciones/lista${qs(["estado"])}`, tenantId);
    case "suscripciones.pagos":
      return conTenant(`${PANEL_URL}/suscripciones/pagos${qs(["vencidos"])}`, tenantId);
    case "leads":
      return conTenant(`${PANEL_URL}/leads`, tenantId);
    default:
      return null;
  }
}
