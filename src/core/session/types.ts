import type { components } from "@core/api/schema";

/** Negocio visible para el admin (mismo contrato que `TenantOption`). */
export type TenantAdmin = components["schemas"]["TenantOption"];

/** Respuesta real de `/admin/me` (snake_case del contrato OpenAPI). */
export type MeAdmin = components["schemas"]["MeResponse"];

/** Sesión admin persistida (token opaco de `AdminSession`, ADR-0077/0094). */
export interface AdminSesion {
  token: string;
  adminId: string;
  email: string;
  /** Nombre visible del perfil; las sesiones antiguas pueden no traerlo. */
  nombre?: string | null;
  username?: string | null;
  telefono?: string | null;
  /** URL firmada del avatar; caduca, se refresca al abrir el cajón/perfil. */
  avatarUrl?: string | null;
  role: string;
  tenantId: string | null;
  tenantName: string | null;
  permissions: Record<string, string | null>;
}

/** Perfil ya normalizado para la UI (camelCase y sin campos internos). */
export interface PerfilAdmin {
  nombre: string | null;
  username: string | null;
  telefono: string | null;
  avatarUrl: string | null;
  email: string;
  role: string;
  tenantName: string | null;
}

export function normalizarPerfil(me: MeAdmin): PerfilAdmin {
  return {
    nombre: me.nombre ?? null,
    username: me.username,
    telefono: me.telefono ?? null,
    avatarUrl: me.avatar_url ?? null,
    email: me.email,
    role: me.role,
    tenantName: me.tenant?.name ?? null,
  };
}

/** Perfil mínimo con lo persistido en la sesión, antes de consultar `/admin/me`. */
export function perfilDeSesion(sesion: AdminSesion): PerfilAdmin {
  return {
    nombre: sesion.nombre ?? null,
    username: sesion.username ?? null,
    telefono: sesion.telefono ?? null,
    avatarUrl: sesion.avatarUrl ?? null,
    email: sesion.email,
    role: sesion.role,
    tenantName: sesion.tenantName,
  };
}

export const CLAVE_SESION_ADMIN = "solvershub_admin_sesion";
export const CLAVE_BIOMETRIA = "solvershub_biometria_habilitada";
