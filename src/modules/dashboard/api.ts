import type { ClienteAdmin } from "@core/api/admin";
import type { components } from "@core/api/schema";

export type DashboardResponse = components["schemas"]["DashboardResponse"];
export type ResumenCobranzaResponse = components["schemas"]["Summary"];
export type ResumenPorAgente = components["schemas"]["ResumenPorAgente"];
export type AgenteResumen = components["schemas"]["AgenteResumen"];
export type ModuloResumen = components["schemas"]["ModuloOut"];
export type KpiResumen = components["schemas"]["KpiOut"];
export type DestinoResumen = components["schemas"]["DestinoOut"];

/** KPIs del negocio (equivalente al Resumen del panel web, HU-APP-04). */
export async function cargarDashboard(cliente: ClienteAdmin): Promise<DashboardResponse> {
  return cliente.get<DashboardResponse>("/admin/dashboard");
}

/** KPIs del pack de cobranza (solo si el usuario tiene la sección). */
export async function cargarResumenCobranza(
  cliente: ClienteAdmin,
): Promise<ResumenCobranzaResponse> {
  return cliente.get<ResumenCobranzaResponse>("/pack/cobranza/summary");
}

/**
 * KPIs del agente general y de cada especialista con los de su módulo, 7 días contra los 7
 * previos (ADR-0171). El backend omite lo que el usuario no puede ver; si el endpoint falla, el
 * Resumen cae a las tarjetas de siempre.
 */
export async function cargarResumenAgentes(cliente: ClienteAdmin): Promise<ResumenPorAgente> {
  return cliente.get<ResumenPorAgente>("/admin/dashboard/agents");
}
