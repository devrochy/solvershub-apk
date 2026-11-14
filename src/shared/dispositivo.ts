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

export interface EquipoActual {
  /** Android ID / id-for-vendor; vacío en la web o si el sistema no lo da. */
  id: string;
  /** Marca y modelo («samsung SM-A145M») para que el dueño reconozca el teléfono al aprobar. */
  label: string;
  plataforma: "android" | "ios";
}

/** Marca y modelo sin dependencias nativas nuevas (`expo-device` cambiaría la huella del OTA). */
function etiquetaDelEquipo(): string {
  try {
    const c = Platform.constants as { Brand?: string; Model?: string } | undefined;
    return [c?.Brand, c?.Model].filter(Boolean).join(" ").slice(0, 80);
  } catch {
    return "";
  }
}

/** Identidad del equipo para la política de dispositivos del negocio (ADR-0174, HU-ACC-05). */
export async function idDelEquipo(): Promise<EquipoActual> {
  return {
    id: await imeiDelEquipo(),
    label: etiquetaDelEquipo(),
    plataforma: Platform.OS === "ios" ? "ios" : "android",
  };
}

let cacheDelId: string | null = null;

/**
 * Cabecera `X-Device-Id` de toda petición al backend; vacía en la web o sin id (el backend la
 * trata como «sin equipo»). El id no cambia durante la ejecución: se lee una sola vez.
 */
export async function cabeceraDeEquipo(): Promise<Record<string, string>> {
  if (cacheDelId === null) {
    cacheDelId = (await imeiDelEquipo()).trim();
  }
  return cacheDelId ? { "X-Device-Id": cacheDelId } : {};
}

/** Solo pruebas: olvida el id leído. */
export function reiniciarCacheDeEquipo(): void {
  cacheDelId = null;
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
