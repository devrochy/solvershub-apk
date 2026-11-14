import type { components } from "@core/api/schema";

/** Cuenta del equipo tal como la entrega la API admin. */
export type ColaboradorEquipo = components["schemas"]["CollaboratorItem"];

type OyenteApertura = (colaborador: ColaboradorEquipo) => void;
type OyenteCambio = () => void;

const oyentesApertura = new Set<OyenteApertura>();
const oyentesCambio = new Set<OyenteCambio>();

let pendiente: ColaboradorEquipo | null = null;

/**
 * Pide al shell abrir la ficha de un colaborador. La lista vive dentro de la
 * pestaña de Configuración y el detalle es una ruta del stack raíz; el bus
 * evita que el módulo conozca la navegación (ADR-APP-01).
 */
export function abrirColaborador(colaborador: ColaboradorEquipo): void {
  if (oyentesApertura.size === 0) {
    pendiente = colaborador;
    return;
  }
  oyentesApertura.forEach((fn) => fn(colaborador));
}

export function suscribirAperturaColaborador(fn: OyenteApertura): () => void {
  oyentesApertura.add(fn);
  if (pendiente) {
    const colaborador = pendiente;
    pendiente = null;
    fn(colaborador);
  }
  return () => {
    oyentesApertura.delete(fn);
  };
}

/** Avisa que una cuenta cambió (estado, permisos, vínculos) y la lista debe refrescarse. */
export function notificarCambioEquipo(): void {
  oyentesCambio.forEach((fn) => fn());
}

export function suscribirCambioEquipo(fn: OyenteCambio): () => void {
  oyentesCambio.add(fn);
  return () => {
    oyentesCambio.delete(fn);
  };
}
