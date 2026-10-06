import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

/**
 * Almacén seguro genérico (ADR-APP-03/05). Igual criterio que el token-store
 * legacy: expo-secure-store en iOS/Android (Keystore/Keychain) y SOLO memoria
 * en web (nunca localStorage, que es exfiltrable por XSS).
 */
const memoriaWeb = new Map<string, string>();

function esWeb(): boolean {
  return Platform.OS === "web";
}

export async function secureGet(key: string): Promise<string | null> {
  if (esWeb()) {
    return memoriaWeb.get(key) ?? null;
  }
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function secureSet(key: string, value: string): Promise<void> {
  if (esWeb()) {
    memoriaWeb.set(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function secureDelete(key: string): Promise<void> {
  if (esWeb()) {
    memoriaWeb.delete(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}
