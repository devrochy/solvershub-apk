import { authUrl } from "../config";
import { ApiError } from "./client";
import type { LoginResult } from "../types/auth";

export type RolLogin = "cobrador" | "socio";

/**
 * Login del cobrador o socio (endpoints sin autenticación).
 */
export async function apiLogin(
  usuario: string,
  password: string,
  rol: RolLogin = "cobrador",
): Promise<LoginResult> {
  const path = rol === "socio" ? "/auth/socio/login" : "/auth/cobrador/login";
  const res = await fetch(authUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usuario, password }),
  });

  if (!res.ok) {
    throw new ApiError(res.status, "Credenciales inválidas");
  }
  return (await res.json()) as LoginResult;
}