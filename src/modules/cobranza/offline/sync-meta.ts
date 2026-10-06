import AsyncStorage from "@react-native-async-storage/async-storage";

const CLAVE = "cobranza_ultima_sincronizacion";
const CLAVE_ERRORES = "cobranza_eventos_error";

/** Guarda el timestamp (ms) de la última sincronización exitosa. */
export async function guardarUltimaSincronizacion(ts: number): Promise<void> {
  await AsyncStorage.setItem(CLAVE, String(ts));
}

/** Lee el timestamp (ms) de la última sincronización; `null` si no hay o es inválido. */
export async function leerUltimaSincronizacion(): Promise<number | null> {
  const raw = await AsyncStorage.getItem(CLAVE);
  if (!raw) {
    return null;
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** Evento que el backend rechazó al sincronizar (REQ-APK-010). */
export interface EventoError {
  eventoIdCliente: string;
  tipoEvento: string;
  error: string;
  payload: Record<string, unknown>;
  creadoEn: string;
}

/** Persiste los eventos rechazados para que la UI permita reintentar/descartar. */
export async function guardarErroresSync(errores: EventoError[]): Promise<void> {
  await AsyncStorage.setItem(CLAVE_ERRORES, JSON.stringify(errores));
}

/** Lee los eventos rechazados; `[]` si no hay o está corrupto. */
export async function leerErroresSync(): Promise<EventoError[]> {
  const raw = await AsyncStorage.getItem(CLAVE_ERRORES);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as EventoError[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
