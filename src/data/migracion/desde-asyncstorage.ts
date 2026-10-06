import AsyncStorage from "@react-native-async-storage/async-storage";
import { secureGet, secureSet } from "@core/secure-kv";
import { encolarEvento, totalEventos } from "../repos/cola";
import type { SqlExecutor } from "../db/executor";

const FLAG_MIGRADA = "solvershub_sqlite_migrada";

/**
 * Migración única AsyncStorage → SQLite (ADR-APP-05).
 *
 * Traspasa la COLA OFFLINE legacy (`cobranza_cola_offline`) a `cola_evento` y
 * registra la marca. Se activa desde HU-APP-07 (junto al cambio de motor), NO
 * en el arranque genérico: migrar antes deja a la app sin cola (el motor
 * legacy seguiría leyendo AsyncStorage y los eventos pendientes se perderían).
 *
 * Verificación: compara totales origen/destino; solo si coinciden se borra el
 * origen y se fija la marca.
 */
export interface ColaLegacy {
  eventoIdCliente?: string;
  tipoEvento?: string;
  payload?: Record<string, unknown>;
  creadoEn?: string;
  dedupeKey?: string;
  [clave: string]: unknown;
}

export async function migracionRealizada(): Promise<boolean> {
  return (await secureGet(FLAG_MIGRADA)) === "1";
}

export async function migrarColaDesdeAsyncStorage(db: SqlExecutor): Promise<{
  migrados: number;
  error?: string;
}> {
  if (await migracionRealizada()) {
    return { migrados: 0 };
  }

  const raw = await AsyncStorage.getItem("cobranza_cola_offline");
  const eventos: ColaLegacy[] = raw ? JSON.parse(raw) : [];
  if (eventos.length === 0) {
    await secureSet(FLAG_MIGRADA, "1");
    return { migrados: 0 };
  }

  for (const ev of eventos) {
    await encolarEvento(db, {
      id: String(ev.eventoIdCliente ?? ev.id ?? ""),
      modulo: "cobranza",
      tipo: String(ev.tipoEvento ?? "desconocido"),
      payload: JSON.stringify({ payload: ev.payload ?? {}, dedupeKey: ev.dedupeKey ?? null }),
      creadoAt: String(ev.creadoEn ?? new Date().toISOString()),
    });
  }

  const total = await totalEventos(db, "cobranza");
  if (total !== eventos.length) {
    return { migrados: 0, error: `verificación falló: origen ${eventos.length}, destino ${total}` };
  }

  await AsyncStorage.removeItem("cobranza_cola_offline");
  await secureSet(FLAG_MIGRADA, "1");
  return { migrados: eventos.length };
}
