export type ConexionConIdentidad = {
  type_id?: string | null;
  external_id: string;
  display_name?: string | null;
  display_phone_number?: string | null;
};

/**
 * Detalle legible de una conexión para la lista de Configuración: nombre y
 * número cuando el canal los conoce (WhatsApp Web vinculado); si no, el
 * identificador técnico. En WhatsApp Web sin vincular no se muestra
 * `waweb:<uuid>`, que no le dice nada al dueño.
 */
export function detalleDeConexion(c: ConexionConIdentidad): string | null {
  const telefono = c.display_phone_number?.trim();
  // WhatsApp Web guarda solo dígitos; Meta ya lo trae formateado.
  const telefonoVisible = telefono && /^\d+$/.test(telefono) ? `+${telefono}` : telefono;
  const partes = [c.display_name, telefonoVisible]
    .map((valor) => valor?.trim())
    .filter((valor): valor is string => Boolean(valor));
  if (partes.length) return partes.join(" · ");
  if (c.type_id === "whatsapp_waweb") return null;
  return c.external_id.trim() || null;
}
