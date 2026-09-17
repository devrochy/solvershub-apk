import AsyncStorage from "@react-native-async-storage/async-storage";

const CLAVE = "cobranza_trayectoria_activa";

export interface PuntoTrayectoria {
  latitud: number;
  longitud: number;
}

export interface TrayectoriaGuardada {
  puntos: PuntoTrayectoria[];
  activa: boolean;
}

/** Persiste la trayectoria en curso (puntos + si el GPS sigue activo). */
export async function guardarTrayectoriaActiva(
  trayectoria: TrayectoriaGuardada,
): Promise<void> {
  await AsyncStorage.setItem(CLAVE, JSON.stringify(trayectoria));
}

/** Lee la trayectoria guardada; `null` si no hay o está corrupta. */
export async function leerTrayectoriaActiva(): Promise<TrayectoriaGuardada | null> {
  const raw = await AsyncStorage.getItem(CLAVE);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as TrayectoriaGuardada;
    if (!Array.isArray(parsed?.puntos)) {
      return null;
    }
    return { puntos: parsed.puntos, activa: Boolean(parsed.activa) };
  } catch {
    return null;
  }
}

/** Limpia la trayectoria guardada (al detener la grabación). */
export async function limpiarTrayectoriaActiva(): Promise<void> {
  await AsyncStorage.removeItem(CLAVE);
}
