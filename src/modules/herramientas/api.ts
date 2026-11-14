import type { ClienteAdmin } from "@core/api/admin";
import type { components } from "@core/api/schema";

export type DlqEntry = components["schemas"]["DlqEntry"];
export type PlatformTenant = components["schemas"]["PlatformTenant"];
export type PlanInfo = components["schemas"]["PlanInfo"];

export interface PaginaDlq {
  entries: DlqEntry[];
}

export interface PaginaTenants {
  items: PlatformTenant[];
  page: number;
  has_more: boolean;
  total: number;
}

export async function cargarDlq(api: ClienteAdmin): Promise<PaginaDlq> {
  return api.get<PaginaDlq>("/admin/dlq");
}

export async function reintentarDlq(api: ClienteAdmin, entryId: string): Promise<void> {
  await api.post(`/admin/dlq/${entryId}/retry`);
}

/** Solo master de plataforma. */
export async function cargarNegocios(api: ClienteAdmin, q?: string): Promise<PaginaTenants> {
  return api.get<PaginaTenants>("/admin/platform/tenants", { q, page_size: 30 });
}

/** Catálogo de planes que se pueden asignar a un negocio desde plataforma. */
export async function cargarPlanes(api: ClienteAdmin): Promise<PlanInfo[]> {
  const respuesta = await api.get<{ plans: PlanInfo[] }>("/admin/plan");
  return respuesta.plans;
}

export async function accionNegocio(
  api: ClienteAdmin,
  tenantId: string,
  accion: "activate" | "deactivate",
): Promise<void> {
  await api.post(`/admin/platform/tenants/${tenantId}/${accion}`);
}

/** Cambia el plan y suma días al período actual (mismo contrato que el panel web). */
export async function cambiarPlanNegocio(
  api: ClienteAdmin,
  tenantId: string,
  planId: string,
  extendDays: number,
): Promise<void> {
  await api.post(`/admin/platform/tenants/${tenantId}/plan`, {
    plan_id: planId,
    extend_days: extendDays,
  });
}

/**
 * Eliminación física e irreversible de un negocio (invariante 8), igual que en el
 * panel web: el core solo purga negocios suspendidos (409 `tenant_not_suspended`)
 * y exige la frase exacta `ELIMINAR <slug>`.
 */
export function sePuedeEliminar(status: string): boolean {
  return status === "suspended";
}

export function fraseDeEliminar(slug: string): string {
  return `ELIMINAR ${slug}`;
}

export const AVISO_DESACTIVAR_PRIMERO =
  "Para eliminar un negocio, primero hay que desactivarlo. Suspéndelo y luego escribe la frase de confirmación.";

export const MENSAJE_NO_SUSPENDIDO =
  "No se eliminó: el negocio sigue activo. Suspéndelo primero y vuelve a intentarlo.";

export async function purgarNegocio(api: ClienteAdmin, tenantId: string, fraseConfirmacion: string): Promise<void> {
  await api.post(`/admin/platform/tenants/${tenantId}/purge`, { confirm_phrase: fraseConfirmacion });
}
