import type { ClienteAdmin } from "@core/api/admin";
import type { components } from "@core/api/schema";

export type CollaboratorItem = components["schemas"]["CollaboratorItem"];
export type PluginSummary = components["schemas"]["PluginSummary"];
export type ConnectionItem = components["schemas"]["ConnectionItem"];
export type ConnectionsResponse = components["schemas"]["ConnectionsResponse"];

export async function cargarColaboradores(api: ClienteAdmin): Promise<CollaboratorItem[]> {
  return api.get<CollaboratorItem[]>("/admin/collaborators");
}

/** Activa/desactiva una cuenta (POST sin cuerpo: alterna `active`). */
export async function alternarColaborador(api: ClienteAdmin, id: string): Promise<void> {
  await api.post(`/admin/collaborators/${id}/toggle`);
}

export async function cargarHabilidades(api: ClienteAdmin): Promise<PluginSummary[]> {
  return api.get<PluginSummary[]>("/admin/plugins");
}

export async function accionHabilidad(
  api: ClienteAdmin,
  id: string,
  action: "activate" | "deactivate" | "retry",
): Promise<void> {
  await api.post(`/admin/plugins/${id}/action`, { action });
}

export async function cargarConexiones(api: ClienteAdmin): Promise<ConnectionsResponse> {
  return api.get<ConnectionsResponse>("/admin/connections");
}


// ---------------- HU-APP-20 · escrituras móviles ----------------

export async function invitarColaborador(
  api: ClienteAdmin,
  datos: { email: string; password: string; role: string },
): Promise<void> {
  await api.post("/admin/collaborators", datos);
}

// ---------------- HU-APP-21 · plan, plantillas y plataforma ----------------

export interface PlanInfoItem {
  id: string;
  name: string;
  price_cop?: number | null;
  is_free?: boolean;
  current?: boolean;
  limits?: unknown;
  features?: unknown;
}

export interface PlanResumen {
  overview: {
    plan_id?: string | null;
    plan_name?: string | null;
    status?: string | null;
    operational?: boolean;
    days_left?: number | null;
    has_plan?: boolean;
  };
  usage?: Record<string, unknown>;
  payments?: unknown[];
  plans?: PlanInfoItem[];
}

export async function cargarPlan(api: ClienteAdmin): Promise<PlanResumen> {
  return api.get<PlanResumen>("/admin/plan");
}

export async function suscribirPlan(api: ClienteAdmin, planId: string): Promise<void> {
  await api.post("/admin/plan/subscribe", { plan_id: planId });
}

export interface PlantillaMeta {
  id: string;
  name: string;
  language: string;
  category: string | null;
  status: string;
  quality_score: string | null;
  rejected_reason: string | null;
}

export async function cargarPlantillas(
  api: ClienteAdmin,
  conexionId: string,
): Promise<{ templates: PlantillaMeta[]; at_limit: boolean }> {
  return api.get<{ templates: PlantillaMeta[]; at_limit: boolean }>(
    `/admin/meta/connections/${conexionId}/templates`,
  );
}

export async function sincronizarPlantillas(api: ClienteAdmin, conexionId: string): Promise<void> {
  await api.post(`/admin/meta/connections/${conexionId}/templates/sync`);
}

export async function borrarPlantilla(
  api: ClienteAdmin,
  conexionId: string,
  templateId: string,
): Promise<void> {
  await api.post(`/admin/meta/connections/${conexionId}/templates/${templateId}/delete`);
}

export async function purgarNegocio(api: ClienteAdmin, tenantId: string): Promise<void> {
  await api.post(`/admin/platform/tenants/${tenantId}/purge`);
}
