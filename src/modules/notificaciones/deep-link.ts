import type { DestinoNavegacion } from "@shared/navegacion-evento";
import type { PushDatos } from "./provider";
import type { NotificacionDestino } from "./tipos";

/**
 * Pestaña del panel a la que lleva un push legado (`data.type`) tocado por un dueño.
 * `null` = no navega. Los push del centro de notificaciones traen además `data.target`
 * (`destinoDeNotificacion`), que manda sobre este.
 */
export function tabDelPanelParaPush(datos: PushDatos | undefined): string | null {
  switch (datos?.type) {
    case "core.escalation":
      return "conversaciones";
    case "cobranza.sync":
      return "cobranza";
    default:
      return null;
  }
}

/**
 * Módulo y pestaña del panel de la app para el destino neutro `{entity, id, section}` del
 * backend (ADR-0167). `null` = la app no tiene pantalla para esa entidad (solo se marca leída).
 * El shell ignora los módulos que el usuario no ve.
 */
export function destinoDeNotificacion(destino: NotificacionDestino | null | undefined): DestinoNavegacion | null {
  if (!destino) return null;
  switch (destino.entity) {
    case "conversacion":
      return { tab: "conversaciones", pestana: destino.section === "escalations" ? "escalaciones" : "conversaciones" };
    case "escalacion":
      return { tab: "conversaciones", pestana: "escalaciones" };
    case "lead":
    case "cliente":
      return { tab: "conversaciones", pestana: "leads" };
    case "pedido":
    case "pago":
      return { tab: "comercio", pestana: "pedidos" };
    case "cita":
      return { tab: "calendario", pestana: "semana" };
    case "conexion":
      return { tab: "configuracion", pestana: "conexiones" };
    case "mensaje_fallido":
      return { tab: "herramientas", pestana: "fallos" };
    case "cobranza":
      return { tab: "cobranza", pestana: "resumen" };
    default:
      return null;
  }
}

function esDestino(valor: unknown): valor is NotificacionDestino {
  return !!valor && typeof valor === "object" && typeof (valor as { entity?: unknown }).entity === "string";
}

/** Destino de un push tocado: el `target` neutro si viene; si no, el `type` legado. */
export function destinoDePush(datos: PushDatos | undefined): DestinoNavegacion | null {
  const neutro = destinoDeNotificacion(esDestino(datos?.target) ? datos?.target : null);
  if (neutro) return neutro;
  const tab = tabDelPanelParaPush(datos);
  return tab ? { tab } : null;
}
