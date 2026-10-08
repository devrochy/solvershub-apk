import { Platform } from "react-native";
import { isRunningInExpoGo } from "expo";

/**
 * Capa nativa de notificaciones push (ADR-0095, HU-APP-05).
 * Todo el acceso a expo-notifications vive aquí para poder mockearlo en tests.
 *
 * IMPORTANTE — Expo Go: desde SDK 53 el push REMOTO no existe en Expo Go.
 * Además, **importar** el paquete evalúa su auto-registro
 * (`DevicePushTokenAutoRegistration.fx`), que llama a `warnOfExpoGoPushUsage()`
 * y LANZA en Android dentro de Expo Go durante la evaluación del bundle
 * (`[runtime not ready]`). Por eso el paquete se carga con require DIFERIDO y
 * nunca se evalúa en Expo Go; el push real corre en dev client, preview y
 * producción (builds propios con los módulos nativos).
 */

type ModuloNotificaciones = typeof import("expo-notifications");

export const CANAL_DEFAULT = "solvershub-general";

/** True cuando la app corre dentro de Expo Go (sin builds propias). */
export function enExpoGo(): boolean {
  try {
    return isRunningInExpoGo();
  } catch {
    return false;
  }
}

/** Carga expo-notifications solo fuera de Expo Go (null allí). */
function notificaciones(): ModuloNotificaciones | null {
  if (enExpoGo()) {
    return null;
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("expo-notifications") as ModuloNotificaciones;
}

export async function configurarCanal(): Promise<void> {
  const Notifications = notificaciones();
  if (!Notifications || Platform.OS !== "android") {
    return;
  }
  await Notifications.setNotificationChannelAsync(CANAL_DEFAULT, {
    name: "General",
    importance: Notifications.AndroidImportance.MAX,
    sound: "default",
  });
}

/**
 * Pide permiso si no está concedido y devuelve true si quedó concedido.
 *
 * Android 13+: el diálogo no aparece hasta que exista un canal, así que se crea
 * antes; y un permiso nunca pedido llega como `denied` (no hay "undetermined"),
 * por eso se pregunta mientras `canAskAgain` no sea false.
 */
export async function solicitarPermisos(): Promise<boolean> {
  const Notifications = notificaciones();
  if (!Notifications) {
    return false;
  }
  await configurarCanal();
  const actual = await Notifications.getPermissionsAsync();
  if (actual.status === "granted") {
    return true;
  }
  if (actual.canAskAgain === false) {
    return false;
  }
  const pedido = await Notifications.requestPermissionsAsync();
  return pedido.status === "granted";
}

export async function obtenerTokenExpo(projectId: string): Promise<string | null> {
  const Notifications = notificaciones();
  if (!Notifications) {
    return null;
  }
  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data ?? null;
}

export function addListener(
  handler: (data: Record<string, unknown> | undefined) => void,
): { remove(): void } {
  const Notifications = notificaciones();
  if (!Notifications) {
    return { remove: () => undefined };
  }
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    handler(response.notification.request.content.data as Record<string, unknown> | undefined);
  });
  return sub;
}
