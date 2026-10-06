import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import {
  encolarEvento,
  listarEventos,
  vaciarCola,
} from "@data/repos/cola";
import { inicializarBase } from "@data/bootstrap";
import { migrarColaDesdeAsyncStorage } from "@data/migracion/desde-asyncstorage";
import type { SqlExecutor } from "@data/db/executor";

/**
 * Cola offline del campo (ADR-APP-04/05).
 *
 * API pública idéntica a la versión legacy (AsyncStorage) para no tocar a los
 * consumidores. El almacenamiento se elige UNA vez en caliente:
 *
 * 1. SQLite cifrado (`cola_evento`) — el camino nuevo. En la primera apertura
 *    traspasa la cola legacy con verificación de totales (ADR-APP-05).
 * 2. AsyncStorage — fallback si la base está apagada (kill-switch), falla al
 *    abrir, o la migración no verifica. Los datos legacy quedan intactos.
 */

export interface EventoOffline {
  eventoIdCliente: string;
  tipoEvento: string;
  payload: Record<string, unknown>;
  creadoEn: string;
  /** Clave local de deduplicación (NO se envía al backend). */
  dedupeKey?: string;
}

export const CLAVE_COLA = "cobranza_cola_offline";

/** Tope de eventos en la cola: evita que crezca sin cota ni se corrompa. */
export const MAX_COLA = 200;

const MODULO_COLA = "cobranza";

interface AlmacenCola {
  leer(): Promise<EventoOffline[]>;
  escribir(cola: EventoOffline[]): Promise<void>;
}

// ---------------------------------------------------------------- AsyncStorage

const almacenLegacy: AlmacenCola = {
  async leer() {
    const raw = await AsyncStorage.getItem(CLAVE_COLA);
    if (!raw) {
      return [];
    }
    try {
      return JSON.parse(raw) as EventoOffline[];
    } catch {
      return [];
    }
  },
  async escribir(cola) {
    await AsyncStorage.setItem(CLAVE_COLA, JSON.stringify(cola));
  },
};

// ---------------------------------------------------------------- SQLite

function filaAEvento(fila: { id: string; tipo: string; payload: string; creadoAt: string }): EventoOffline {
  let payload: Record<string, unknown> = {};
  let dedupeKey: string | undefined;
  try {
    const extra = JSON.parse(fila.payload) as { payload?: Record<string, unknown>; dedupeKey?: string | null };
    payload = extra.payload ?? {};
    dedupeKey = extra.dedupeKey ?? undefined;
  } catch {
    payload = {};
  }
  return {
    eventoIdCliente: fila.id,
    tipoEvento: fila.tipo,
    payload,
    creadoEn: fila.creadoAt,
    dedupeKey,
  };
}

function almacenSqlite(db: SqlExecutor): AlmacenCola {
  return {
    async leer() {
      const filas = await listarEventos(db, MODULO_COLA);
      return filas.map(filaAEvento);
    },
    async escribir(cola) {
      await vaciarCola(db, MODULO_COLA);
      for (const ev of cola) {
        await encolarEvento(db, {
          id: ev.eventoIdCliente,
          modulo: MODULO_COLA,
          tipo: ev.tipoEvento,
          payload: JSON.stringify({ payload: ev.payload, dedupeKey: ev.dedupeKey ?? null }),
          creadoAt: ev.creadoEn,
        });
      }
    },
  };
}

// ---------------------------------------------------------------- selección

let promesaAlmacen: Promise<AlmacenCola> | null = null;

export async function almacenCola(): Promise<AlmacenCola> {
  if (!promesaAlmacen) {
    promesaAlmacen = (async () => {
      try {
        const db = await inicializarBase();
        if (!db) {
          return almacenLegacy;
        }
        const resultado = await migrarColaDesdeAsyncStorage(db);
        if (resultado.error) {
          return almacenLegacy; // la cola legacy sigue siendo la fuente
        }
        return almacenSqlite(db);
      } catch {
        return almacenLegacy;
      }
    })();
  }
  return promesaAlmacen;
}

/** Solo tests: descarta la selección cacheada de almacenamiento. */
export function __resetAlmacenColaPruebas(): void {
  promesaAlmacen = null;
}

// ---------------------------------------------------------------- API pública

async function leer(): Promise<EventoOffline[]> {
  return (await almacenCola()).leer();
}

async function escribir(cola: EventoOffline[]): Promise<void> {
  await (await almacenCola()).escribir(cola);
}

/**
 * Encola un evento. Devuelve el evento, o `null` si la cola ya está llena
 * (para que la UI avise en vez de perder el dato en silencio).
 */
export async function encolar(
  tipoEvento: string,
  payload: Record<string, unknown>,
  dedupeKey?: string,
): Promise<EventoOffline | null> {
  const cola = await leer();
  if (cola.length >= MAX_COLA) {
    return null;
  }
  const evento: EventoOffline = {
    eventoIdCliente: Crypto.randomUUID(),
    tipoEvento,
    payload,
    creadoEn: new Date().toISOString(),
    dedupeKey,
  };
  await escribir([...cola, evento]);
  return evento;
}

/** ¿Ya hay un evento pendiente del mismo tipo con esa clave de deduplicación? */
export async function existePendiente(
  tipoEvento: string,
  dedupeKey: string,
): Promise<boolean> {
  const cola = await leer();
  return cola.some((e) => e.tipoEvento === tipoEvento && e.dedupeKey === dedupeKey);
}

/**
 * Fusiona campos en un evento pendiente (mismo tipo + dedupeKey) en vez de
 * descartar la segunda edición offline. Para `cambio_cliente` combina `input`.
 * Devuelve `true` si había un pendiente que fusionar.
 */
export async function fusionarPendiente(
  tipoEvento: string,
  dedupeKey: string,
  payload: Record<string, unknown>,
): Promise<boolean> {
  const cola = await leer();
  const indice = cola.findIndex(
    (e) => e.tipoEvento === tipoEvento && e.dedupeKey === dedupeKey,
  );
  if (indice === -1) {
    return false;
  }
  const actual = cola[indice];
  const base = { ...(actual.payload as Record<string, unknown>) };
  const extra = { ...payload };
  const previoInput = (base.input as Record<string, unknown>) ?? {};
  const nuevoInput = (extra.input as Record<string, unknown>) ?? {};
  const fusionado: EventoOffline = {
    ...actual,
    payload: {
      ...base,
      ...extra,
      ...(Object.keys(nuevoInput).length ? { input: { ...previoInput, ...nuevoInput } } : {}),
    },
    creadoEn: new Date().toISOString(),
  };
  cola[indice] = fusionado;
  await escribir(cola);
  return true;
}

/** Inserta un evento ya construido (p. ej. al reintentar uno rechazado). */
export async function insertarEvento(evento: EventoOffline): Promise<boolean> {
  const cola = await leer();
  if (cola.some((e) => e.eventoIdCliente === evento.eventoIdCliente)) {
    return false;
  }
  if (cola.length >= MAX_COLA) {
    return false;
  }
  await escribir([...cola, evento]);
  return true;
}

export async function listarCola(): Promise<EventoOffline[]> {
  return leer();
}

export async function contarCola(): Promise<number> {
  return (await leer()).length;
}

export async function removerDeCola(eventoIdCliente: string): Promise<void> {
  const cola = await leer();
  await escribir(cola.filter((e) => e.eventoIdCliente !== eventoIdCliente));
}

export async function limpiarCola(): Promise<void> {
  await escribir([]);
}
