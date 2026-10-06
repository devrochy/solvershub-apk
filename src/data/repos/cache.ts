import type { SqlExecutor } from "../db/executor";

/** Caché de entidades del sync (ADR-APP-05): `(modulo, entidad, id)` → json. */
export interface EntidadCache {
  modulo: string;
  entidad: string;
  id: string;
  json: string;
  updatedAt: string;
}

export async function guardarCache(db: SqlExecutor, fila: EntidadCache): Promise<void> {
  await db.runAsync(
    `INSERT INTO cache_entidad (modulo, entidad, id, json, updated_at, cursor)
     VALUES (?, ?, ?, ?, ?, NULL)
     ON CONFLICT(modulo, entidad, id) DO UPDATE SET json = excluded.json, updated_at = excluded.updated_at;`,
    [fila.modulo, fila.entidad, fila.id, fila.json, fila.updatedAt],
  );
}

export async function leerCache(
  db: SqlExecutor,
  modulo: string,
  entidad: string,
  id: string,
): Promise<EntidadCache | null> {
  const fila = await db.getFirstAsync<{ json: string; updated_at: string }>(
    `SELECT json, updated_at FROM cache_entidad WHERE modulo = ? AND entidad = ? AND id = ?;`,
    [modulo, entidad, id],
  );
  if (!fila) {
    return null;
  }
  return { modulo, entidad, id, json: fila.json, updatedAt: fila.updated_at };
}

export async function borrarCache(
  db: SqlExecutor,
  modulo: string,
  entidad: string,
  id: string,
): Promise<void> {
  await db.runAsync(
    `DELETE FROM cache_entidad WHERE modulo = ? AND entidad = ? AND id = ?;`,
    [modulo, entidad, id],
  );
}

/** Todas las filas cacheadas de una entidad (para búsqueda local). */
export async function listarCache(
  db: SqlExecutor,
  modulo: string,
  entidad: string,
): Promise<EntidadCache[]> {
  const filas = await db.getAllAsync<{ id: string; json: string; updated_at: string }>(
    `SELECT id, json, updated_at FROM cache_entidad WHERE modulo = ? AND entidad = ?;`,
    [modulo, entidad],
  );
  return filas.map((f) => ({
    modulo,
    entidad,
    id: f.id,
    json: f.json,
    updatedAt: f.updated_at,
  }));
}

export async function limpiarEntidad(
  db: SqlExecutor,
  modulo: string,
  entidad: string,
): Promise<void> {
  await db.runAsync(`DELETE FROM cache_entidad WHERE modulo = ? AND entidad = ?;`, [
    modulo,
    entidad,
  ]);
}
