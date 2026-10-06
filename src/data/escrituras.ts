import * as Crypto from "expo-crypto";
import type { ClienteAdmin } from "@core/api/admin";
import type { SqlExecutor } from "./db/executor";
import {
  encolarEvento,
  eventosPendientes,
  incrementarIntento,
  marcarEvento,
  type EventoCola,
} from "./repos/cola";

/**
 * Escrituras encoladas offline (ADR-0097, HU-APP-15): una acción crítica de un
 * módulo admin (p. ej. cambio de estado de pedido) se encola cuando no hay red
 * y un **despachador** por módulo la aplica al reconectar, idempotente
 * (marca `enviado` solo tras éxito).
 */

export type Despachador = (cliente: ClienteAdmin, evento: EventoCola) => Promise<void>;

const despachadores = new Map<string, Despachador>();

/** Registra el despachador de escrituras de un módulo (idempotente). */
export function registrarDespachador(modulo: string, fn: Despachador): void {
  despachadores.set(modulo, fn);
}

export async function encolarEscritura(
  db: SqlExecutor,
  modulo: string,
  tipo: string,
  payload: Record<string, unknown>,
): Promise<string> {
  const id = Crypto.randomUUID();
  await encolarEvento(db, {
    id,
    modulo,
    tipo,
    payload: JSON.stringify(payload),
    creadoAt: new Date().toISOString(),
  });
  return id;
}

export async function enviarEventosPendientes(
  db: SqlExecutor,
  cliente: ClienteAdmin,
  modulo: string,
): Promise<{ enviados: number; errores: number }> {
  const pendientes = await eventosPendientes(db, modulo);
  const despachador = despachadores.get(modulo);
  let enviados = 0;
  let errores = 0;
  for (const evento of pendientes) {
    if (!despachador) {
      errores += 1;
      continue;
    }
    try {
      await despachador(cliente, evento);
      await marcarEvento(db, evento.id, "enviado");
      enviados += 1;
    } catch {
      await incrementarIntento(db, evento.id);
      errores += 1;
    }
  }
  return { enviados, errores };
}
