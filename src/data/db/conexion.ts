import { openDatabaseAsync } from "expo-sqlite";
import * as Crypto from "expo-crypto";
import { secureGet, secureSet } from "@core/secure-kv";
import { crearEjecutorSqlite, type SqlExecutor } from "./executor";

const NOMBRE_BASE = "solvershub.db";
const CLAVE_MAESTRA = "solvershub_db_key";
const CLAVE_APAGADO = "solvershub_sqlite_apagada";

async function generarClave(): Promise<string> {
  // 32 bytes en hex: sin caracteres especiales (seguro para el PRAGMA key).
  const bytes = await Crypto.getRandomBytesAsync(32);
  let hex = "";
  for (const b of bytes) {
    hex += b.toString(16).padStart(2, "0");
  }
  return hex;
}

let claveEnCurso: Promise<string> | null = null;

async function claveMaestra(): Promise<string> {
  if (claveEnCurso) {
    return claveEnCurso;
  }
  claveEnCurso = (async () => {
    const existente = await secureGet(CLAVE_MAESTRA);
    if (existente) {
      return existente;
    }
    const nueva = await generarClave();
    await secureSet(CLAVE_MAESTRA, nueva);
    return nueva;
  })();
  try {
    return await claveEnCurso;
  } catch (error) {
    claveEnCurso = null;
    throw error;
  }
}

/** Kill-switch local (ADR-APP-05): con "1" la base queda sin usar (solo legacy). */
export async function baseApagada(): Promise<boolean> {
  return (await secureGet(CLAVE_APAGADO)) === "1";
}

export async function apagarBase(): Promise<void> {
  await secureSet(CLAVE_APAGADO, "1");
}

/**
 * Abre la base local cifrada (SQLCipher, ADR-APP-05) y aplica la clave.
 * Requiere build propio (no Expo Go): con `useSQLCipher` activo, el PRAGMA key
 * cifra; sin SQLCipher el PRAGMA se ignora (la base queda en claro en Expo Go,
 * que es solo para desarrollo).
 */
export async function abrirBaseCifrada(): Promise<SqlExecutor> {
  const db = await openDatabaseAsync(NOMBRE_BASE);
  const clave = await claveMaestra();
  await db.execAsync(`PRAGMA key = '${clave}';`);
  await db.execAsync("SELECT count(*) FROM sqlite_master;");
  return crearEjecutorSqlite(db);
}
