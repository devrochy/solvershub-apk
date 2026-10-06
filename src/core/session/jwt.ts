import { decodeJwt } from "jose";
import type { TokenPair } from "@shared/types/auth";

export interface AccessTokenPayload {
  /** Identidad del pack (ADR-0066): `admins.id` + perfil opcional del gestor. */
  admin_id: string;
  gestor_id?: string;
  rol: "gestor" | "propietario" | "master";
  typ: "access" | "refresh";
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