import { AdminApiError } from "@core/api/admin";
import type { IconName, TonoEstado } from "@shared/ui";
import { formatearNumero } from "@shared/domain/formato-clientes";
import { EnvioError, type EstadoReporte, type FeedbackResumen, type TipoReporte } from "./api";

export const TITULO_MIN = 3;
export const TITULO_MAX = 120;
export const DESCRIPCION_MIN = 10;
export const DESCRIPCION_MAX = 2000;

/** Respaldo si el catálogo no trae límites; el backend valida igual. */
export const MAX_IMAGENES = 5;
export const MAX_BYTES_IMAGEN = 8 * 1024 * 1024;

export const TIPOS: { clave: TipoReporte; etiqueta: string; icono: IconName }[] = [
  { clave: "error", etiqueta: "Error", icono: "bug-report" },
  { clave: "mejora", etiqueta: "Mejora", icono: "trending-up" },
  { clave: "idea", etiqueta: "Idea", icono: "lightbulb-outline" },
];

export function etiquetaDeTipo(tipo: TipoReporte): string {
  return TIPOS.find((t) => t.clave === tipo)?.etiqueta ?? tipo;
}

export const ESTADOS: Record<EstadoReporte, { etiqueta: string; tono: TonoEstado; icono: IconName }> = {
  recibido: { etiqueta: "Recibido", tono: "info", icono: "inbox" },
  en_revision: { etiqueta: "En revisión", tono: "warning", icono: "hourglass-empty" },
  aprobado: { etiqueta: "Aprobado", tono: "success", icono: "check-circle" },
  rechazado: { etiqueta: "Rechazado", tono: "danger", icono: "cancel" },
};

/** «Aprobado · 3.000 créditos de regalo», como en el panel (HU-FB-05). */
export function estadoEnPalabras(reporte: Pick<FeedbackResumen, "estado" | "creditos_otorgados">): string {
  const base = ESTADOS[reporte.estado].etiqueta;
  const creditos = reporte.creditos_otorgados ?? 0;
  if (reporte.estado !== "aprobado" || creditos <= 0) return base;
  return `${base} · ${formatearNumero(creditos)} ${creditos === 1 ? "crédito" : "créditos"} de regalo`;
}

export const MOTIVOS: Record<string, string> = {
  duplicado: "Ya lo había reportado alguien más",
  no_reproducible: "No pudimos reproducirlo",
  fuera_de_alcance: "Fuera del alcance del producto",
  informacion_insuficiente: "Faltó información para revisarlo",
  otro: "Otro motivo",
};

/** Errores de validación del título y la descripción, antes de enviar. */
export function validarTextos(titulo: string, descripcion: string): { titulo?: string; descripcion?: string } {
  const errores: { titulo?: string; descripcion?: string } = {};
  const t = titulo.trim().length;
  const d = descripcion.trim().length;
  if (t < TITULO_MIN || t > TITULO_MAX) {
    errores.titulo = `El título debe tener entre ${TITULO_MIN} y ${TITULO_MAX} caracteres.`;
  }
  if (d < DESCRIPCION_MIN || d > DESCRIPCION_MAX) {
    errores.descripcion = `La descripción debe tener entre ${DESCRIPCION_MIN} y ${formatearNumero(DESCRIPCION_MAX)} caracteres.`;
  }
  return errores;
}

const MENSAJES: Record<string, string> = {
  adjunto_invalido: "Una de las imágenes no se pudo leer. Quítala y vuelve a elegirla.",
  demasiados_adjuntos: `Puedes adjuntar hasta ${MAX_IMAGENES} imágenes.`,
  adjunto_repetido: "Adjuntaste la misma imagen dos veces. Quita la repetida.",
  tipo_invalido: "Elige si es un error, una mejora o una idea.",
  area_invalida: "Elige el área del problema.",
  titulo_invalido: `El título debe tener entre ${TITULO_MIN} y ${TITULO_MAX} caracteres.`,
  descripcion_invalida: `La descripción debe tener entre ${DESCRIPCION_MIN} y ${formatearNumero(DESCRIPCION_MAX)} caracteres.`,
  adjunto_muy_grande: "Una imagen pesa más de 8 MB. Quítala o elige otra.",
  adjuntos_muy_grandes: "Las imágenes juntas pesan más de 25 MB. Quita alguna.",
  demasiados_reportes: "Enviaste muchos reportes seguidos.",
  demasiados_reportes_del_negocio: "Tu negocio envió muchos reportes hoy.",
  almacenamiento_no_disponible: "No pudimos guardar las imágenes en este momento.",
};

function enMinutos(segundos: number): string {
  const minutos = Math.max(1, Math.ceil(segundos / 60));
  if (minutos < 60) return `${minutos} ${minutos === 1 ? "minuto" : "minutos"}`;
  const horas = Math.ceil(minutos / 60);
  return `${horas} ${horas === 1 ? "hora" : "horas"}`;
}

/**
 * Texto para el usuario de un envío fallido. `red` = no hubo respuesta: el borrador y la clave
 * quedan guardados y el reintento no duplica.
 */
export function mensajeDeEnvio(error: unknown): { texto: string; red: boolean } {
  if (!(error instanceof AdminApiError)) {
    return {
      texto: "No hay conexión. Tu reporte quedó guardado: vuelve a enviarlo cuando tengas señal.",
      red: true,
    };
  }
  const base = MENSAJES[error.code] ?? error.message;
  if ((error.status === 429 || error.status === 503) && error instanceof EnvioError && error.reintentarEnSeg) {
    return { texto: `${base} Vuelve a intentarlo en ${enMinutos(error.reintentarEnSeg)}.`, red: false };
  }
  if (error.status === 429 || error.status === 503) {
    return { texto: `${base} Vuelve a intentarlo más tarde.`, red: false };
  }
  return { texto: base, red: false };
}
