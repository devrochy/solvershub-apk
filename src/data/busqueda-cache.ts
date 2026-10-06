import type { SqlExecutor } from "./db/executor";
import { listarCache } from "./repos/cache";
import { ENTIDADES_POR_MODULO } from "./sync-global";

/**
 * Búsqueda local sobre la caché del sync (ADR-0096/0097): la app busca offline
 * cuando no hay red. Match simple (subcadena, sin acentos) sobre el JSON
 * cacheado; tope 30 resultados para acotar el trabajo en el hilo de JS.
 */

export interface ResultadoCache {
  modulo: string;
  entidad: string;
  id: string;
  json: string;
}

export async function buscarEnCache(
  db: SqlExecutor,
  q: string,
  modulos: string[] = Object.keys(ENTIDADES_POR_MODULO),
): Promise<ResultadoCache[]> {
  const consulta = q.trim().toLowerCase();
  if (consulta.length < 2) {
    return [];
  }
  const resultados: ResultadoCache[] = [];
  for (const modulo of modulos) {
    for (const entidad of ENTIDADES_POR_MODULO[modulo] ?? []) {
      const filas = await listarCache(db, modulo, entidad);
      for (const fila of filas) {
        if (fila.json.toLowerCase().includes(consulta)) {
          resultados.push({ modulo, entidad, id: fila.id, json: fila.json });
        }
      }
    }
  }
  return resultados.slice(0, 30);
}
