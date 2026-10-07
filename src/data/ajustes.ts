import { baseActual } from "./bootstrap";
import type { SqlExecutor } from "./db/executor";

/**
 * Ajustes locales del usuario (HU-APP-21): preferencias que no dependen del
 * backend. Se guardan en la tabla `ajuste_local` de la base offline.
 */

/** Clave del opt-out de push (HU-APP-21). "0" = apagado. */
export const CLAVE_PUSH_HABILITADO = "push_habilitado";

const oyentes = new Set<() => void>();

export function notificarAjustes(): void {
  oyentes.forEach((fn) => fn());
}

export function suscribirAjustes(fn: () => void): () => void {
  oyentes.add(fn);
  return () => {
    oyentes.delete(fn);
  };
}

export async function leerAjuste(clave: string): Promise<string | null> {
  const db: SqlExecutor | null = baseActual();
  if (!db) {
    return null;
  }
  const fila = await db.getFirstAsync<{ valor: string }>(
    "SELECT valor FROM ajuste_local WHERE clave = ?",
    [clave],
  );
  return fila?.valor ?? null;
}

export async function guardarAjuste(clave: string, valor: string): Promise<void> {
  const db: SqlExecutor | null = baseActual();
  if (!db) {
    return;
  }
  await db.runAsync(
    "INSERT INTO ajuste_local (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor",
    [clave, valor],
  );
  notificarAjustes();
}

export async function borrarAjuste(clave: string): Promise<void> {
  const db: SqlExecutor | null = baseActual();
  if (!db) {
    return;
  }
  await db.runAsync("DELETE FROM ajuste_local WHERE clave = ?", [clave]);
  notificarAjustes();
}
