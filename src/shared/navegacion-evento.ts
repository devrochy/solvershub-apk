/** Bus de navegación entre módulos (HU-APP-21): permite que una pantalla
 * anidada (p. ej. Búsqueda) pida al shell cambiar de tab sin acoplarse a
 * React Navigation directamente. */
export interface DestinoNavegacion {
  tab: string;
}

type Oyente = (destino: DestinoNavegacion) => void;

const oyentes = new Set<Oyente>();

export function emitirNavegacion(destino: DestinoNavegacion): void {
  oyentes.forEach((fn) => fn(destino));
}

export function suscribirNavegacion(fn: Oyente): () => void {
  oyentes.add(fn);
  return () => {
    oyentes.delete(fn);
  };
}
