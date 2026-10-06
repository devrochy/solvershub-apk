import type { SqlExecutor } from "./db/executor";
import { borrarCache, guardarCache } from "./repos/cache";
import { guardarCursor, leerCursor } from "./repos/sync-cursor";

/**
 * Motor de sync incremental (ADR-0097, HU-APP-15).
 *
 * Recorre `GET /api/v1/sync/{entidad}?cursor=` página a página, escribe cada
 * fila en la caché local (`cache_entidad`, LWW por `updatedAt`), aplica los
 * `deletedIds` y persiste el cursor. Idempotente: repetir una corrida sin
 * novedades no hace escrituras. Un fallo de red corta el bucle y conserva el
 * cursor ya avanzado (la próxima corrida continúa desde ahí).
 */

const LIMITE = 200;

export interface ClienteSync {
  get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T>;
}

interface PaginaSync {
  entidad: string;
  items: Record<string, unknown>[];
  nextCursor: string;
  deletedIds: string[];
}

export interface ResultadoSync {
  entidad: string;
  escritos: number;
  borrados: number;
  paginas: number;
  nextCursor: string | null;
}

export async function sincronizarEntidad(
  db: SqlExecutor,
  cliente: ClienteSync,
  modulo: string,
  entidad: string,
): Promise<ResultadoSync> {
  let cursor = await leerCursor(db, modulo, entidad);
  let escritos = 0;
  let borrados = 0;
  let paginas = 0;

  for (;;) {
    const pagina = await cliente.get<PaginaSync>(`/sync/${entidad}`, {
      cursor: cursor ?? undefined,
      limit: LIMITE,
    });
    paginas += 1;

    for (const item of pagina.items) {
      const id = String(item.id ?? "");
      if (!id) {
        continue;
      }
      const updatedAt = String(item.updatedAt ?? new Date().toISOString());
      await guardarCache(db, {
        modulo,
        entidad,
        id,
        json: JSON.stringify(item),
        updatedAt,
      });
      escritos += 1;
    }

    for (const id of pagina.deletedIds) {
      await borrarCache(db, modulo, entidad, id);
      borrados += 1;
    }

    cursor = pagina.nextCursor;
    await guardarCursor(db, modulo, entidad, pagina.nextCursor);

    if (pagina.items.length < LIMITE) {
      break;
    }
  }

  return { entidad, escritos, borrados, paginas, nextCursor: cursor };
}

/** Sincroniza varias entidades en secuencia; un error corta y reporta la entidad. */
export async function sincronizarModulo(
  db: SqlExecutor,
  cliente: ClienteSync,
  modulo: string,
  entidades: string[],
): Promise<{ resultados: ResultadoSync[]; error?: { entidad: string } }> {
  const resultados: ResultadoSync[] = [];
  for (const entidad of entidades) {
    try {
      resultados.push(await sincronizarEntidad(db, cliente, modulo, entidad));
    } catch {
      return { resultados, error: { entidad } };
    }
  }
  return { resultados };
}
