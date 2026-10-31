/**
 * Bus del bloqueo por equipo (ADR-0174, HU-ACC-05): cualquier petición al backend que reciba un
 * 403 de equipo avisa aquí y la raíz de la app muestra la pantalla de espera o de bloqueo, en
 * vez de que cada módulo muestre un error suelto.
 */
export type CodigoDeEquipo =
  | "dispositivo_pendiente"
  | "dispositivo_bloqueado"
  | "dispositivo_no_autorizado"
  | "dispositivo_requerido";

const CODIGOS: readonly string[] = [
  "dispositivo_pendiente",
  "dispositivo_bloqueado",
  "dispositivo_no_autorizado",
  "dispositivo_requerido",
];

export function esCodigoDeEquipo(code: unknown): code is CodigoDeEquipo {
  return typeof code === "string" && CODIGOS.includes(code);
}

type Oyente = (codigo: CodigoDeEquipo) => void;

const oyentes = new Set<Oyente>();

export function emitirAccesoDeEquipo(codigo: CodigoDeEquipo): void {
  oyentes.forEach((fn) => fn(codigo));
}

export function suscribirAccesoDeEquipo(fn: Oyente): () => void {
  oyentes.add(fn);
  return () => {
    oyentes.delete(fn);
  };
}
