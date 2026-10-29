import { abrirBaseCifrada, baseApagada } from "./db/conexion";
import { migrarTablas } from "./db/migraciones";
import type { SqlExecutor } from "./db/executor";
import { secureDelete } from "@core/secure-kv";

let instancia: SqlExecutor | null = null;
let enCurso: Promise<SqlExecutor | null> | null = null;

/**
 * Bootstrap de la capa de datos (ADR-APP-05): abre la base cifrada y aplica el
 * esquema. Idempotente; respeta el kill-switch local (base apagada → null).
 * La migración de la cola legacy NO corre acá (se activa en HU-APP-07 junto
 * al cambio de motor; ver `migracion/desde-asyncstorage.ts`).
 */
export async function inicializarBase(): Promise<SqlExecutor | null> {
  if (await baseApagada()) {
    return null;
  }
  if (instancia) {
    return instancia;
  }
  if (enCurso) {
    return enCurso;
  }
  enCurso = (async () => {
    const db = await abrirBaseCifrada();
    await migrarTablas(db);
    instancia = db;
    return db;
  })();
  try {
    return await enCurso;
  } catch (error) {
    enCurso = null;
    throw error;
  }
}

export function baseActual(): SqlExecutor | null {
  return instancia;
}

export async function reactivarBase(): Promise<void> {
  await secureDelete("solvershub_sqlite_apagada");
}
