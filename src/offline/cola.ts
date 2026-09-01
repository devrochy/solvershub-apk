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

export async function encolar(
  tipoEvento: string,
  payload: Record<string, unknown>,
  dedupeKey?: string,
): Promise<EventoOffline> {
  const evento: EventoOffline = {
    eventoIdCliente: Crypto.randomUUID(),
    tipoEvento,
    payload,
    creadoEn: new Date().toISOString(),
    dedupeKey,
  };
  const cola = await leer();
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