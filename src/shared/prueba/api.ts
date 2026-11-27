import type { ClienteAdmin } from "@core/api/admin";

/**
 * Chat de pruebas real (`/admin/playground`), compartido por la bienvenida y Nuevo agente (HU-APP-23). Se prueba
 * por la conexión de pruebas (`connection_id`, la de `dejar-listo`: es la única que cuenta para terminar la
 * bienvenida) o el borrador de un agente sin publicar (`agent_id`, HU-AOS-72).
 */
export type DestinoDePrueba = { connection_id: string } | { agent_id: string };

/** Un turno del historial (`GET /admin/playground`): la memoria de trabajo guarda lo del cliente y lo del agente. */
export type TurnoDePrueba = {
  role: "user" | "assistant";
  content: string;
  tool_calls?: unknown[];
};

/** Respuesta de `POST /admin/playground/message`: solo ella dice si el turno pasó a una persona. */
export type RespuestaDePrueba = {
  text: string;
  escalated?: boolean;
  simulado?: boolean;
  image_url?: string | null;
};

function consulta(destino: DestinoDePrueba): string {
  return "agent_id" in destino
    ? `agent_id=${encodeURIComponent(destino.agent_id)}`
    : `connection_id=${encodeURIComponent(destino.connection_id)}`;
}

export async function enviarPrueba(api: ClienteAdmin, destino: DestinoDePrueba, text: string): Promise<RespuestaDePrueba> {
  return api.post<RespuestaDePrueba>("/admin/playground/message", { text, ...destino });
}

export async function cargarPrueba(api: ClienteAdmin, destino: DestinoDePrueba): Promise<TurnoDePrueba[]> {
  const res = await api.get<{ turns: TurnoDePrueba[] }>("/admin/playground", { ...destino });
  return res.turns;
}

export async function reiniciarPrueba(api: ClienteAdmin, destino: DestinoDePrueba): Promise<void> {
  await api.post(`/admin/playground/reset?${consulta(destino)}`);
}

export async function cerrarPrueba(api: ClienteAdmin, destino: DestinoDePrueba): Promise<void> {
  await api.post(`/admin/playground/close?${consulta(destino)}`);
}
