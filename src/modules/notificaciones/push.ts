import { Platform } from "react-native";
import { isRunningInExpoGo } from "expo";
import * as Notifications from "expo-notifications";

/**
 * Capa nativa de notificaciones push (ADR-0095, HU-APP-05).
 * Todo el acceso a expo-notifications vive aquí para poder mockearlo en tests.
 *
 * IMPORTANTE — Expo Go: desde SDK 53 el push REMOTO no existe en Expo Go
 * (Android lanza al pedir el token). Todas las funciones son no-op en Expo Go
 * para que el desarrollo con QR no falle; el push real corre en dev client,
 * preview y producción (builds propios con los módulos nativos).
 */

export const CANAL_DEFAULT = "solvershub-general";

/** True cuando la app corre dentro de Expo Go (sin builds propias). */
export function enExpoGo(): boolean {
  try {
    return isRunningInExpoGo();
  } catch {
    return false;
  }
}

export async function configurarCanal(): Promise<void> {
  if (enExpoGo() || Platform.OS !== "android") {
    return;
  }
  await Notifications.setNotificationChannelAsync(CANAL_DEFAULT, {
    name: "General",
    importance: Notifications.AndroidImportance.MAX,
    sound: "default",
  });
}

/** Pide permiso (si no está resuelto) y devuelve true si quedó concedido. */
export async function solicitarPermisos(): Promise<boolean> {
  if (enExpoGo()) {
    return false;
  }
  const actual = await Notifications.getPermissionsAsync();
  if (actual.status === "granted") {
    return true;
  }
  if (actual.status === "undetermined") {
    const pedido = await Notifications.requestPermissionsAsync();
    return pedido.status === "granted";
  }
  return false;
}

export async function obtenerTokenExpo(projectId: string): Promise<string | null> {
  if (enExpoGo()) {
    return null;
  }
  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data ?? null;
}

export function addListener(
  handler: (data: Record<string, unknown> | undefined) => void,
): { remove(): void } {
  if (enExpoGo()) {
    return { remove: () => undefined };
  }
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    handler(response.notification.request.content.data as Record<string, unknown> | undefined);
  });
  return sub;
}
