/** Bus de navegación entre módulos (HU-APP-21): permite que una pantalla
 * anidada (p. ej. Búsqueda) pida al shell cambiar de tab sin acoplarse a
 * React Navigation directamente. */
export interface DestinoNavegacion {
  /** Módulo del panel (`ModuloPanel` del shell). */
  tab: string;
  /** Pestaña interna del módulo, si se quiere abrir una concreta. */
  pestana?: string;
  /** Sección de ajustes que debe abrir la pantalla de Agenda (HU-CAL-08). */
  ajustes?: string;
  /** Id del cliente cuya ficha se abre sobre la lista (HU-CRM-20). */
  cliente?: string;
}

type Oyente = (destino: DestinoNavegacion) => void;

const oyentes = new Set<Oyente>();

/** Destino emitido sin nadie escuchando (p. ej. un push tocado con la app cerrada,
 * antes de que el shell monte): se entrega una vez al primer suscriptor. */
let pendiente: DestinoNavegacion | null = null;

export function emitirNavegacion(destino: DestinoNavegacion): void {
  if (oyentes.size === 0) {
    pendiente = destino;
    return;
  }
  oyentes.forEach((fn) => fn(destino));
}

export function suscribirNavegacion(fn: Oyente): () => void {
  oyentes.add(fn);
  if (pendiente) {
    const destino = pendiente;
    pendiente = null;
    fn(destino);
  }
  return () => {
    oyentes.delete(fn);
  };
}
