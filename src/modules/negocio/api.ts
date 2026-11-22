import type { ClienteAdmin } from "@core/api/admin";
import type { components } from "@core/api/schema";

export type PlanResponse = components["schemas"]["PlanResponse"];
export type CostsResponse = components["schemas"]["CostsResponse"];

export async function cargarPlan(cliente: ClienteAdmin): Promise<PlanResponse> {
  return cliente.get<PlanResponse>("/admin/plan");
}

export async function cargarCostos(cliente: ClienteAdmin): Promise<CostsResponse> {
  return cliente.get<CostsResponse>("/admin/costs");
}

/** Link de pago de un paquete de recarga de créditos (HU-BILL-23). */
export async function comprarRecarga(cliente: ClienteAdmin, paquete: string): Promise<{ checkout_url: string }> {
  return cliente.post<{ checkout_url: string }>("/admin/plan/recargas", { paquete });
}
