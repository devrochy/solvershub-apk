import { decodeJwt } from "jose";
import type { TokenPair } from "../types/auth";

export interface AccessTokenPayload {
  sub: number;
  rol: "gestor";
  tipo: "access";
  usuario?: string;
  exp?: number;
}

export function decodeAccessToken(token: string): AccessTokenPayload | null {
  try {
    return decodeJwt(token) as AccessTokenPayload;
  } catch {
    return null;
  }
}

export function isAccessTokenExpired(token: string): boolean {
  const payload = decodeAccessToken(token);
  if (!payload || typeof payload.exp !== "number") {
    return true;
  }
  return payload.exp * 1000 <= Date.now();
}

export function buildAuthorizationHeader(pair: TokenPair): string {
  return `Bearer ${pair.accessToken}`;
}