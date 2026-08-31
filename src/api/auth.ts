import { authUrl } from "../config";
import { ApiError } from "./client";
import type { LoginResult } from "../types/auth";

/**
 * Login del cobrador (endpoint sin autenticación).
 */
export async function apiLogin(
  usuario: string,
  password: string,
): Promise<LoginResult> {
  const res = await fetch(authUrl("/auth/cobrador/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usuario, password }),
  });

  if (!res.ok) {
    throw new ApiError(res.status, "Credenciales inválidas");
  }
  return (await res.json()) as LoginResult;
}