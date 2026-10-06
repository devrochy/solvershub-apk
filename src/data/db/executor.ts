import type { SQLiteBindValue, SQLiteDatabase } from "expo-sqlite";

/**
 * Abstracción mínima del motor SQL local (ADR-APP-05): la capa de datos trabaja
 * contra esta interfaz para poder probarla con un ejecutor fake en memoria y
 * para centralizar el uso de expo-sqlite (SQLCipher) en un solo archivo.
 */
export interface SqlExecutor {
  runAsync(sql: string, params?: unknown[]): Promise<void>;
  getAllAsync<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  getFirstAsync<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T | null>;
  execAsync(sql: string): Promise<void>;
}

export function crearEjecutorSqlite(db: SQLiteDatabase): SqlExecutor {
  const vinculos = (params: unknown[]): SQLiteBindValue[] => params as SQLiteBindValue[];
  return {
    runAsync: async (sql, params = []) => {
      await db.runAsync(sql, ...vinculos(params));
    },
    getAllAsync: <T = Record<string, unknown>>(sql: string, params: unknown[] = []) =>
      db.getAllAsync<T>(sql, ...vinculos(params)),
    getFirstAsync: <T = Record<string, unknown>>(sql: string, params: unknown[] = []) =>
      db.getFirstAsync<T>(sql, ...vinculos(params)),
    execAsync: (sql) => db.execAsync(sql),
  };
}
