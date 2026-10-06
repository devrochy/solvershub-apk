import type { ClienteAdmin } from "@core/api/admin";
import type { SqlExecutor } from "@data/db/executor";
import { encolarEscritura, registrarDespachador } from "@data/escrituras";
import { registrarAccionCritica } from "@data/auditoria-sync";
import { cambiarEstadoPedido, type EstadoPedido } from "./api";

/**
 * Cambio de estado de pedido con soporte offline (ADR-0097, HU-APP-15):
 * online → directo a la API; sin red → se encola y se despacha al reconectar.
 */

const MODULO = "comercio";
export const TIPO_PEDIDO_ESTADO = "pedido_estado";

export async function cambiarEstadoPedidoConOffline(
  db: SqlExecutor | null,
  cliente: ClienteAdmin,
  pedidoId: string,
  status: EstadoPedido,
  enLinea: boolean,
): Promise<"ok" | "encolado"> {
  if (db) {
    await registrarAccionCritica(db, {
      accion: "cambiar_estado_pedido",
      entidad: "pedido",
      entidadId: pedidoId,
      payload: { status, encolado: !enLinea },
    }).catch(() => undefined);
  }
  if (enLinea) {
    await cambiarEstadoPedido(cliente, pedidoId, status);
    return "ok";
  }
  if (!db) {
    throw new Error("offline_sin_base");
  }
  await encolarEscritura(db, MODULO, TIPO_PEDIDO_ESTADO, { pedidoId, status });
  return "encolado";
}

/** Registra el despachador de escrituras encoladas del módulo (idempotente). */
export function registrarDespachadorComercio(): void {
  registrarDespachador(MODULO, async (cliente, evento) => {
    const payload = JSON.parse(evento.payload) as { pedidoId: string; status: EstadoPedido };
    await cambiarEstadoPedido(cliente, payload.pedidoId, payload.status);
  });
}
