import type { ClienteAdmin } from "@core/api/admin";
import type { components } from "@core/api/schema";

import type { DatosDeEventos } from "./domain/agenda";

export type CalendarOut = components["schemas"]["CalendarOut"];
export type CalendarListOut = components["schemas"]["CalendarListOut"];
export type CalendarIn = components["schemas"]["CalendarIn"];
export type CalendarPatch = components["schemas"]["CalendarPatch"];
export type CalendarStatus = components["schemas"]["CalendarStatus"];
export type AppointmentIn = components["schemas"]["AppointmentIn"];
export type AppointmentPatch = components["schemas"]["AppointmentPatch"];
export type AppointmentOut = components["schemas"]["AppointmentOut"];
export type AppointmentCancelOut = components["schemas"]["AppointmentCancelOut"];
export type ActivityOut = components["schemas"]["ActivityOut"];
export type BlockIn = components["schemas"]["BlockIn"];
export type BlockOut = components["schemas"]["BlockOut"];
export type TypeOut = components["schemas"]["TypeOut"];
export type TypeSave = components["schemas"]["TypeSave"];
export type CollaboratorItem = components["schemas"]["CollaboratorItem"];

// ---------------------------------------------------------------- lectura
export async function cargarEventos(
  api: ClienteAdmin,
  params: { start: string; end: string; calendarIds?: string[] | null },
): Promise<DatosDeEventos> {
  return api.get<DatosDeEventos>("/pack/calendar/events", {
    start: params.start,
    end: params.end,
    calendar_ids: params.calendarIds?.length ? params.calendarIds.join(",") : undefined,
  });
}

export async function cargarAgendas(api: ClienteAdmin): Promise<CalendarListOut> {
  return api.get<CalendarListOut>("/pack/calendar/calendars");
}

export async function cargarTipos(api: ClienteAdmin): Promise<TypeOut[]> {
  return api.get<TypeOut[]>("/pack/calendar/types");
}

export async function cargarColaboradores(api: ClienteAdmin): Promise<CollaboratorItem[]> {
  return api.get<CollaboratorItem[]>("/admin/collaborators");
}

export async function cargarActividades(api: ClienteAdmin, appointmentId: string): Promise<ActivityOut[]> {
  return api.get<ActivityOut[]>(`/pack/calendar/appointments/${appointmentId}/activities`);
}

export async function cargarEstadoConexion(api: ClienteAdmin): Promise<CalendarStatus> {
  return api.get<CalendarStatus>("/pack/calendar/status");
}

// ---------------------------------------------------------------- agendas
export async function crearAgenda(api: ClienteAdmin, datos: CalendarIn): Promise<CalendarOut> {
  return api.post<CalendarOut>("/pack/calendar/calendars", datos);
}

export async function actualizarAgenda(
  api: ClienteAdmin,
  id: string,
  datos: CalendarPatch,
): Promise<CalendarOut> {
  return api.put<CalendarOut>(`/pack/calendar/calendars/${id}`, datos);
}

export async function eliminarAgenda(api: ClienteAdmin, id: string, moveTo?: string | null): Promise<void> {
  await api.post(`/pack/calendar/calendars/${id}/delete`, { move_to: moveTo ?? null });
}

// ---------------------------------------------------------------- citas
export async function crearCita(api: ClienteAdmin, datos: AppointmentIn): Promise<AppointmentOut> {
  return api.post<AppointmentOut>("/pack/calendar/appointments", datos);
}

export async function actualizarCita(
  api: ClienteAdmin,
  id: string,
  datos: AppointmentPatch,
): Promise<AppointmentOut> {
  return api.patch<AppointmentOut>(`/pack/calendar/appointments/${id}`, datos);
}

export async function cancelarCita(
  api: ClienteAdmin,
  id: string,
  notify: boolean,
): Promise<AppointmentCancelOut> {
  return api.post<AppointmentCancelOut>(`/pack/calendar/appointments/${id}/cancel`, { notify });
}

export async function marcarAsistencia(
  api: ClienteAdmin,
  id: string,
  asistio: boolean,
): Promise<AppointmentOut> {
  return api.post<AppointmentOut>(`/pack/calendar/appointments/${id}/asistencia`, { asistio });
}

// ---------------------------------------------------------------- bloqueos
export async function crearBloqueo(api: ClienteAdmin, datos: BlockIn): Promise<BlockOut> {
  return api.post<BlockOut>("/pack/calendar/blocks", datos);
}

export async function actualizarBloqueo(
  api: ClienteAdmin,
  id: string,
  datos: { start_at?: string; end_at?: string; reason?: string },
): Promise<BlockOut> {
  return api.patch<BlockOut>(`/pack/calendar/blocks/${id}`, datos);
}

export async function eliminarBloqueo(api: ClienteAdmin, id: string): Promise<void> {
  await api.del<void>(`/pack/calendar/blocks/${id}`);
}

// ---------------------------------------------------------------- tipos
export async function crearTipo(api: ClienteAdmin, datos: TypeSave): Promise<void> {
  await api.post("/pack/calendar/types", datos);
}

export async function actualizarTipo(api: ClienteAdmin, id: string, datos: TypeSave): Promise<void> {
  await api.put(`/pack/calendar/types/${id}`, datos);
}

export async function eliminarTipo(api: ClienteAdmin, id: string): Promise<void> {
  await api.post(`/pack/calendar/types/${id}/delete`);
}

// ---------------------------------------------------------------- configuración del pack
export interface ConfigPlugin {
  plugin_id: string;
  values: Record<string, unknown>;
}

export async function cargarConfigPlugin(api: ClienteAdmin, pluginId: string): Promise<ConfigPlugin> {
  return api.get<ConfigPlugin>(`/admin/plugins/${pluginId}/config`);
}

export async function guardarConfigPlugin(
  api: ClienteAdmin,
  pluginId: string,
  values: Record<string, unknown>,
): Promise<ConfigPlugin> {
  return api.put<ConfigPlugin>(`/admin/plugins/${pluginId}/config`, { values });
}
