import type { ClienteAdmin } from "@core/api/admin";
import type { components } from "@core/api/schema";
import type {
  CambiosDeIdentidad,
  IdentitySettings,
  Recorrido,
  SubPaso,
} from "./logica";

export type DejarListo = components["schemas"]["DejarListoOut"];
export type SettingsResponse = components["schemas"]["SettingsResponse"];
export type PlantillaAgente = components["schemas"]["AgentTemplate"];
export type CreacionDeAgente = components["schemas"]["FromScriptOut"];
export type TurnoDePrueba = {
  text: string;
  escalated?: boolean;
  image_url?: string | null;
};

/** Estado del recorrido del primer uso (`GET /admin/onboarding`); `null` si el negocio no lo tiene. */
export async function cargarRecorrido(
  api: ClienteAdmin,
): Promise<Recorrido | null> {
  const res = await api.get<{ recorrido?: Recorrido | null }>(
    "/admin/onboarding",
  );
  return res.recorrido ?? null;
}

export async function avanzar(
  api: ClienteAdmin,
  paso: number,
): Promise<Recorrido> {
  return api.post<Recorrido>("/admin/onboarding/avanzar", { paso });
}

export async function omitir(api: ClienteAdmin): Promise<Recorrido> {
  return api.post<Recorrido>("/admin/onboarding/omitir");
}

export async function reanudar(api: ClienteAdmin): Promise<Recorrido> {
  return api.post<Recorrido>("/admin/onboarding/reanudar");
}

/** 409 `faltan_pasos` con `details.faltan` si el servidor no ve el recorrido hecho. */
export async function finalizar(api: ClienteAdmin): Promise<Recorrido> {
  return api.post<Recorrido>("/admin/onboarding/finalizar");
}

/** Conecta, publica y activa el agente en un chat de pruebas; idempotente y reintentable. */
export async function dejarListo(
  api: ClienteAdmin,
  agentId: string,
): Promise<DejarListo> {
  return api.post<DejarListo>("/admin/onboarding/dejar-listo", {
    agent_id: agentId,
  });
}

export async function cargarPlantillas(
  api: ClienteAdmin,
): Promise<PlantillaAgente[]> {
  const pagina = await api.get<{ items: PlantillaAgente[] }>(
    "/admin/agent-templates",
    { page_size: 100 },
  );
  return pagina.items;
}

export async function crearDesdeGuion(
  api: ClienteAdmin,
  cuerpo: {
    template_key: string;
    answers: Record<string, string>;
    name?: string;
  },
): Promise<CreacionDeAgente> {
  return api.post<CreacionDeAgente>("/admin/agents/from-script", cuerpo);
}

/**
 * Guarda los cambios de un paso en Configuración › Identidad. `PUT /settings/identity` reemplaza todo,
 * así que se lee lo guardado, se aplican los cambios y se reenvía completo (menos lo de solo lectura).
 */
export async function guardarIdentidad(
  api: ClienteAdmin,
  cambios: CambiosDeIdentidad,
): Promise<void> {
  if (Object.keys(cambios).length === 0) return;
  const actual = await api.get<SettingsResponse>("/admin/settings");
  const identidad: IdentitySettings = actual.identity;
  // `out_of_hours_default_message` es de solo lectura; `tono` está retirado (ADR-0166); `bot_paused`
  // no viaja para no deshacer una pausa hecha desde otro lado.
  const { bot_paused, out_of_hours_default_message, tono, ...resto } = {
    ...identidad,
    ...cambios,
  } as IdentitySettings & {
    tono?: unknown;
  };
  await api.put<void>("/admin/settings/identity", {
    ...resto,
    business_tz: identidad.timezone,
  });
}

export async function enviarPrueba(
  api: ClienteAdmin,
  conexionId: string,
  text: string,
): Promise<void> {
  await api.post("/admin/playground/message", {
    text,
    connection_id: conexionId,
  });
}

export async function cargarPrueba(
  api: ClienteAdmin,
  conexionId: string,
): Promise<TurnoDePrueba[]> {
  const res = await api.get<{ turns: TurnoDePrueba[] }>("/admin/playground", {
    connection_id: conexionId,
  });
  return res.turns;
}

export async function reiniciarPrueba(
  api: ClienteAdmin,
  conexionId: string,
): Promise<void> {
  await api.post(
    `/admin/playground/reset?connection_id=${encodeURIComponent(conexionId)}`,
  );
}

export type { SubPaso };
