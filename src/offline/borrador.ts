import AsyncStorage from "@react-native-async-storage/async-storage";

const PREFIJO = "cobranza_borrador";

/**
 * Borrador de captura (REQ-APK-014): si un 401 tumba la sesión a mitad de una
 * operación, el formulario se persiste para restaurarlo tras volver a entrar.
 */
export async function guardarBorrador(clave: string, datos: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(`${PREFIJO}_${clave}`, JSON.stringify(datos));
  } catch {
    // Sin persistencia no se puede conservar el borrador; no se rompe el flujo.
  }
}

export async function leerBorrador<T>(clave: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(`${PREFIJO}_${clave}`);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function limpiarBorrador(clave: string): Promise<void> {
  await AsyncStorage.removeItem(`${PREFIJO}_${clave}`);
}
