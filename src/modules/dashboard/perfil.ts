import type { PermisosSeccion } from "@core/permisos";

/**
 * Perfil del Resumen derivado de los permisos (D-SPEC-29-7, ADR-0047). Sin roles nuevos en el
 * backend: dueño si es dueño del negocio o master; supervisor si escribe en alguna sección de un
 * pack; operador en cualquier otro caso (solo atención).
 */
export type PerfilResumen = "dueno" | "supervisor" | "operador";

export const ETIQUETA_PERFIL: Record<PerfilResumen, string> = {
  dueno: "Perfil Dueño",
  supervisor: "Perfil Supervisor",
  operador: "Perfil Operador",
};

/** Packs con sección propia en el catálogo de permisos (`pack_cobranza`, `pack_cobranza:reportes`…). */
export const PACKS_DEL_RESUMEN = ["pack_cobranza", "pack_commerce", "pack_calendar", "pack_subscriptions"] as const;
export type PackResumen = (typeof PACKS_DEL_RESUMEN)[number];

export interface EntradaPerfil {
  /** Rol de plataforma: `master` y `tester` operan como dueño; el resto, según el negocio. */
  role?: string | null;
  /** Rol dentro del negocio activo (`owner`, `colaborador`). */
  tenantRole?: string | null;
  permissions?: PermisosSeccion | null;
}

function packDeSeccion(seccion: string): string {
  return seccion.split(":")[0] ?? seccion;
}

/** Packs en los que el usuario tiene escritura (la sub-sección cuenta como el pack). */
export function packsConEscritura(permissions: PermisosSeccion | null | undefined): PackResumen[] {
  const claves = Object.entries(permissions ?? {})
    .filter(([, acceso]) => acceso === "write")
    .map(([seccion]) => packDeSeccion(seccion));
  return PACKS_DEL_RESUMEN.filter((pack) => claves.includes(pack));
}

export function derivarPerfil(entrada: EntradaPerfil): PerfilResumen {
  if (entrada.role === "master" || entrada.role === "tester" || entrada.tenantRole === "owner") {
    return "dueno";
  }
  return packsConEscritura(entrada.permissions).length > 0 ? "supervisor" : "operador";
}
