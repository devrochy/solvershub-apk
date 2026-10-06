import type { ClienteAdmin } from "@core/api/admin";
import type { SqlExecutor } from "./db/executor";
import { enviarEventosPendientes } from "./escrituras";
import { sincronizarModulo, type ResultadoSync } from "./sync-engine";

/**
 * Sync global de la app (ADR-0097, HU-APP-15): recorre todas las entidades de
 * los módulos offline-first y luego despacha las escrituras pendientes de cada
 * uno. Un error en una entidad corta SU módulo y continúa con el siguiente;
 * nunca lanza hacia el llamador.
 */

export const ENTIDADES_POR_MODULO: Record<string, string[]> = {
  operacion: ["conversaciones", "clientes"],
  comercio: ["productos", "categorias", "promociones", "pedidos"],
  calendario: ["citas", "tipos_cita", "bloqueos"],
  cobranza: ["clientes_cobranza", "carteras", "promesas"],
};

export interface ResumenSincronizacion {
  modulo: string;
  escritos: number;
  borrados: number;
  paginas: number;
  pendientes: { enviados: number; errores: number };
  error?: { entidad: string };
}

export async function sincronizarTodo(
  db: SqlExecutor,
  cliente: ClienteAdmin,
): Promise<ResumenSincronizacion[]> {
  const resumen: ResumenSincronizacion[] = [];
  for (const [modulo, entidades] of Object.entries(ENTIDADES_POR_MODULO)) {
    const r = await sincronizarModulo(db, cliente, modulo, entidades);
    const pendientes = r.error ? { enviados: 0, errores: 0 } : await enviarEventosPendientes(db, cliente, modulo);
    resumen.push({
      modulo,
      escritos: r.resultados.reduce((n, x: ResultadoSync) => n + x.escritos, 0),
      borrados: r.resultados.reduce((n, x: ResultadoSync) => n + x.borrados, 0),
      paginas: r.resultados.reduce((n, x: ResultadoSync) => n + x.paginas, 0),
      pendientes,
      error: r.error,
    });
  }
  return resumen;
}
