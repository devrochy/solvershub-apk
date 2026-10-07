import type { SqlExecutor } from "./executor";

/**
 * Esquema local (ADR-APP-05): caché de entidades, cola offline, auditoría
 * local y cursores de sync. Idempotente (CREATE TABLE IF NOT EXISTS).
 */
export const TABLAS_SQL: string[] = [
  `CREATE TABLE IF NOT EXISTS cache_entidad (
    modulo TEXT NOT NULL,
    entidad TEXT NOT NULL,
    id TEXT NOT NULL,
    json TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    cursor TEXT,
    PRIMARY KEY (modulo, entidad, id)
  );`,
  `CREATE TABLE IF NOT EXISTS cola_evento (
    id TEXT PRIMARY KEY,
    modulo TEXT NOT NULL,
    tipo TEXT NOT NULL,
    payload TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'pendiente',
    intentos INTEGER NOT NULL DEFAULT 0,
    creado_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS auditoria_local (
    id TEXT PRIMARY KEY,
    accion TEXT NOT NULL,
    entidad TEXT NOT NULL,
    entidad_id TEXT,
    payload TEXT NOT NULL DEFAULT '{}',
    user TEXT,
    device TEXT,
    ts TEXT NOT NULL,
    synced INTEGER NOT NULL DEFAULT 0
  );`,
  `CREATE TABLE IF NOT EXISTS sync_cursor (
    modulo TEXT NOT NULL,
    entidad TEXT NOT NULL,
    cursor TEXT NOT NULL,
    PRIMARY KEY (modulo, entidad)
  );`,
  `CREATE TABLE IF NOT EXISTS ajuste_local (
    clave TEXT PRIMARY KEY,
    valor TEXT NOT NULL
  );`,
];

export async function migrarTablas(db: SqlExecutor): Promise<void> {
  for (const sql of TABLAS_SQL) {
    await db.execAsync(sql);
  }
}
