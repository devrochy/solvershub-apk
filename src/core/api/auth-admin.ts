import { apiV1 } from "@core/config";
import type { LoginResult } from "@shared/types/auth";
import type { MeAdmin, TenantAdmin } from "../session/types";
import { imeiDelEquipo, leerWhatsappVinculacion } from "@shared/dispositivo";

/**
 * Cliente de la identidad admin (ADR-0094, HU-APP-02).
 *
 * La sesión admin usa un token opaco SIN refresh (como el panel): al expirar,
 * la app vuelve al login. El modo campo se obtiene con `gestorToken`, que
 * intercambia la sesión admin por el par access/refresh del pack (ADR-0081).
 * Contrato: core/api/routers/auth.py y pack_cobranza/admin_api.py del backend.
 */

export interface LoginAdminResult {
  token: string;
  adminId: string;
  expiresIn: number;
}

export class ApiAuthError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiAuthError";
  }
}

async function parseError(res: Response): Promise<ApiAuthError> {
  let code = "error";
  let message = "Ocurrió un error. Intenta de nuevo.";
  try {
    const body = (await res.json()) as {
      error?: { code?: string; message?: string };
    };
    code = body.error?.code ?? String(res.status);
    message = body.error?.message ?? message;
  } catch {
    // sin cuerpo JSON: se usa el mensaje genérico
  }
  return new ApiAuthError(res.status, code, message);
}

export async function apiLoginAdmin(
  identifier: string,
  password: string,
): Promise<LoginAdminResult> {
  const res = await fetch(apiV1("/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password }),
  });
  if (!res.ok) {
    throw await parseError(res);
  }
  return (await res.json()) as LoginAdminResult;
}

export async function apiMeAdmin(token: string, tenantId?: string): Promise<MeAdmin> {
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (tenantId) {
    headers["X-Tenant-Id"] = tenantId;
  }
  const res = await fetch(apiV1("/admin/me"), { headers });
  if (!res.ok) {
    throw await parseError(res);
  }
  return (await res.json()) as MeAdmin;
}

/** Negocios del admin para el selector multi-negocio (ADR-0077). */
export async function apiTenantsAdmin(token: string): Promise<TenantAdmin[]> {
  const res = await fetch(apiV1("/admin/tenants"), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw await parseError(res);
  }
  const body = (await res.json()) as { items?: TenantAdmin[] };
  return body.items ?? [];
}

export async function apiOlvidarContrasena(identifier: string): Promise<void> {
  const res = await fetch(apiV1("/auth/forgot-password"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier }),
  });
  // 202 siempre (sin fuga de cuentas, ADR-0094); cualquier otro status es
  // un error real de transporte/servidor.
  if (!res.ok) {
    throw await parseError(res);
  }
}

export async function apiRestablecerContrasena(
  token: string,
  newPassword: string,
): Promise<void> {
  const res = await fetch(apiV1("/auth/reset-password"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // La API /api/v1 usa snake_case (ADR-0076); el campo es `new_password`.
    body: JSON.stringify({ token, new_password: newPassword }),
  });
  if (!res.ok) {
    throw await parseError(res);
  }
}

/**
 * Intercambia la sesión admin por los tokens de campo del negocio activo
 * (ADR-0094). El cuerpo es el mismo del login unificado de campo (ADR-0081).
 */
export async function apiGestorToken(
  adminToken: string,
  tenantId: string,
): Promise<LoginResult> {
  // El enforcement de dispositivo (ADR-0068) exige las credenciales del equipo
  // una vez vinculado: se envían las persistidas durante la vinculación.
  const [imei, whatsapp] = await Promise.all([
    imeiDelEquipo(),
    leerWhatsappVinculacion(),
  ]);
  const res = await fetch(apiV1("/pack/cobranza/gestor-token"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "X-Tenant-Id": tenantId,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ imei, whatsapp }),
  });
  if (!res.ok) {
    throw await parseError(res);
  }
  return (await res.json()) as LoginResult;
}
