export interface TenantAdmin {
  id: string;
  name: string;
  role: string;
  active: boolean;
}

export interface MeAdmin {
  adminId: string;
  email: string;
  username: string | null;
  role: string;
  tenant: TenantAdmin | null;
  tenantCount: number;
  permissions: Record<string, string | null>;
}

/** Sesión admin persistida (token opaco de `AdminSession`, ADR-0077/0094). */
export interface AdminSesion {
  token: string;
  adminId: string;
  email: string;
  role: string;
  tenantId: string | null;
  tenantName: string | null;
  permissions: Record<string, string | null>;
}

export const CLAVE_SESION_ADMIN = "solvershub_admin_sesion";
export const CLAVE_BIOMETRIA = "solvershub_biometria_habilitada";
