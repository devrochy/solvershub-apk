import type { ClienteTarjetaPublic } from "../../types/cobrador";

export interface CambioClienteInput {
  nombre?: string;
  apellido?: string;
  negocio?: string | null;
  telefonoWhatsapp?: string;
  latitud?: number;
  longitud?: number;
  latitudDomicilio?: number | null;
  longitudDomicilio?: number | null;
}

/**
 * Prellena la edición desde la tarjeta actual del cliente: nombre completo,
 * apellido derivado (última(s) palabra(s) del nombre), negocio y WhatsApp.
 * Las coordenadas (negocio/domicilio) se completan en la pantalla desde las
 * props de navegación cuando están disponibles.
 */
export function edicionDesdeTarjeta(
  tarjeta: ClienteTarjetaPublic,
): CambioClienteInput {
  const partes = tarjeta.nombre.trim().split(/\s+/);
  return {
    nombre: tarjeta.nombre,
    apellido: partes.length > 1 ? partes.slice(1).join(" ") : "",
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
  "latitud",
  "longitud",
  "latitudDomicilio",
  "longitudDomicilio",
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
    let valor = actual[clave];
    if (clave === "negocio" && valor === "") {
      valor = null;
    }
    if (valor !== original[clave]) {
      (cambiados as Record<keyof CambioClienteInput, unknown>)[clave] = valor;
    }
  }
  return cambiados;
}