import type { IconName, Tono } from "@shared/ui";

/** Etiquetas y tonos compartidos por la bandeja y el chat (mismos nombres que el panel). */

export interface EstadoVisual {
  label: string;
  tone: Tono;
  icon: IconName;
}

export const CONVERSACION_ESTADO: Record<string, EstadoVisual> = {
  open: { label: "Abierta", tone: "info", icon: "forum" },
  escalated: { label: "Escalada", tone: "warning", icon: "priority-high" },
  closed: { label: "Cerrada", tone: "neutral", icon: "check-circle-outline" },
};

export function estadoDeConversacion(status: string | null | undefined): EstadoVisual {
  return (
    (status ? CONVERSACION_ESTADO[status] : undefined) ?? {
      label: status || "Sin estado",
      tone: "neutral",
      icon: "label",
    }
  );
}

export const ESTADO_AGENTE: Record<"activo" | "pausado", EstadoVisual> = {
  activo: { label: "Agente activo", tone: "success", icon: "smart-toy" },
  pausado: { label: "Agente pausado", tone: "warning", icon: "pause-circle-outline" },
};

export const ESCALACION_ESTADO: Record<string, EstadoVisual> = {
  pendiente: { label: "Pendiente", tone: "warning", icon: "schedule" },
  asignada: { label: "Asignada", tone: "info", icon: "person" },
  resuelta: { label: "Resuelta", tone: "success", icon: "check-circle-outline" },
};

export function estadoDeEscalacion(status: string | null | undefined): EstadoVisual {
  return (
    (status ? ESCALACION_ESTADO[status] : undefined) ?? {
      label: status || "Sin estado",
      tone: "neutral",
      icon: "label",
    }
  );
}

export const MOTIVO: Record<string, string> = {
  solicitud_cliente: "Solicitud del cliente",
  queja: "Queja",
  fuera_de_alcance: "Fuera de alcance",
  intentos_fallidos: "Intentos fallidos",
  monto_alto: "Monto alto",
  palabra_clave: "Pidió hablar con una persona",
  accion_habilidad: "Acción de una habilidad",
  regla_negocio: "Regla del negocio",
  verificacion: "Respuesta no verificada",
  frase_prohibida: "Frase prohibida por la personalidad",
  falla_ia: "Falla del asistente de IA",
  rechazo_ia: "El asistente no pudo responder",
  envio_fallido: "No se pudo enviar el mensaje",
  sin_resolver: "Varios turnos sin resolver",
  limite_iteraciones: "El asistente no llegó a una respuesta",
  otro: "Otro",
};

const MOTIVO_DE_RIESGO = new Set(["queja", "monto_alto"]);
const MOTIVO_TECNICO = new Set([
  "falla_ia",
  "rechazo_ia",
  "envio_fallido",
  "limite_iteraciones",
]);
const MOTIVO_INFORMATIVO = new Set(["solicitud_cliente", "palabra_clave"]);

/** Tono del motivo: riesgo en advertencia, fallas técnicas en peligro, resto neutral/acento. */
export function tonoDelMotivo(codigo: string): Tono {
  if (MOTIVO_DE_RIESGO.has(codigo)) return "warning";
  if (MOTIVO_TECNICO.has(codigo)) return "danger";
  if (MOTIVO_INFORMATIVO.has(codigo)) return "info";
  if (codigo === "accion_habilidad") return "accent";
  return "neutral";
}

export function etiquetaDelMotivo(
  esc: { reason_code?: string | null; reason_label?: string | null; reason?: string | null },
): string {
  return esc.reason_label || (esc.reason_code ? MOTIVO[esc.reason_code] : undefined) || esc.reason || "Otro";
}

export const CANAL: Record<string, string> = {
  whatsapp: "WhatsApp",
  whatsapp_cloud: "WhatsApp Cloud",
  whatsapp_waweb: "WhatsApp Web (QR)",
  instagram: "Instagram",
  messenger: "Messenger",
  facebook: "Facebook",
  email: "Correo",
  sms: "SMS",
  webchat: "Chat web",
  web: "Web",
};

export function canalLabel(id: string | null | undefined): string {
  return (id && CANAL[id]) || id || "Canal";
}

const ICONO_CANAL: Record<string, IconName> = {
  whatsapp: "chat",
  whatsapp_cloud: "chat",
  whatsapp_waweb: "qr-code",
  instagram: "photo-camera",
  messenger: "chat-bubble",
  facebook: "public",
  email: "email",
  sms: "sms",
  webchat: "language",
  web: "language",
};

export function iconoDelCanal(id: string | null | undefined): IconName {
  return (id && ICONO_CANAL[id]) || "chat-bubble-outline";
}

type ChatConConexion = {
  channel: string;
  connection_type?: string | null;
  connection_label?: string | null;
};

export function tipoDelChat(chat: ChatConConexion): string {
  return chat.connection_type && CANAL[chat.connection_type] ? chat.connection_type : chat.channel;
}

export function conexionDelChat(chat: ChatConConexion): string {
  const canal = canalLabel(tipoDelChat(chat));
  return chat.connection_label ? `${canal} · ${chat.connection_label}` : canal;
}

export function nombreDelChat(chat: { customer_name: string | null; external_id: string | null }): string {
  return chat.customer_name || chat.external_id || "Cliente";
}

export const PREFIJO_REMITENTE: Record<string, string> = {
  agent: "Agente: ",
  human: "Equipo: ",
};

export function actividadDe(chat: { last_message_at?: string | null; started_at: string }): string {
  return chat.last_message_at ?? chat.started_at;
}

/** Orden de la bandeja como en las apps de chat: lo último que llegó, primero. */
export function ordenarPorLlegada<T extends { id: string; last_message_at?: string | null; started_at: string }>(
  chats: T[],
): T[] {
  const momento = (chat: T) => {
    const ms = Date.parse(actividadDe(chat));
    return Number.isFinite(ms) ? ms : 0;
  };
  return [...chats].sort((a, b) => momento(b) - momento(a) || b.id.localeCompare(a.id));
}

/** Número de la píldora de pendientes: tope `99+` como en las apps de chat. */
export function contadorPendientes(n: number): string {
  return n > 99 ? "99+" : String(Math.max(0, n));
}

/** Texto accesible de los mensajes que esperan respuesta. */
export function textoPendientes(n: number): string {
  if (n > 99) return "Más de 99 mensajes sin responder";
  if (n === 1) return "1 mensaje sin responder";
  return `${n} mensajes sin responder`;
}

const NUMERO = new Intl.NumberFormat("es-CO");
const USD = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 4,
});
const HORA = new Intl.DateTimeFormat("es-CO", { hour: "2-digit", minute: "2-digit" });
const FECHA = new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "2-digit", year: "2-digit" });
const FECHA_HORA = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});
const DIA_LARGO = new Intl.DateTimeFormat("es-CO", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

function fechaValida(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const fecha = value instanceof Date ? value : new Date(value);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

export function formatearHoraChat(
  value: string | Date | null | undefined,
  ahora: Date = new Date(),
): string {
  const fecha = fechaValida(value);
  if (!fecha) return "";
  const deHoy = fecha.toDateString() === ahora.toDateString();
  return deHoy ? HORA.format(fecha) : FECHA.format(fecha);
}

export function formatearFechaHora(value: string | Date | null | undefined): string {
  const fecha = fechaValida(value);
  return fecha ? FECHA_HORA.format(fecha) : "—";
}

export function formatearDia(value: string | Date | null | undefined, ahora: Date = new Date()): string {
  const fecha = fechaValida(value);
  if (!fecha) return "";
  if (fecha.toDateString() === ahora.toDateString()) return "Hoy";
  const ayer = new Date(ahora);
  ayer.setDate(ayer.getDate() - 1);
  if (fecha.toDateString() === ayer.toDateString()) return "Ayer";
  return DIA_LARGO.format(fecha);
}

export function formatearNumero(value: number): string {
  return NUMERO.format(value);
}

export function formatearUsd(value: number): string {
  return USD.format(value);
}

export function formatearCostoYTokens(costUsd: number, tokens: number): string {
  return `${formatearUsd(costUsd)} · ${formatearNumero(tokens)} tokens`;
}
