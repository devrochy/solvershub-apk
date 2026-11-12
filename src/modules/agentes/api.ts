import type { ClienteAdmin } from "@core/api/admin";
import type { components } from "@core/api/schema";

export type VistaDeAgentes = components["schemas"]["AgentsOverview"];
export type AgenteDeLista = components["schemas"]["AgentOverviewItem"];
export type PlantillaAgente = components["schemas"]["AgentTemplate"];
export type RequisitoDeAgente = components["schemas"]["Requirement"];
export type DestinoDePublicacion = components["schemas"]["PublishTarget"];
export type CreacionDeAgente = components["schemas"]["FromScriptOut"];
export type PublicacionDeAgente = components["schemas"]["EditorPublishOut"];

export type HabilidadDeAgente = components["schemas"]["AgentSkill"];
export type AccionDeAgente = components["schemas"]["AgentAction"];
export type CuentaDePago = components["schemas"]["PaymentAccount"];

type Pagina<T> = { items: T[]; has_more: boolean };

/** Todas las páginas de una lista paginada (el backend corta en 100 por página). */
async function todas<T>(api: ClienteAdmin, ruta: string): Promise<T[]> {
  const items: T[] = [];
  for (let page = 1; page <= 20; page++) {
    const pagina = await api.get<Pagina<T>>(ruta, { page, page_size: 100 });
    items.push(...pagina.items);
    if (!pagina.has_more) break;
  }
  return items;
}

/** Habilidades que se agregan al agente (Pagos en línea, Conocimiento) y si este agente las tiene (ADR-0190). */
export async function cargarHabilidades(api: ClienteAdmin, agentId: string): Promise<HabilidadDeAgente[]> {
  return todas<HabilidadDeAgente>(api, `/admin/agents/${agentId}/skills`);
}

/** Acciones de las habilidades del agente, con su clave de grupo (`pedidos`, `citas`…) y su estado en el borrador. */
export async function cargarAcciones(api: ClienteAdmin, agentId: string): Promise<AccionDeAgente[]> {
  return todas<AccionDeAgente>(api, `/admin/agents/${agentId}/actions`);
}

/** Cuentas Wompi del negocio (pide permiso de lectura en habilidades). */
export async function cargarCuentasDePago(api: ClienteAdmin): Promise<CuentaDePago[]> {
  return api.get<CuentaDePago[]>("/pack/payments/accounts");
}

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
