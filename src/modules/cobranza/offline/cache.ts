import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  ClienteTarjetaPublic,
  TrayectoDiarioApkPublic,
  EstadisticasCarteraPublic,
  PrestamoPublic,
} from "@shared/types/gestor";

const PREFIJO_TRAYECTO_DIARIO = "cobranza_cache_trayecto_diario";
const PREFIJO_CLIENTE = "cobranza_cache_cliente";
const PREFIJO_ESTADISTICAS = "cobranza_cache_estadisticas";

/** TTL del cache offline: pasado este tiempo, el dato se considera vencido (REQ-APK-015). */
export const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export interface ClienteCache {
  tarjeta: ClienteTarjetaPublic;
  prestamos: PrestamoPublic[];
}

interface Envoltorio<T> {
  v: T;
  t: number;
}

async function leer<T>(clave: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(clave);
  if (!raw) {
    return null;
  }
  try {
    const envuelto = JSON.parse(raw) as Envoltorio<T>;
    if (typeof envuelto?.t !== "number" || Date.now() - envuelto.t > CACHE_TTL_MS) {
      return null;
    }
    return envuelto.v;
  } catch {
    return null;
  }
}

async function escribir<T>(clave: string, valor: T): Promise<void> {
  const envuelto: Envoltorio<T> = { v: valor, t: Date.now() };
  await AsyncStorage.setItem(clave, JSON.stringify(envuelto));
}

export async function guardarTrayectoDiario(carteraId: string, trayectoDiario: TrayectoDiarioApkPublic): Promise<void> {
  await escribir(`${PREFIJO_TRAYECTO_DIARIO}_${carteraId}`, trayectoDiario);
}

export async function leerTrayectoDiario(carteraId: string): Promise<TrayectoDiarioApkPublic | null> {
  return leer<TrayectoDiarioApkPublic>(`${PREFIJO_TRAYECTO_DIARIO}_${carteraId}`);
}

export async function guardarCliente(
  carteraId: string,
  clienteId: string,
  cache: ClienteCache,
): Promise<void> {
  await escribir(`${PREFIJO_CLIENTE}_${carteraId}_${clienteId}`, cache);
}

export async function leerCliente(
  carteraId: string,
  clienteId: string,
): Promise<ClienteCache | null> {
  return leer<ClienteCache>(`${PREFIJO_CLIENTE}_${carteraId}_${clienteId}`);
}

export async function guardarEstadisticasCartera(
  carteraId: string,
  estadisticas: EstadisticasCarteraPublic,
): Promise<void> {
  await escribir(`${PREFIJO_ESTADISTICAS}_${carteraId}`, estadisticas);
}

export async function leerEstadisticasCartera(
  carteraId: string,
): Promise<EstadisticasCarteraPublic | null> {
  return leer<EstadisticasCarteraPublic>(`${PREFIJO_ESTADISTICAS}_${carteraId}`);
}
