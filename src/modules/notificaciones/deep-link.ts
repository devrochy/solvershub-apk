import type { PushDatos } from "./provider";

/**
 * Pestaña del panel a la que lleva un push tocado por un dueño (los destinatarios de
 * los disparadores del backend son los dueños, ADR-0099). `null` = no navega.
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
