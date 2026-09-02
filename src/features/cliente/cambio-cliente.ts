import type { ClienteTarjetaPublic } from "../../types/cobrador";

export interface CambioClienteInput {
  nombre?: string;
  apellido?: string;
  negocio?: string | null;
  telefonoWhatsapp?: string;
}

/**
 * Prellena la edición desde la tarjeta actual del cliente (solo los campos
 * editables básicos que la APK expone).
 */
export function edicionDesdeTarjeta(
  tarjeta: ClienteTarjetaPublic,
): CambioClienteInput {
  return {
    nombre: tarjeta.nombre,
    negocio: tarjeta.negocio,
    telefonoWhatsapp: tarjeta.telefonoWhatsapp,
  };
}

/**
 * Payload del evento offline `cambio_cliente` esperado por el backend
 * (`AplicarEventosOfflineService`): `{clienteId, input}`.
 */
export function cambioClientePayload(
  clienteId: number,
  input: CambioClienteInput,
): { clienteId: number; input: CambioClienteInput } {
  return { clienteId, input };
}

/** Clave de deduplicación local: no acumular ediciones del mismo cliente. */
export function dedupeKeyCambioCliente(clienteId: number): string {
  return `cambio_cliente-${clienteId}`;
}

const CAMBIABLES: Array<keyof CambioClienteInput> = [
  "nombre",
  "apellido",
  "negocio",
  "telefonoWhatsapp",
];

/**
 * Devuelve solo los campos de la edición que difieren de la tarjeta actual.
 * El backend rechaza un payload sin campos reales ("No hay campos para
 * actualizar"), así que se filtra lo que no cambió.
 */
export function camposCambiados(
  actual: CambioClienteInput,
  original: CambioClienteInput,
): CambioClienteInput {
  const cambiados: CambioClienteInput = {};
  for (const clave of CAMBIABLES) {
    const valor = actual[clave];
    if (valor !== original[clave]) {
      (cambiados as Record<keyof CambioClienteInput, unknown>)[clave] = valor;
    }
  }
  return cambiados;
}