import type { ClienteAdmin } from "@core/api/admin";
import type { NotificacionPagina, NotificacionPreferencias } from "./tipos";

/** Cliente del centro de notificaciones: `/api/v1/me/notifications` (ADR-0167). */

export interface FiltroFeed {
  categoria?: string | null;
  soloNoLeidas?: boolean;
  cursor?: string | null;
  limite?: number;
}

export function listarNotificaciones(api: ClienteAdmin, f: FiltroFeed = {}): Promise<NotificacionPagina> {
  return api.get<NotificacionPagina>("/me/notifications", {
    category: f.categoria ?? undefined,
    unread: f.soloNoLeidas ? "true" : undefined,
    cursor: f.cursor ?? undefined,
    limit: f.limite ?? 20,
  });
}

export async function contarNoLeidas(api: ClienteAdmin): Promise<number> {
  const r = await api.get<{ unread_count: number }>("/me/notifications/unread-count");
  return r.unread_count;
}

export async function marcarLeidas(api: ClienteAdmin, ids: string[]): Promise<number> {
  const r = await api.post<{ unread_count: number }>("/me/notifications/read", { ids });
  return r.unread_count;
}

export async function marcarTodasLeidas(api: ClienteAdmin): Promise<number> {
  const r = await api.post<{ unread_count: number }>("/me/notifications/read", { all: true });
  return r.unread_count;
}

export async function archivarNotificacion(api: ClienteAdmin, id: string): Promise<void> {
  await api.del<void>(`/me/notifications/${encodeURIComponent(id)}`);
}

export function leerPreferencias(api: ClienteAdmin): Promise<NotificacionPreferencias> {
  return api.get<NotificacionPreferencias>("/me/notifications/preferences");
}

export function guardarPushApagado(api: ClienteAdmin, categorias: string[]): Promise<NotificacionPreferencias> {
  return api.put<NotificacionPreferencias>("/me/notifications/preferences", { push_off_categories: categorias });
}

/** `minutos` > 0 silencia el push; `0` lo reactiva. */
export function silenciarPush(api: ClienteAdmin, minutos: number): Promise<NotificacionPreferencias> {
  return api.put<NotificacionPreferencias>("/me/notifications/mute", { minutes: minutos });
}
