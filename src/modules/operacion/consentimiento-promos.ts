import { AdminApiError } from "@core/api/admin";
import type { AdminSesion } from "@core/session/types";
import type { Consentimiento } from "./api";

/** Orígenes de baja que deja el propio cliente (o Meta): no se deshacen desde la ficha (D-SPEC-33-9). */
const ORIGENES_DE_BAJA_DEL_CLIENTE = new Set(["palabra_de_baja", "meta_131050"]);

export const AVISO_SOLO_PROPIETARIO =
  "Solo el propietario del negocio puede registrar que un cliente aceptó recibir promociones.";

export const AVISO_BAJA_DEL_CLIENTE =
  "El cliente pidió dejar de recibir promociones (o WhatsApp ya no le entrega marketing). Solo él puede volver a aceptarlas, no se puede marcar desde la ficha.";

/**
 * ¿Propietario del negocio activo o admin de plataforma (master, o tester en su negocio de pruebas)?
 * Misma regla que `es_owner_o_master` del servidor: el permiso de sección no alcanza.
 */
export function esPropietarioOPlataforma(sesion: Pick<AdminSesion, "role" | "tenantRole"> | null | undefined): boolean {
  return Boolean(sesion && (sesion.role === "master" || sesion.role === "tester" || sesion.tenantRole === "owner"));
}

/** ¿La última fila es una baja pedida por el cliente o impuesta por Meta? Entonces no se ofrece reactivar. */
export function esBajaDelCliente(datos: Pick<Consentimiento, "estado" | "historial"> | null | undefined): boolean {
  const ultimo = datos?.historial[0];
  return datos?.estado === "revocado" && Boolean(ultimo && ORIGENES_DE_BAJA_DEL_CLIENTE.has(ultimo.origen));
}

/** Mensaje legible para un error al guardar el consentimiento (403 solo propietario; 409 baja del cliente). */
export function mensajeDeErrorAlGuardarConsentimiento(error: unknown): string {
  if (error instanceof AdminApiError) {
    if (error.status === 403) return AVISO_SOLO_PROPIETARIO;
    if (error.status === 409 && error.code === "baja_del_cliente") return AVISO_BAJA_DEL_CLIENTE;
  }
  return "No se pudo guardar el consentimiento.";
}
