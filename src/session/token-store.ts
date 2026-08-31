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

async function getItem(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
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
    SecureStore.setItemAsync(ACCESS_KEY, pair.accessToken),
    SecureStore.setItemAsync(REFRESH_KEY, pair.refreshToken),
  ]);
}

export async function writeProfile(perfil: CobradorPerfil): Promise<void> {
  await SecureStore.setItemAsync(PROFILE_KEY, JSON.stringify(perfil));
}

export async function clearSession(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_KEY),
    SecureStore.deleteItemAsync(REFRESH_KEY),
    SecureStore.deleteItemAsync(PROFILE_KEY),
  ]);
}

export const sessionGateway = {
  getTokens: () => readSession(),
  saveTokens: (pair: TokenPair) => writeSession(pair),
  clear: () => clearSession(),
};