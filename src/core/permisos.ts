/**
 * RBAC del panel aplicado a la navegación de la app (ADR-APP-02).
 *
 * Mismo criterio del sidebar del panel web: la app arma su navegación desde
 * `MeResponse.permissions` (claves de sección del core y de los packs,
 * ADR-0047/0063) y nunca muestra una sección a la que el usuario no tiene
 * acceso ("nunca un 403 por diseño", constitución §1.3).
 */

export type PermisosSeccion = Record<string, string | null>;

export function puedeVerSeccion(
  permissions: PermisosSeccion,
  seccion: string,
  esMaster: boolean,
): boolean {
  if (esMaster) {
    return true;
  }
  return permissions[seccion] != null;
}

/** Secciones de un grupo con acceso de LECTURA (o master). */
export function seccionesPermitidas(
  permissions: PermisosSeccion,
  secciones: string[],
  esMaster: boolean,
): string[] {
  return secciones.filter((s) => puedeVerSeccion(permissions, s, esMaster));
}

/** True si AL MENOS una sección del grupo es visible para el usuario. */
export function grupoVisible(
  permissions: PermisosSeccion,
  secciones: string[],
  esMaster: boolean,
): boolean {
  return seccionesPermitidas(permissions, secciones, esMaster).length > 0;
}
