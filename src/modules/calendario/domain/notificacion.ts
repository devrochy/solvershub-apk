/** Texto para el negocio con lo que de verdad le llegó al cliente (HU-CAL-05). */
export type AvisoCliente = {
  email_sent: boolean;
  whatsapp_sent: boolean;
  email_reason: string;
} | null | undefined;

const MOTIVOS: Record<string, string> = {
  no_connection: "no hay una conexión de correo activa",
  sin_destinatarios: "la cita no tiene email del cliente",
  invalid_recipient: "el email del cliente no es válido",
  sin_configuracion: "la habilidad de Agenda no está configurada",
};

export function describirAviso(hecho: string, aviso: AvisoCliente): string {
  if (!aviso) return hecho;
  if (aviso.email_sent && aviso.whatsapp_sent) return `${hecho} Avisamos al cliente por correo y WhatsApp.`;
  if (aviso.email_sent) {
    return `${hecho} Avisamos al cliente por correo; el WhatsApp no salió (la conversación está pausada, cerrada o no existe).`;
  }
  if (aviso.whatsapp_sent) {
    return `${hecho} Avisamos por WhatsApp; el correo no salió porque ${MOTIVOS[aviso.email_reason] ?? "falló el envío"}.`;
  }
  return `${hecho} No pudimos avisar al cliente: ${MOTIVOS[aviso.email_reason] ?? "falló el envío"} y el WhatsApp tampoco.`;
}
