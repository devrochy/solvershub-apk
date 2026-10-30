import AsyncStorage from "@react-native-async-storage/async-storage";

/** Marca local: el video de presentación ya se vio en este dispositivo. */
export const CLAVE_PRESENTACION = "solvershub:presentacion:v1";

export interface EstadoPresentacion {
  haySesion: boolean;
  vista: boolean;
  reduceMotion: boolean;
}

/**
 * El video solo se muestra a quien todavía no tiene sesión, no lo ha visto y
 * no pidió reducir el movimiento. Así no interrumpe a quien ya está trabajando.
 */
export function debeMostrarPresentacion({
  haySesion,
  vista,
  reduceMotion,
}: EstadoPresentacion): boolean {
  return !haySesion && !vista && !reduceMotion;
}

/**
 * Lee el flag local. Si AsyncStorage falla, se asume visto para no retener la
 * entrada al login por un error de lectura.
 */
export async function leerPresentacionVista(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(CLAVE_PRESENTACION)) === "1";
  } catch {
    return true;
  }
}

/** Persiste que el video ya se vio; un fallo de escritura no bloquea la app. */
export async function marcarPresentacionVista(): Promise<void> {
  try {
    await AsyncStorage.setItem(CLAVE_PRESENTACION, "1");
  } catch {
    // La sesión actual ya no lo repite; en la próxima se reintenta la lectura.
  }
}
