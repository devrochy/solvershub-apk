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

export async function crearBloqueo(
  api: ClienteAdmin,
  datos: { start_at: string; end_at: string; reason: string },
): Promise<void> {
  await api.post("/pack/calendar/blocks", datos);
}
