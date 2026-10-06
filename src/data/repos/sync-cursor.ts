import type { SqlExecutor } from "../db/executor";

/** Cursor de sync incremental por (módulo, entidad) — ADR-0097. */
export async function leerCursor(
  db: SqlExecutor,
  modulo: string,
  entidad: string,
): Promise<string | null> {
  const fila = await db.getFirstAsync<{ cursor: string }>(
    `SELECT cursor FROM sync_cursor WHERE modulo = ? AND entidad = ?;`,
    [modulo, entidad],
  );
  return fila?.cursor ?? null;
}

export async function guardarCursor(
  db: SqlExecutor,
  modulo: string,
  entidad: string,
  cursor: string,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO sync_cursor (modulo, entidad, cursor) VALUES (?, ?, ?)
     ON CONFLICT(modulo, entidad) DO UPDATE SET cursor = excluded.cursor;`,
    [modulo, entidad, cursor],
  );
}
