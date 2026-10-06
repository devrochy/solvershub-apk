import type { ClienteAdmin } from "@core/api/admin";
import type { components } from "@core/api/schema";

export type DashboardResponse = components["schemas"]["DashboardResponse"];
export type ResumenCobranzaResponse = components["schemas"]["Summary"];

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
