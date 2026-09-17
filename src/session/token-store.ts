import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import type { TokenPair } from "../types/auth";

const ACCESS_KEY = "cobranza_access_token";
const REFRESH_KEY = "cobranza_refresh_token";
const PROFILE_KEY = "cobranza_gestor_profile";

export type RolUsuario = "gestor" | "propietario";

export interface UsuarioPerfil {
  id: number;
  usuario: string;
  nombre: string;
  apellido: string;
  rol: RolUsuario;
}

export interface StoredSession {
  accessToken: string;
  refreshToken: string;
}

/**
 * expo-secure-store no existe en web (módulo vacío). Por seguridad los tokens
 * en la build web viven SOLO en memoria (Map de módulo): nunca se persisten a
 * localStorage, que es exfiltrable por XSS. Al recargar la página hay que
 * volver a iniciar sesión. En iOS/Android se usa expo-secure-store.
 */
const memoriaWeb = new Map<string, string>();

function esWeb(): boolean {
  return Platform.OS === "web";
}

async function getItem(key: string): Promise<string | null> {
  if (esWeb()) {
    return memoriaWeb.get(key) ?? null;
  }
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function setItem(key: string, value: string): Promise<void> {
  if (esWeb()) {
    memoriaWeb.set(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function deleteItem(key: string): Promise<void> {
  if (esWeb()) {
    memoriaWeb.delete(key);
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

export async function readProfile(): Promise<UsuarioPerfil | null> {
  const raw = await getItem(PROFILE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as UsuarioPerfil;
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

export async function writeProfile(perfil: UsuarioPerfil): Promise<void> {
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