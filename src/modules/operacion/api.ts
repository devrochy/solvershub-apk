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

/** Pausa o reanuda el agente para este cliente en todas sus conversaciones. */
export async function alternarAgenteDelCliente(api: ClienteAdmin, id: string): Promise<boolean> {
  const res = await api.post<{ bot_paused: boolean }>(`/admin/leads/${id}/toggle-bot`);
  return res.bot_paused;
}

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
