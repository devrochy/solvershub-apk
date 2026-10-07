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
