import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";

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

async function leer(): Promise<EventoOffline[]> {
  const raw = await AsyncStorage.getItem(CLAVE_COLA);
  if (!raw) {
    return [];
  }
  try {
    return JSON.parse(raw) as EventoOffline[];
  } catch {
    return [];
  }
}

async function escribir(cola: EventoOffline[]): Promise<void> {
  await AsyncStorage.setItem(CLAVE_COLA, JSON.stringify(cola));
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
