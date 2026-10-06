import type { SqlExecutor } from "../db/executor";

interface Tabla {
  columnas: string[];
  filas: Map<string, unknown[]>;
}

/**
 * Fake en memoria del ejecutor SQL (solo para tests de la capa de datos).
 * Soporta el subconjunto usado por el esquema y los repos: CREATE TABLE,
 * INSERT (plain/OR IGNORE/ON CONFLICT upsert), UPDATE por id, DELETE con
 * condiciones `col = ?` y SELECT con WHERE simple + ORDER BY.
 */
export function crearSqliteFake(): SqlExecutor & { filasDe(tabla: string): unknown[][] } {
  const tablas = new Map<string, Tabla>();

  const tablaDe = (nombre: string): Tabla => {
    const t = tablas.get(nombre);
    if (!t) {
      throw new Error(`fake: tabla desconocida ${nombre}`);
    }
    return t;
  };

  const indice = (t: Tabla, columna: string) => {
    const i = t.columnas.indexOf(columna);
    if (i < 0) {
      throw new Error(`fake: columna desconocida ${columna}`);
    }
    return i;
  };

  /** Evalúa condiciones `col = ?` / `col = 'valor'` / `col = 0` contra una fila. */
  const coincide = (t: Tabla, fila: unknown[], cond: string, valor: unknown) => {
    const m = /^(\w+)\s*=\s*(\?|'[^']*'|[\w.+-]+)$/.exec(cond.trim());
    if (!m) {
      return false;
    }
    const esperado = m[2] === "?" ? valor : m[2].replace(/^'|'$/g, "");
    return String(fila[indice(t, m[1])]) === String(esperado);
  };

  return {
    async execAsync(sql) {
      const m = /create\s+table\s+if\s+not\s+exists\s+(\w+)\s*\(([\s\S]*)\)\s*;/i.exec(
        sql.trim(),
      );
      if (m) {
        const columnas = m[2].split(",").map((c) => c.trim().split(/\s+/)[0]);
        tablas.set(m[1], { columnas, filas: new Map() });
        return;
      }
      throw new Error(`fake: execAsync no soportado: ${sql.slice(0, 60)}`);
    },

    async runAsync(sql, params = []) {
      const s = sql.trim();
      const ins = /^insert\s+(or\s+ignore\s+)?into\s+(\w+)\s*\(([^)]+)\)\s*values\s*\(([^)]+)\)/i.exec(
        s,
      );
      if (ins) {
        const t = tablaDe(ins[2]);
        const columnas = ins[3].split(",").map((c) => c.trim());
        const valores = ins[4].split(",").map((v) => v.trim());
        const fila: unknown[] = new Array(t.columnas.length).fill(null);
        let iParam = 0;
        valores.forEach((v, pos) => {
          const col = indice(t, columnas[pos]);
          fila[col] = v === "?" ? params[iParam++] : v.replace(/^'|'$/g, "");
        });
        const idCol = t.columnas.indexOf("id");
        const conflicto = /on\s+conflict\s*\(([^)]+)\)/i.exec(s);
        const clave =
          idCol >= 0
            ? String(fila[idCol])
            : conflicto
              ? conflicto[1]
                  .split(",")
                  .map((c) => String(fila[indice(t, c.trim())]))
                  .join("|")
              : fila.map(String).join("|");
        const existente = t.filas.get(clave);
        if (ins[1] && existente) {
          return; // OR IGNORE
        }
        if (existente && /on\s+conflict/i.test(s)) {
          t.filas.set(clave, [...fila]);
          return;
        }
        t.filas.set(clave, fila);
        return;
      }
      const upd = /^update\s+(\w+)\s+set\s+([\s\S]+?)\s+where\s+id\s*=\s*\?/i.exec(s);
      if (upd) {
        const t = tablaDe(upd[1]);
        const id = String(params[params.length - 1]);
        const fila = t.filas.get(id);
        if (!fila) {
          return;
        }
        const asignaciones = upd[2].split(",").map((a) => a.trim());
        let iParam = 0;
        for (const a of asignaciones) {
          const m = /^(\w+)\s*=\s*(.+)$/.exec(a);
          if (!m) {
            continue;
          }
          const valor = m[2].trim();
          fila[indice(t, m[1])] = valor === "?" ? params[iParam++] : valor.replace(/^'|'$/g, "");
        }
        return;
      }
      const del = /^delete\s+from\s+(\w+)\s+where\s+([\s\S]+?);?$/i.exec(s);
      if (del) {
        const t = tablaDe(del[1]);
        const conds = del[2].split(/\s+and\s+/i).map((c) => c.trim());
        for (const [k, fila] of [...t.filas.entries()]) {
          let iParam = 0;
          const ok = conds.every((cond) => coincide(t, fila, cond, params[iParam++]));
          if (ok) {
            t.filas.delete(k);
          }
        }
        return;
      }
      throw new Error(`fake: runAsync no soportado: ${s.slice(0, 60)}`);
    },

    async getAllAsync<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
      const m = /^select\s+(.+?)\s+from\s+(\w+)(?:\s+where\s+([\s\S]+?))?(?:\s+order\s+by\s+(.+?))?;?$/i.exec(
        sql.trim(),
      );
      if (!m) {
        throw new Error(`fake: getAllAsync no soportado: ${sql.slice(0, 60)}`);
      }
      const t = tablaDe(m[2]);
      const conds = m[3] ? m[3].split(/\s+and\s+/i).map((c) => c.trim()) : [];
      let filas = [...t.filas.values()].filter((fila) => {
        let iParam = 0;
        return conds.every((cond) => coincide(t, fila, cond, params[iParam++]));
      });
      const orden = m[4]?.trim();
      if (orden) {
        const [col, dir] = orden.split(/\s+/);
        const idx = indice(t, col);
        filas = [...filas].sort((a, b) =>
          String(a[idx]).localeCompare(String(b[idx])) * (dir?.toLowerCase() === "desc" ? -1 : 1),
        );
      }
      const proyectar = m[1].trim() === "*";
      const columnasPedidas = proyectar ? t.columnas : m[1].split(",").map((c) => c.trim());
      return filas.map((fila) => {
        const obj: Record<string, unknown> = {};
        for (const c of columnasPedidas) {
          const match = /^count\(\*\)\s+as\s+(\w+)$/i.exec(c);
          if (match) {
            obj[match[1]] = filas.length;
            continue;
          }
          obj[c] = fila[indice(t, c)];
        }
        return obj as T;
      });
    },

    async getFirstAsync<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
      const todas = await this.getAllAsync<T>(sql, params);
      return todas[0] ?? null;
    },

    filasDe(tabla: string) {
      return [...(tablaDe(tabla)?.filas.values() ?? [])];
    },
  };
}
