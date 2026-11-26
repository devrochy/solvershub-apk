import type { ClienteAdmin } from "@core/api/admin";
import type { components } from "@core/api/schema";
import {
  TOTAL_PASOS,
  type CambiosDeIdentidad,
  type IdentitySettings,
  type Recorrido,
  type SubPaso,
} from "./logica";

export type DejarListo = components["schemas"]["DejarListoOut"];
export type SettingsResponse = components["schemas"]["SettingsResponse"];
/** La plantilla de un tipo de agente: lo que traía `agent-templates` (retirada), sin lo que suma el manifiesto. */
export type PlantillaAgente = Omit<
  components["schemas"]["AgentType"],
  "mandatory_skills" | "transversal_skills" | "customer_data_operations" | "default_flow_sections"
>;
export type CreacionDeAgente = components["schemas"]["FromScriptOut"];

/** Estado del recorrido del primer uso (`GET /admin/onboarding`); `null` si el negocio no lo tiene. */
export async function cargarRecorrido(
  api: ClienteAdmin,
): Promise<Recorrido | null> {
  const res = await api.get<{ recorrido?: Recorrido | null }>(
    "/admin/onboarding",
  );
  return res.recorrido ?? null;
}

/** Guarda la estación a la que llega (1 a 5). `pasos: 5` dice la escala (HU-AOS-84); sin él sería la de 6. */
export async function avanzar(
  api: ClienteAdmin,
  paso: number,
): Promise<Recorrido> {
  return api.post<Recorrido>("/admin/onboarding/avanzar", { paso, pasos: TOTAL_PASOS });
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
  const catalogo = await api.get<{ types: PlantillaAgente[] }>(
    "/admin/agent-types",
  );
  return catalogo.types;
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

/** Cambia el nombre del agente ya creado: al volver a «Tu negocio» manda el nombre de la estación 1. */
export async function renombrarAgente(api: ClienteAdmin, agentId: string, name: string): Promise<void> {
  await api.patch(`/admin/agents/${agentId}`, { name });
}

/** Tipo (plantilla) del agente ya creado, para retomar la bienvenida con su tipo fijo. */
export async function cargarAgente(api: ClienteAdmin, agentId: string): Promise<{ id: string; key: string; name: string }> {
  return api.get<{ id: string; key: string; name: string }>(`/admin/agents/${agentId}`);
}

export type { SubPaso };
