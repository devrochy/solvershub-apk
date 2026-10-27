import type { ClienteAdmin } from "@core/api/admin";
import type { components } from "@core/api/schema";

export type VistaDeAgentes = components["schemas"]["AgentsOverview"];
export type AgenteDeLista = components["schemas"]["AgentOverviewItem"];
export type PlantillaAgente = components["schemas"]["AgentTemplate"];
export type RequisitoDeAgente = components["schemas"]["Requirement"];
export type DestinoDePublicacion = components["schemas"]["PublishTarget"];
export type CreacionDeAgente = components["schemas"]["FromScriptOut"];
export type PublicacionDeAgente = components["schemas"]["EditorPublishOut"];

export async function cargarAgentes(api: ClienteAdmin): Promise<VistaDeAgentes> {
  return api.get<VistaDeAgentes>("/admin/agents/overview");
}

export async function cargarPlantillas(api: ClienteAdmin): Promise<PlantillaAgente[]> {
  const pagina = await api.get<{ items: PlantillaAgente[] }>("/admin/agent-templates", { page_size: 100 });
  return pagina.items;
}

/** Crea el borrador (sin publicar) desde las respuestas del guion; 422 por pregunta y 409 `key_taken`. */
export async function crearDesdeGuion(
  api: ClienteAdmin,
  cuerpo: { template_key: string; answers: Record<string, string>; name?: string },
): Promise<CreacionDeAgente> {
  return api.post<CreacionDeAgente>("/admin/agents/from-script", cuerpo);
}

export async function cargarDestinos(api: ClienteAdmin, agentId: string): Promise<DestinoDePublicacion[]> {
  const pagina = await api.get<{ items: DestinoDePublicacion[] }>(`/admin/agents/${agentId}/publish-targets`, {
    page_size: 100,
  });
  return pagina.items;
}

export async function publicarAgente(
  api: ClienteAdmin,
  agentId: string,
  conexiones: string[],
): Promise<PublicacionDeAgente> {
  return api.post<PublicacionDeAgente>(`/admin/agents/${agentId}/publish`, { connection_ids: conexiones });
}
