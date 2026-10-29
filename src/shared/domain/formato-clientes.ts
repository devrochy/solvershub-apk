/**
 * Textos de cliente compartidos por Clientes (CRM) y Cobranza: montos, fechas,
 * teléfono, ubicación y etiquetas. Los valores crudos del backend se muestran
 * con la misma semántica que el panel.
 */

import { apiRoot } from "@core/config";

const NUMERO = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });

/** Monto en pesos sin decimales: `$ 1.234`. */
export function formatearCop(valor: number | string | null | undefined): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  const numero = Number(valor);
  return Number.isFinite(numero) ? `$ ${NUMERO.format(numero)}` : "—";
}

export function formatearNumero(valor: number | string | null | undefined): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  const numero = Number(valor);
  return Number.isFinite(numero) ? NUMERO.format(numero) : "—";
}

export function formatearFecha(valor: string | Date | null | undefined): string {
  if (!valor) return "—";
  const fecha = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "—";
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "short" }).format(fecha);
}

export function formatearFechaHora(valor: string | Date | null | undefined): string {
  if (!valor) return "—";
  const fecha = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "—";
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "short", timeStyle: "short" }).format(fecha);
}

/** URL usable en <Image>: respeta http(s) o completa el host del backend. */
export function urlAvatarCliente(valor: string | null | undefined): string | null {
  if (!valor) return null;
  if (/^https?:\/\//i.test(valor)) return valor;
  return `${apiRoot()}${valor.startsWith("/") ? valor : `/${valor}`}`;
}

type Telefono = {
  phone?: string | null;
  phone_e164?: string | null;
  phone_indicativo?: string | null;
  phone_local?: string | null;
};

export function telefonoVisible(perfil: Telefono | null | undefined): string {
  if (!perfil) return "—";
  if (perfil.phone_indicativo && perfil.phone_local) {
    return `${perfil.phone_indicativo} ${perfil.phone_local}`;
  }
  return perfil.phone_e164 || perfil.phone || "—";
}

type Ubicacion = {
  address?: string | null;
  municipio?: string | null;
  departamento?: string | null;
  pais?: string | null;
};

export function ubicacionVisible(perfil: Ubicacion | null | undefined): string {
  if (!perfil) return "—";
  const municipio = [perfil.municipio, perfil.departamento].filter(Boolean).join(", ");
  return municipio || perfil.address || perfil.pais || "—";
}

export const CANAL_LABEL: Record<string, string> = {
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

export function etiquetaCanal(canal: string | null | undefined): string {
  return (canal && CANAL_LABEL[canal]) || canal || "Canal";
}

export const CLASIFICACION_LABEL: Record<string, string> = {
  nuevo: "Nuevo",
  prospecto: "Prospecto",
  cliente: "Cliente",
  vip: "VIP",
  inactivo: "Inactivo",
  bloqueado: "Bloqueado",
};

export function etiquetaClasificacion(
  valor: string | null | undefined,
  label?: string | null,
): string {
  return label || (valor ? CLASIFICACION_LABEL[valor] ?? valor : "Sin clasificar");
}

export const RIESGO_LABEL: Record<string, string> = {
  blanco: "Sin riesgo",
  azul: "En seguimiento",
  rojo: "Riesgo alto",
};

export function etiquetaRiesgo(valor: string | null | undefined): string {
  return (valor && RIESGO_LABEL[valor]) || valor || "Sin riesgo";
}

export function tonoDeRiesgo(valor: string | null | undefined): "neutral" | "info" | "danger" {
  if (valor === "rojo") return "danger";
  if (valor === "azul") return "info";
  return "neutral";
}

export const ESTADO_CUOTA: Record<string, string> = {
  pendiente: "Pendiente",
  pagada: "Pagada",
  atrasada: "Atrasada",
  parcial: "Parcial",
};

export function etiquetaEstadoCuota(valor: string | null | undefined): string {
  return (valor && ESTADO_CUOTA[valor]) || valor || "—";
}

export const TIPO_DOCUMENTO_LABEL: Record<string, string> = {
  cc: "Cédula de ciudadanía",
  ce: "Cédula de extranjería",
  nit: "NIT",
  pasaporte: "Pasaporte",
  otro: "Otro",
  ci: "Cédula de identidad",
};

export function etiquetaTipoDocumento(valor: string | null | undefined): string {
  return (valor && TIPO_DOCUMENTO_LABEL[valor]) || valor || "—";
}

/** Enlace de WhatsApp con un saludo por defecto; null si el teléfono no tiene dígitos suficientes. */
export function enlaceWhatsApp(
  telefono: string | null | undefined,
  nombre?: string | null,
): string | null {
  const digitos = String(telefono ?? "").replace(/\D+/g, "");
  if (digitos.length < 7) return null;
  const saludo = nombre?.trim() ? `Hola ${nombre.trim()}` : "Hola";
  return `https://wa.me/${digitos}?text=${encodeURIComponent(saludo)}`;
}

/** Enlace `tel:` para llamar; null si no hay un número usable. */
export function enlaceTelefono(telefono: string | null | undefined): string | null {
  const limpio = String(telefono ?? "").replace(/[^\d+]/g, "");
  return limpio.replace(/\D/g, "").length >= 7 ? `tel:${limpio}` : null;
}
