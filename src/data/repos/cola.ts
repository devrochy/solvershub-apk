import type { SqlExecutor } from "../db/executor";

/** Cola offline idempotente (ADR-APP-04/05): persistida en SQLite cifrado. */
export interface EventoCola {
  id: string;
  modulo: string;
  tipo: string;
  payload: string;
  estado: "pendiente" | "enviado" | "error";
  intentos: number;
  creadoAt: string;
}

export async function encolarEvento(
  db: SqlExecutor,
  evento: Omit<EventoCola, "estado" | "intentos">,
): Promise<void> {
  await db.runAsync(
    `INSERT OR IGNORE INTO cola_evento (id, modulo, tipo, payload, estado, intentos, creado_at)
     VALUES (?, ?, ?, ?, 'pendiente', 0, ?);`,
    [evento.id, evento.modulo, evento.tipo, evento.payload, evento.creadoAt],
  );
}

export async function eventosPendientes(db: SqlExecutor, modulo: string): Promise<EventoCola[]> {
  const filas = await db.getAllAsync<{
    id: string;
    modulo: string;
    tipo: string;
    payload: string;
    estado: string;
    intentos: number;
    creado_at: string;
  }>(
    `SELECT id, modulo, tipo, payload, estado, intentos, creado_at
     FROM cola_evento WHERE modulo = ? AND estado = 'pendiente' ORDER BY creado_at ASC;`,
    [modulo],
  );
  return filas.map((f) => ({
    id: f.id,
    modulo: f.modulo,
    tipo: f.tipo,
    payload: f.payload,
    estado: f.estado as EventoCola["estado"],
    intentos: f.intentos,
    creadoAt: f.creado_at,
  }));
}

export async function marcarEvento(
  db: SqlExecutor,
  id: string,
  estado: EventoCola["estado"],
): Promise<void> {
  await db.runAsync(`UPDATE cola_evento SET estado = ? WHERE id = ?;`, [estado, id]);
}

export async function incrementarIntento(db: SqlExecutor, id: string): Promise<void> {
  await db.runAsync(`UPDATE cola_evento SET intentos = intentos + 1 WHERE id = ?;`, [id]);
}

export async function eliminarEvento(db: SqlExecutor, id: string): Promise<void> {
  await db.runAsync(`DELETE FROM cola_evento WHERE id = ?;`, [id]);
}

export async function totalEventos(db: SqlExecutor, modulo: string): Promise<number> {
  const fila = await db.getFirstAsync<{ n: number }>(
    `SELECT count(*) AS n FROM cola_evento WHERE modulo = ?;`,
    [modulo],
  );
  return fila?.n ?? 0;
}
