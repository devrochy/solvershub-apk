import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  ClienteTarjetaPublic,
  DiaApkPublic,
  PrestamoPublic,
} from "../types/cobrador";

const PREFIJO_DIA = "cobranza_cache_dia";
const PREFIJO_CLIENTE = "cobranza_cache_cliente";

export interface ClienteCache {
  tarjeta: ClienteTarjetaPublic;
  prestamos: PrestamoPublic[];
}

async function leer<T>(clave: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(clave);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function escribir(clave: string, valor: unknown): Promise<void> {
  await AsyncStorage.setItem(clave, JSON.stringify(valor));
}

export async function guardarDia(rutaId: number, dia: DiaApkPublic): Promise<void> {
  await escribir(`${PREFIJO_DIA}_${rutaId}`, dia);
}

export async function leerDia(rutaId: number): Promise<DiaApkPublic | null> {
  return leer<DiaApkPublic>(`${PREFIJO_DIA}_${rutaId}`);
}

export async function guardarCliente(
  rutaId: number,
  clienteId: number,
  cache: ClienteCache,
): Promise<void> {
  await escribir(`${PREFIJO_CLIENTE}_${rutaId}_${clienteId}`, cache);
}

export async function leerCliente(
  rutaId: number,
  clienteId: number,
): Promise<ClienteCache | null> {
  return leer<ClienteCache>(`${PREFIJO_CLIENTE}_${rutaId}_${clienteId}`);
}