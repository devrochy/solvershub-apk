import { AdminApiError, type ClienteAdmin } from "@core/api/admin";
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
  notas = "",
): Promise<PublicacionDeAgente> {
  return api.post<PublicacionDeAgente>(`/admin/agents/${agentId}/publish`, { connection_ids: conexiones, notes: notas });
}

// ------------------------------------------------------------ ruta de lanzamiento (HU-APP-23, SPEC-49)

export type Superpoder = components["schemas"]["Superpower"];
export type BorradorDelAgente = components["schemas"]["AgentDraft"];
export type DetalleDeAgente = components["schemas"]["AgentDetail"];
export type FormasDePago = components["schemas"]["FormasDePagoOut"];
export type FormasDePagoIn = components["schemas"]["FormasDePagoIn"];
export type CuentaDeTransferencia = components["schemas"]["CuentaDeTransferencia"];

/** El agente con su borrador (para retomar Nuevo agente: si sigue sin publicar, su tipo y su nombre). */
export async function cargarAgente(api: ClienteAdmin, agentId: string): Promise<DetalleDeAgente> {
  return api.get<DetalleDeAgente>(`/admin/agents/${agentId}`);
}

/** Superpoderes que el agente puede tener, filtrados por su enfoque (su plantilla). */
export async function cargarSuperpoderes(api: ClienteAdmin, agentId: string): Promise<Superpoder[]> {
  const items: Superpoder[] = [];
  for (let page = 1; page <= 20; page++) {
    const pagina = await api.get<Pagina<Superpoder>>("/admin/agent-superpowers", { agent_id: agentId, page, page_size: 100 });
    items.push(...pagina.items);
    if (!pagina.has_more) break;
  }
  return items;
}

/** Frases mínimas por superpoder (`min_phrases` de `/admin/agent-models`); 3 si no responde. */
export async function cargarMinimoDeFrases(api: ClienteAdmin): Promise<number> {
  const res = await api.get<{ min_phrases?: number }>("/admin/agent-models", { page_size: 1 });
  return typeof res.min_phrases === "number" ? res.min_phrases : 3;
}

export async function cargarBorrador(api: ClienteAdmin, agentId: string): Promise<BorradorDelAgente> {
  return api.get<BorradorDelAgente>(`/admin/agents/${agentId}/draft`);
}

/** Guarda el borrador completo (`content`) con el `lock_version` leído; 409 `stale_lock_version` si cambió. */
export async function guardarBorrador(
  api: ClienteAdmin,
  agentId: string,
  content: Record<string, unknown>,
  lockVersion: number,
): Promise<BorradorDelAgente> {
  return api.put<BorradorDelAgente>(`/admin/agents/${agentId}/draft`, { content, lock_version: lockVersion });
}

/** Formas de pago del agente de Ventas («Al cobrar»); `null` si el agente no tiene Comercio (404). */
export async function cargarFormasDePago(api: ClienteAdmin, agentId: string): Promise<FormasDePago | null> {
  try {
    return await api.get<FormasDePago>(`/pack/commerce/agents/${agentId}/payment-forms`);
  } catch (e) {
    if (e instanceof AdminApiError && e.status === 404) return null;
    throw e;
  }
}

export async function guardarFormasDePago(api: ClienteAdmin, agentId: string, formas: FormasDePagoIn): Promise<FormasDePago> {
  return api.put<FormasDePago>(`/pack/commerce/agents/${agentId}/payment-forms`, formas);
}

/** Agrega o configura una habilidad del agente (Pagos en línea con su cuenta Wompi: `config.cuenta_id`). */
export async function guardarHabilidad(
  api: ClienteAdmin,
  agentId: string,
  packId: string,
  cuerpo: { installed: boolean; config?: Record<string, unknown> | null },
): Promise<HabilidadDeAgente> {
  return api.put<HabilidadDeAgente>(`/admin/agents/${agentId}/skills/${packId}`, cuerpo);
}

/** Cambia el nombre (o la descripción) del agente. */
export async function renombrarAgente(api: ClienteAdmin, agentId: string, name: string): Promise<void> {
  await api.patch(`/admin/agents/${agentId}`, { name });
}

/** «Desarchívalo»: el agente archivado vuelve a estar activo (se puede editar y publicar). */
export async function desarchivarAgente(api: ClienteAdmin, agentId: string): Promise<void> {
  await api.patch(`/admin/agents/${agentId}`, { status: "active" });
}

/** Activa en la conexión la versión recién publicada (la decisión de «Publicar» al crear, D-SPEC-49-9). */
export async function activarVersion(api: ClienteAdmin, connectionId: string, releaseId: string): Promise<void> {
  await api.post(`/admin/connections/${connectionId}/releases/${releaseId}/promote`);
}

// ------------------------------------------------------------ datos del cliente (HU-APP-24, HU-CRM-28)

export type AgenteDatos = components["schemas"]["AgenteDatosOut"];
export type AgenteDatosIn = components["schemas"]["AgenteDatosUpdate"];

/** Qué datos pide el agente en cada operación, con su `por_defecto`, si se puede ajustar y sus tipos de pedido. */
export async function cargarDatosCliente(api: ClienteAdmin, agentId: string): Promise<AgenteDatos> {
  return api.get<AgenteDatos>(`/admin/agents/${agentId}/datos-cliente`);
}

/**
 * Guarda `politica` (solo lo que difiere del `por_defecto`), `herramientas_del_agente` y `metodos_entrega`;
 * 422 `metodos_entrega_vacios` si no queda ningún tipo de pedido.
 */
export async function guardarDatosCliente(api: ClienteAdmin, agentId: string, cuerpo: AgenteDatosIn): Promise<AgenteDatos> {
  return api.put<AgenteDatos>(`/admin/agents/${agentId}/datos-cliente`, cuerpo);
}
