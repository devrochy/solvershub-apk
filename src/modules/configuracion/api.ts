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

// ---------------- Cierre de réplica: ajustes del agente ----------------

export type SettingsResponse = components["schemas"]["SettingsResponse"];
export type IdentitySettings = components["schemas"]["IdentitySettings"];
export type BrainSettings = components["schemas"]["BrainSettings"];
export type MemorySettings = components["schemas"]["MemorySettings"];

export async function cargarSettings(api: ClienteAdmin): Promise<SettingsResponse> {
  return api.get<SettingsResponse>("/admin/settings");
}

export async function guardarIdentity(
  api: ClienteAdmin,
  values: Partial<IdentitySettings> & { business_tz?: string },
): Promise<void> {
  await api.put<void>("/admin/settings/identity", values);
}

export async function guardarBrain(api: ClienteAdmin, values: BrainSettings): Promise<void> {
  await api.put<void>("/admin/settings/brain", values);
}

export async function guardarMemory(api: ClienteAdmin, values: MemorySettings): Promise<void> {
  await api.put<void>("/admin/settings/memory", values);
}

// --- Chat web y Avanzado (panel: /configuracion, pestañas "Chat web" y "Avanzado") ---

export type WebChatSettings = components["schemas"]["WebChatSettings"];
export type WebChatUpdate = components["schemas"]["WebChatUpdate"];
export type AdvancedResponse = components["schemas"]["AdvancedResponse"];
export type LlmUpdate = components["schemas"]["LlmUpdate"];
export type GuardrailsSettings = components["schemas"]["GuardrailsSettings"];

export async function cargarChatWeb(api: ClienteAdmin): Promise<WebChatSettings> {
  return api.get<WebChatSettings>("/admin/settings/web-chat");
}

export async function guardarChatWeb(
  api: ClienteAdmin,
  values: WebChatUpdate,
): Promise<WebChatSettings> {
  return api.put<WebChatSettings>("/admin/settings/web-chat", values);
}

export async function cargarAvanzado(api: ClienteAdmin): Promise<AdvancedResponse> {
  return api.get<AdvancedResponse>("/admin/settings/advanced");
}

export async function guardarLlm(api: ClienteAdmin, values: LlmUpdate): Promise<void> {
  await api.put<void>("/admin/settings/advanced/llm", values);
}

/** Devuelve las líneas del DSL que el backend ignoró (el resto sí se guarda). */
export async function guardarGuardrails(
  api: ClienteAdmin,
  guardrailsText: string,
): Promise<GuardrailsSettings> {
  return api.put<GuardrailsSettings>("/admin/settings/advanced/guardrails", {
    guardrails_text: guardrailsText,
  });
}

/** Reemplaza el AgentSpec completo; el backend crea versión solo si cambió. */
export async function guardarSpec(api: ClienteAdmin, spec: Record<string, unknown>): Promise<void> {
  await api.put<void>("/admin/settings/advanced/spec", { spec });
}

export async function activarVersionSpec(api: ClienteAdmin, versionId: string): Promise<void> {
  await api.post<void>(`/admin/settings/advanced/versions/${encodeURIComponent(versionId)}/activate`);
}

// ---------------- Cierre de réplica: checklist de Meta ----------------

export type ChecklistOut = components["schemas"]["ChecklistOut"];
export type ChecklistStep = components["schemas"]["ChecklistStep"];
export type PreflightOut = components["schemas"]["PreflightOut"];

export type TipoChecklist = "requirements" | "production";

export async function cargarChecklist(api: ClienteAdmin, tipo: TipoChecklist): Promise<ChecklistOut> {
  return api.get<ChecklistOut>(`/admin/meta/checklist/${tipo}`);
}

export async function guardarPasoChecklist(
  api: ClienteAdmin,
  payload: { step_key: string; done: boolean; notes: string },
): Promise<void> {
  await api.post<void>("/admin/meta/checklist/step", payload);
}

export async function correrChecksProduccion(api: ClienteAdmin): Promise<PreflightOut[]> {
  return api.post<PreflightOut[]>("/admin/meta/checklist/production/run", {});
}
