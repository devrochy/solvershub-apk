import type { ClienteAdmin } from "@core/api/admin";
import type { components } from "@core/api/schema";
import { CATEGORIAS, categoriasDisponibles, type Categoria } from "./tipos";

type AgentesOverview = components["schemas"]["AgentsOverview"];
type PluginSummary = components["schemas"]["PluginSummary"];

/**
 * Categorías del centro según los agentes creados. Se consultan el resumen de agentes y los
 * packs habilitados; si cualquiera falla se usa el fallback más seguro: todas las categorías
 * (sin permiso `agents` o API caída no deben esconder filtros que el usuario sí usa).
 */
export async function cargarCategoriasDisponibles(api: ClienteAdmin): Promise<readonly Categoria[]> {
  try {
    const [agentesRes, packsRes] = await Promise.allSettled([
      api.get<AgentesOverview>("/admin/agents/overview"),
      api.get<PluginSummary[]>("/admin/plugins"),
    ]);
    if (agentesRes.status !== "fulfilled") return CATEGORIAS;
    const packs =
      packsRes.status === "fulfilled"
        ? Object.fromEntries(packsRes.value.map((pack) => [pack.id, pack.enabled_for_tenant]))
        : null;
    return categoriasDisponibles(agentesRes.value, packs);
  } catch {
    return CATEGORIAS;
  }
}
