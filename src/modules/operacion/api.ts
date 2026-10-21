import type { ClienteAdmin } from "@core/api/admin";
import type { components } from "@core/api/schema";

export type ConversationSummary = components["schemas"]["ConversationSummary"];
export type ConversationDetail = components["schemas"]["ConversationDetail"];
export type EscalationItem = components["schemas"]["EscalationItem"];
/** Fila de Clientes. `telefono` y `bot_paused` llegan desde HU-UX-16 (agent-core #503). */
export type LeadRow = components["schemas"]["LeadRow"] & { telefono?: string | null; bot_paused?: boolean };

/** Ficha del cliente (`GET /admin/leads/{id}`, HU-UX-16 / HU-CRM-02). */
export interface DatoDelCliente {
  namespace: string;
  key: string;
  value: unknown;
  source: string; // tool | agent | human | import
  data_class: string;
  valid_from: string;
}

export interface FichaDelCliente {
  id: string;
  cliente: string;
  nombre: string | null;
  canal: string;
  identificador: string;
  telefono: string | null;
  bot_paused: boolean;
  alta: string | null;
  conexiones: { id: string; label: string; channel: string }[];
  ultima_conversacion_id: string | null;
  datos: DatoDelCliente[];
  extras: Record<string, unknown>;
  columns: { key: string; label: string }[];
  /** Campos que un pack deja cambiar desde la ficha (ADR-0149); el backend viejo no los manda. */
  editables?: CampoEditable[];
}

/** Campo de un pack editable desde la ficha, p. ej. el estado del lead de venta (ADR-0149). */
export interface CampoEditable {
  plugin_id: string;
  key: string;
  label: string;
  tipo: "opciones" | "texto";
  options?: { value: string; label: string }[];
  max_length: number;
  value?: string | null;
}

export interface PaginaConversaciones {
  items: ConversationSummary[];
  page: number;
  total: number;
  has_more: boolean;
}

export interface PaginaEscalaciones {
  items: EscalationItem[];
  page: number;
  total: number;
  has_more: boolean;
}

export interface PaginaLeads {
  items: LeadRow[];
  page: number;
  total: number;
  has_more: boolean;
}

export interface FiltroConversaciones {
  q?: string;
  status?: string;
  page?: number;
}

export async function listarConversaciones(
  api: ClienteAdmin,
  filtro: FiltroConversaciones = {},
): Promise<PaginaConversaciones> {
  return api.get<PaginaConversaciones>("/admin/conversations", {
    q: filtro.q,
    status: filtro.status,
    page: filtro.page,
    page_size: 20,
  });
}

export async function detalleConversacion(
  api: ClienteAdmin,
  id: string,
): Promise<ConversationDetail> {
  return api.get<ConversationDetail>(`/admin/conversations/${id}`);
}

export async function responderConversacion(
  api: ClienteAdmin,
  id: string,
  contenido: string,
): Promise<void> {
  await api.post(`/admin/conversations/${id}/messages`, { content: contenido });
}

export async function resolverConversacion(api: ClienteAdmin, id: string): Promise<void> {
  await api.post(`/admin/conversations/${id}/resolve`);
}

export async function alternarBot(api: ClienteAdmin, id: string): Promise<void> {
  await api.post(`/admin/conversations/${id}/toggle-bot`);
}

export async function listarEscalaciones(
  api: ClienteAdmin,
  page = 1,
): Promise<PaginaEscalaciones> {
  return api.get<PaginaEscalaciones>("/admin/escalations", { page, page_size: 20 });
}

export async function listarLeads(api: ClienteAdmin, q?: string, page = 1): Promise<PaginaLeads> {
  return api.get<PaginaLeads>("/admin/leads", { q, page, page_size: 20 });
}

export async function fichaDelCliente(api: ClienteAdmin, id: string): Promise<FichaDelCliente> {
  return api.get<FichaDelCliente>(`/admin/leads/${id}`);
}

/** Corrige datos del perfil: quedan como dato de una persona y el agente los usa desde ya. */
export async function corregirDatosDelCliente(
  api: ClienteAdmin,
  id: string,
  datos: Record<string, string>,
): Promise<FichaDelCliente> {
  return api.patch<FichaDelCliente>(`/admin/leads/${id}`, { datos });
}

/** Cambia campos que un pack deja editar (estado e interés del lead de venta, ADR-0149). */
export async function editarCamposDelPack(
  api: ClienteAdmin,
  id: string,
  pluginId: string,
  valores: Record<string, string>,
): Promise<FichaDelCliente> {
  return api.patch<FichaDelCliente>(`/admin/leads/${id}/pack/${encodeURIComponent(pluginId)}`, { valores });
}

/**
 * Datos del perfil para «Lo que sabemos» (ADR-0149): sin el nombre (va en el título) ni el teléfono
 * del perfil cuando es el mismo del canal, para no mostrar el mismo dato dos veces.
 */
export function datosDelPerfil(ficha: Pick<FichaDelCliente, "datos" | "telefono">): DatoDelCliente[] {
  const digitos = (v: unknown) => String(v ?? "").replace(/\D+/g, "");
  const canal = digitos(ficha.telefono);
  return ficha.datos.filter(
    (d) => d.namespace === "perfil" && d.key !== "name" && !(d.key === "phone" && canal !== "" && digitos(d.value) === canal),
  );
}

/** Pausa o reanuda el agente para este cliente en todas sus conversaciones. */
export async function alternarAgenteDelCliente(api: ClienteAdmin, id: string): Promise<boolean> {
  const res = await api.post<{ bot_paused: boolean }>(`/admin/leads/${id}/toggle-bot`);
  return res.bot_paused;
}

/** Nota del equipo sobre el cliente (HU-CRM-04). */
export interface NotaDelCliente {
  id: string;
  text: string;
  author: string;
  created_at: string;
  puede_borrar: boolean;
}

export interface EventoDelCliente {
  at: string;
  kind: string;
  title: string;
  detail?: string | null;
  link_kind?: string | null;
  link_id?: string | null;
}

export interface PaginaHistoria {
  items: EventoDelCliente[];
  next_cursor: string | null;
  partial: boolean;
}

export async function notasDelCliente(api: ClienteAdmin, id: string): Promise<NotaDelCliente[]> {
  return api.get<NotaDelCliente[]>(`/admin/leads/${id}/notes`);
}

export async function agregarNota(api: ClienteAdmin, id: string, text: string): Promise<NotaDelCliente> {
  return api.post<NotaDelCliente>(`/admin/leads/${id}/notes`, { text });
}

export async function borrarNota(api: ClienteAdmin, id: string, notaId: string): Promise<void> {
  await api.del(`/admin/leads/${id}/notes/${notaId}`);
}

export async function historiaDelCliente(api: ClienteAdmin, id: string, cursor?: string | null): Promise<PaginaHistoria> {
  return api.get<PaginaHistoria>(`/admin/leads/${id}/timeline`, { limit: 20, cursor: cursor ?? undefined });
}

export const TIPO_DE_EVENTO: Record<string, string> = {
  conversacion: "Conversación",
  escalacion: "Escalación",
  dato: "Dato",
  nota: "Nota",
  cotizacion: "Cotización",
  pedido: "Pedido",
  cita: "Cita",
};

const ORIGEN: Record<string, string> = { tool: "Asistente", agent: "Asistente", human: "Persona", import: "Importado" };

export function origenDelDato(source: string): string {
  return ORIGEN[source] ?? source;
}

const ETIQUETA: Record<string, string> = {
  name: "Nombre",
  email: "Correo",
  correo: "Correo",
  telefono: "Teléfono",
  direccion: "Dirección",
  ciudad: "Ciudad",
  barrio: "Barrio",
  documento: "Documento",
  cedula: "Cédula",
  empresa: "Empresa",
};

/** Etiqueta legible de la clave de un dato (`direccion_entrega` → «Direccion entrega»). */
export function etiquetaDelDato(clave: string): string {
  if (ETIQUETA[clave]) return ETIQUETA[clave];
  const texto = clave.replace(/[_.-]+/g, " ").trim();
  return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : clave;
}

export function textoDelDato(valor: unknown): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  if (typeof valor === "boolean") return valor ? "Sí" : "No";
  if (typeof valor === "object") return JSON.stringify(valor);
  return String(valor);
}

// ---------------- HU-APP-21 · playground del asistente ----------------

export interface TurnoPlayground {
  text: string;
  image_url?: string | null;
  escalated?: boolean;
}

export async function cargarPlayground(api: ClienteAdmin): Promise<TurnoPlayground[]> {
  const res = await api.get<{ turns: TurnoPlayground[] }>("/admin/playground");
  return res.turns;
}

export async function enviarMensajePlayground(api: ClienteAdmin, text: string): Promise<void> {
  await api.post("/admin/playground/message", { text });
}

export async function reiniciarPlayground(api: ClienteAdmin): Promise<void> {
  await api.post("/admin/playground/reset");
}
