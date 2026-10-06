import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

/**
 * Capa nativa de notificaciones push (ADR-0095, HU-APP-05).
 * Todo el acceso a expo-notifications vive aquí para poder mockearlo en tests.
 */

export const CANAL_DEFAULT = "solvershub-general";

export async function configurarCanal(): Promise<void> {
  if (Platform.OS !== "android") {
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
  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data ?? null;
}

export function addListener(
  handler: (data: Record<string, unknown> | undefined) => void,
): { remove(): void } {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    handler(response.notification.request.content.data as Record<string, unknown> | undefined);
  });
  return sub;
}
