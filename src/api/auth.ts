import { authUrl } from "@core/config";
import { imeiDelEquipo, leerWhatsappVinculacion } from "../features/dispositivo/dispositivo";
import { ApiError } from "@core/api/client";
import type { Invitacion, LoginResult } from "@shared/types/auth";

export type RolLogin = "gestor" | "propietario";

/**
 * Login unificado (ADR-0081): sin rol ni slug. Devuelve tokens del negocio cuando
 * hay uno solo, o la lista de negocios para elegir. También cubre el caso de un
 * usuario sin membresías pero con invitaciones pendientes (`membresiaToken`).
 *
 * `tenant` (slug) fuerza el negocio: se usa al elegir en el selector y como
 * override de pruebas.
 */
export async function apiLogin(
  usuario: string,
  password: string,
  tenant?: string,
): Promise<LoginResult> {
  const [imei, whatsapp] = await Promise.all([
    imeiDelEquipo(),
    leerWhatsappVinculacion(),
  ]);
  const res = await fetch(authUrl("/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usuario, password, tenant, imei, whatsapp }),
  });

  if (!res.ok) {
    throw new ApiError(res.status, "Credenciales inválidas");
  }
  return (await res.json()) as LoginResult;
}

/** Invitaciones pendientes del usuario (token de campo o de membresía). */
export async function apiInvitaciones(token: string): Promise<Invitacion[]> {
  const res = await fetch(authUrl("/auth/invitaciones"), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new ApiError(res.status, "No se pudieron cargar las invitaciones");
  }
  return (await res.json()) as Invitacion[];
}

export async function apiResolverInvitacion(
  token: string,
  invitacionId: string,
  accion: "aceptar" | "rechazar",
): Promise<void> {
  const res = await fetch(authUrl(`/auth/invitaciones/${invitacionId}/${accion}`), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new ApiError(res.status, "No se pudo resolver la invitación");
  }
}
