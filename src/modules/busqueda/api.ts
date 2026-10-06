import type { ClienteAdmin } from "@core/api/admin";

export interface ItemBusqueda {
  id: string;
  tipo: string;
  titulo: string;
  subtitulo: string;
  extra: Record<string, unknown>;
}

export interface SeccionResultados {
  seccion: string;
  label: string;
  items: ItemBusqueda[];
}

interface RespuestaBusqueda {
  resultados: SeccionResultados[];
}

/** Búsqueda global unificada (ADR-0096): un endpoint, resultados por sección. */
export async function buscar(
  api: ClienteAdmin,
  q: string,
  limit = 5,
): Promise<SeccionResultados[]> {
  const respuesta = await api.get<RespuestaBusqueda>("/search", { q, limit });
  return respuesta.resultados;
}
