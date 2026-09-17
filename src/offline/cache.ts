import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  ClienteTarjetaPublic,
  TrayectoDiarioApkPublic,
  EstadisticasCarteraPublic,
  PrestamoPublic,
} from "../types/gestor";

const PREFIJO_TRAYECTO_DIARIO = "cobranza_cache_trayecto_diario";
const PREFIJO_CLIENTE = "cobranza_cache_cliente";
const PREFIJO_ESTADISTICAS = "cobranza_cache_estadisticas";

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

export async function guardarTrayectoDiario(carteraId: number, trayectoDiario: TrayectoDiarioApkPublic): Promise<void> {
  await escribir(`${PREFIJO_TRAYECTO_DIARIO}_${carteraId}`, trayectoDiario);
}

export async function leerTrayectoDiario(carteraId: number): Promise<TrayectoDiarioApkPublic | null> {
  return leer<TrayectoDiarioApkPublic>(`${PREFIJO_TRAYECTO_DIARIO}_${carteraId}`);
}

export async function guardarCliente(
  carteraId: number,
  clienteId: number,
  cache: ClienteCache,
): Promise<void> {
  await escribir(`${PREFIJO_CLIENTE}_${carteraId}_${clienteId}`, cache);
}

export async function leerCliente(
  carteraId: number,
  clienteId: number,
): Promise<ClienteCache | null> {
  return leer<ClienteCache>(`${PREFIJO_CLIENTE}_${carteraId}_${clienteId}`);
}

export async function guardarEstadisticasCartera(
  carteraId: number,
  estadisticas: EstadisticasCarteraPublic,
): Promise<void> {
  await escribir(`${PREFIJO_ESTADISTICAS}_${carteraId}`, estadisticas);
}

export async function leerEstadisticasCartera(
  carteraId: number,
): Promise<EstadisticasCarteraPublic | null> {
  return leer<EstadisticasCarteraPublic>(`${PREFIJO_ESTADISTICAS}_${carteraId}`);
}