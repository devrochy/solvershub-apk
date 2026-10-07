import type { ClienteAdmin } from "@core/api/admin";
import type { components } from "@core/api/schema";

export type ConversationSummary = components["schemas"]["ConversationSummary"];
export type ConversationDetail = components["schemas"]["ConversationDetail"];
export type EscalationItem = components["schemas"]["EscalationItem"];
export type LeadRow = components["schemas"]["LeadRow"];

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
