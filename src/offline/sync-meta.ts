import AsyncStorage from "@react-native-async-storage/async-storage";

const CLAVE = "cobranza_ultima_sincronizacion";

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
