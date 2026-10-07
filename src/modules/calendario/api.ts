import type { ClienteAdmin } from "@core/api/admin";
import type { components } from "@core/api/schema";

export type WeekOut = components["schemas"]["WeekOut"];
export type WeekItem = components["schemas"]["WeekItem"];
export type TypeOut = components["schemas"]["TypeOut"];
export type BlockOut = components["schemas"]["BlockOut"];

export async function cargarSemana(api: ClienteAdmin, start?: string): Promise<WeekOut> {
  return api.get<WeekOut>("/pack/calendar/week", { start });
}

export async function cargarTipos(api: ClienteAdmin): Promise<TypeOut[]> {
  return api.get<TypeOut[]>("/pack/calendar/types");
}

export async function cargarBloqueos(api: ClienteAdmin): Promise<BlockOut[]> {
  return api.get<BlockOut[]>("/pack/calendar/blocks");
}

// ---------------- HU-APP-20 · escrituras móviles ----------------

export async function crearTipo(
  api: ClienteAdmin,
  datos: { name: string; duration_minutes: number },
): Promise<void> {
  await api.post("/pack/calendar/types", datos);
}

export async function crearBloqueo(
  api: ClienteAdmin,
  datos: { start_at: string; end_at: string; reason: string },
): Promise<void> {
  await api.post("/pack/calendar/blocks", datos);
}

// ---------------- Cierre de réplica: horario de atención ----------------

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
