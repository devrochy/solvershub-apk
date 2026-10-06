import type { SqlExecutor } from "../db/executor";

/** Auditoría local de acciones críticas (ADR-0097): se sincroniza por evento. */
export interface EventoAuditoria {
  id: string;
  accion: string;
  entidad: string;
  entidadId: string | null;
  payload: string;
  user: string | null;
  device: string | null;
  ts: string;
  synced: boolean;
}

export async function registrarAuditoria(
  db: SqlExecutor,
  evento: Omit<EventoAuditoria, "synced">,
): Promise<void> {
  await db.runAsync(
    `INSERT OR IGNORE INTO auditoria_local (id, accion, entidad, entidad_id, payload, user, device, ts, synced)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0);`,
    [evento.id, evento.accion, evento.entidad, evento.entidadId, evento.payload, evento.user, evento.device, evento.ts],
  );
}

export async function auditoriaPendiente(db: SqlExecutor): Promise<EventoAuditoria[]> {
  const filas = await db.getAllAsync<{
    id: string;
    accion: string;
    entidad: string;
    entidad_id: string | null;
    payload: string;
    user: string | null;
    device: string | null;
    ts: string;
    synced: number;
  }>(
    `SELECT id, accion, entidad, entidad_id, payload, user, device, ts, synced
     FROM auditoria_local WHERE synced = 0 ORDER BY ts ASC;`,
  );
  return filas.map((f) => ({
    id: f.id,
    accion: f.accion,
    entidad: f.entidad,
    entidadId: f.entidad_id,
    payload: f.payload,
    user: f.user,
    device: f.device,
    ts: f.ts,
    synced: f.synced === 1,
  }));
}

export async function marcarAuditoriaSincronizada(db: SqlExecutor, id: string): Promise<void> {
  await db.runAsync(`UPDATE auditoria_local SET synced = 1 WHERE id = ?;`, [id]);
}
