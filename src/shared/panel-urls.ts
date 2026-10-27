import { apiRoot } from "@core/config";

/**
 * Enlaces al panel web que la app abre en el navegador (OAuth de Google y
 * fichas de conexión). El panel y la API comparten host; `tenant` le dice al
 * panel en qué negocio está la app para no conectar la cuenta en otro.
 */

function conTenant(base: string, tenantId: string | null): string {
  return tenantId ? `${base}${base.includes("?") ? "&" : "?"}tenant=${encodeURIComponent(tenantId)}` : base;
}

/** Agenda del panel con el cajón de ajustes abierto (donde se conecta otra cuenta de Google). */
export function urlPanelAgenda(tenantId: string | null, seccion: "agendas" | "tipos" | "horario" = "agendas"): string {
  return conTenant(`${apiRoot()}/calendario?ajustes=${seccion}`, tenantId);
}

/** Ficha de una conexión de Google Calendar en el panel. */
export function urlPanelConexion(connectionId: string): string {
  return `${apiRoot()}/conexiones/${encodeURIComponent(connectionId)}`;
}

/** Conexiones del panel (lista de canales). */
export function urlPanelConexiones(tenantId: string | null): string {
  return conTenant(`${apiRoot()}/conexiones`, tenantId);
}
