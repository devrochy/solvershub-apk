import * as SecureStore from "expo-secure-store";
import type { TokenPair } from "../types/auth";

const ACCESS_KEY = "cobranza_access_token";
const REFRESH_KEY = "cobranza_refresh_token";
const PROFILE_KEY = "cobranza_cobrador_profile";

export interface CobradorPerfil {
  id: number;
  usuario: string;
  nombre: string;
  apellido: string;
}

export interface StoredSession {
  accessToken: string;
  refreshToken: string;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * expo-secure-store no existe en web (módulo vacío), así que la APK cae a
 * localStorage en la build web y a secure-store en iOS/Android.
 */
function webStorage(): StorageLike | null {
  if (typeof globalThis.localStorage === "undefined") {
    return null;
  }
  return globalThis.localStorage;
}

async function getItem(key: string): Promise<string | null> {
  const storage = webStorage();
  if (storage) {
    return storage.getItem(key);
  }
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function setItem(key: string, value: string): Promise<void> {
  const storage = webStorage();
  if (storage) {
    storage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function deleteItem(key: string): Promise<void> {
  const storage = webStorage();
  if (storage) {
    storage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function readSession(): Promise<StoredSession | null> {
  const [accessToken, refreshToken] = await Promise.all([
    getItem(ACCESS_KEY),
    getItem(REFRESH_KEY),
  ]);
  if (!accessToken || !refreshToken) {
    return null;
  }
  return { accessToken, refreshToken };
}

export async function readProfile(): Promise<CobradorPerfil | null> {
  const raw = await getItem(PROFILE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as CobradorPerfil;
  } catch {
    return null;
  }
}

export async function writeSession(pair: TokenPair): Promise<void> {
  await Promise.all([
    setItem(ACCESS_KEY, pair.accessToken),
    setItem(REFRESH_KEY, pair.refreshToken),
  ]);
}

export async function writeProfile(perfil: CobradorPerfil): Promise<void> {
  await setItem(PROFILE_KEY, JSON.stringify(perfil));
}

export async function clearSession(): Promise<void> {
  await Promise.all([
    deleteItem(ACCESS_KEY),
    deleteItem(REFRESH_KEY),
    deleteItem(PROFILE_KEY),
  ]);
}

export const sessionGateway = {
  getTokens: () => readSession(),
  saveTokens: (pair: TokenPair) => writeSession(pair),
  clear: () => clearSession(),
};