import type { ClienteAdmin } from "@core/api/admin";
import type { components } from "@core/api/schema";

export type DlqEntry = components["schemas"]["DlqEntry"];
export type PlatformTenant = components["schemas"]["PlatformTenant"];

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

export async function accionNegocio(
  api: ClienteAdmin,
  tenantId: string,
  accion: "activate" | "deactivate",
): Promise<void> {
  await api.post(`/admin/platform/tenants/${tenantId}/${accion}`);
}
