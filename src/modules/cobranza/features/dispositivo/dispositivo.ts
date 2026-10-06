import { Platform } from "react-native";
import * as Application from "expo-application";
import * as SecureStore from "expo-secure-store";

const WHATSAPP_KEY = "cobranza_whatsapp_vinculacion";
const memoriaWeb = new Map<string, string>();

/**
 * Identificador del equipo (HU-39/43): el **Android ID** (no el IMEI real, por
 * privacidad); en iOS el id-for-vendor. En web no hay identificador: cadena vacía.
 */
export async function imeiDelEquipo(): Promise<string> {
  try {
    if (Platform.OS === "android") {
      return Application.getAndroidId() ?? "";
    }
    if (Platform.OS === "ios") {
      return (await Application.getIosIdForVendorAsync()) ?? "";
    }
  } catch {
    // Sin identificador disponible: se envía vacío (el backend lo maneja).
  }
  return "";
}

export async function leerWhatsappVinculacion(): Promise<string> {
  if (Platform.OS === "web") {
    return memoriaWeb.get(WHATSAPP_KEY) ?? "";
  }
  try {
    return (await SecureStore.getItemAsync(WHATSAPP_KEY)) ?? "";
  } catch {
    return "";
  }
}

export async function guardarWhatsappVinculacion(whatsapp: string): Promise<void> {
  if (Platform.OS === "web") {
    memoriaWeb.set(WHATSAPP_KEY, whatsapp);
    return;
  }
  try {
    await SecureStore.setItemAsync(WHATSAPP_KEY, whatsapp);
  } catch {
    // Sin persistencia no se pierde el flujo actual; se reingresa en el siguiente.
  }
}
