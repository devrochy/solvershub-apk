/**
 * Seguimiento del lead (HU-CRM-21): la próxima acción de un lead y cuándo. El servidor guarda la fecha
 * en UTC, decide en qué opción cae (`seguimiento_estado`, con la zona del negocio) y devuelve la fecha
 * de la ficha en hora del negocio, sin zona (`YYYY-MM-DDTHH:MM`). Aquí solo se muestra y se arma el cuerpo.
 */
import type { IconName } from "@shared/ui";
import { CLAVE_DE_ETAPA } from "./etapas";

export const ZONA_POR_DEFECTO = "America/Bogota";
export const CLAVE_DE_SEGUIMIENTO = "seguimiento";
/** Campos del pack que la ficha edita con su propia tarjeta, no con el formulario genérico. */
export const CLAVES_DE_SEGUIMIENTO = ["seguimiento_en", "seguimiento_nota"];
export const NOTA_MAX = 200;

export type EstadoDeSeguimiento = "vencidos" | "hoy" | "proximos_7_dias" | "mas_adelante";

export interface Seguimiento {
  /** Instante programado (ISO 8601, UTC). */
  en: string;
  nota: string | null;
  estado: EstadoDeSeguimiento | null;
}

type Tono = "neutral" | "accent" | "success" | "warning" | "danger";

/** Texto y tono de cada opción. El texto siempre acompaña al color. */
export const ESTADO_DE_SEGUIMIENTO: Record<EstadoDeSeguimiento, { texto: string; tono: Tono; icono: IconName }> = {
  vencidos: { texto: "Vencido", tono: "danger", icono: "event-busy" },
  hoy: { texto: "Hoy", tono: "accent", icono: "today" },
  proximos_7_dias: { texto: "Próximo", tono: "warning", icono: "schedule" },
  mas_adelante: { texto: "Programado", tono: "neutral", icono: "event" },
};

const ESTADOS = Object.keys(ESTADO_DE_SEGUIMIENTO);

/** El seguimiento que trae una fila de la lista (`extras`), o null si el lead no tiene. */
export function seguimientoDeFila(item: { extras?: Record<string, unknown> | null }): Seguimiento | null {
  const extras = item.extras;
  const en = extras?.seguimiento_en;
  if (typeof en !== "string" || !en) return null;
  const nota = extras?.seguimiento_nota;
  const estado = extras?.seguimiento_estado;
  return {
    en,
    nota: typeof nota === "string" && nota.trim() ? nota : null,
    estado: typeof estado === "string" && ESTADOS.includes(estado) ? (estado as EstadoDeSeguimiento) : null,
  };
}

/** «mar 3 nov, 9:00 a. m.» de un instante, en la zona del negocio (no en la del teléfono). */
export function textoDeSeguimiento(en: string, zona: string = ZONA_POR_DEFECTO): string {
  const fecha = new Date(en);
  if (Number.isNaN(fecha.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat("es-CO", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      timeZone: zona,
    }).format(fecha);
  } catch {
    return textoDeSeguimiento(en, ZONA_POR_DEFECTO);
  }
}

/** ¿El cliente ya tiene lead de venta? (la etapa solo existe si hay lead). */
export function tieneLeadDeVenta(ficha: { extras?: Record<string, unknown> | null }): boolean {
  const etapa = ficha.extras?.[CLAVE_DE_ETAPA];
  return typeof etapa === "string" && etapa.trim() !== "";
}

/** ¿La hora de pared tiene el formato que devuelve la ficha y acepta la API? */
export function esHoraDelNegocio(valor: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(valor);
}

const dos = (n: number) => String(n).padStart(2, "0");

/**
 * La hora de pared del negocio (`2026-11-03T09:00`) como un `Date` cuyos componentes locales son esos
 * números: es lo que maneja el selector (que muestra componentes locales). No convierte zonas.
 */
export function fechaDePared(local: string): Date | null {
  if (!esHoraDelNegocio(local)) return null;
  const [dia, hora] = local.split("T");
  const [anio, mes, d] = dia.split("-").map(Number);
  const [h, m] = hora.split(":").map(Number);
  const fecha = new Date(anio, mes - 1, d, h, m, 0, 0);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

/** Inverso de `fechaDePared`: los componentes locales del `Date` como hora de pared sin zona. */
export function paredDeFecha(fecha: Date): string {
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}T${dos(fecha.getHours())}:${dos(fecha.getMinutes())}`;
}

/** Texto de una hora de pared del negocio, sin convertir nada: se muestra como la escribió el negocio. */
export function textoDeHoraDelNegocio(local: string): string {
  const pared = fechaDePared(local);
  if (!pared) return "—";
  return new Intl.DateTimeFormat("es-CO", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(pared);
}

/** Mañana a las 9:00: la sugerencia al programar un seguimiento nuevo. */
export function sugerenciaDeSeguimiento(ahora: Date = new Date()): Date {
  const fecha = new Date(ahora);
  fecha.setDate(fecha.getDate() + 1);
  fecha.setHours(9, 0, 0, 0);
  return fecha;
}

/** Cuerpo del PATCH de la ficha al programar o mover; `quitar` limpia el seguimiento y su nota. */
export function cuerpoDeSeguimiento(nota: string, fecha: Date | null): Record<string, string> {
  return fecha
    ? { seguimiento_nota: nota.trim().slice(0, NOTA_MAX), seguimiento_en: paredDeFecha(fecha) }
    : { seguimiento_en: "" };
}

/** Orden de la lista: si hay un filtro de seguimiento (que no sea «sin seguimiento»), los más atrasados primero. */
export function ordenPorDefectoDeSeguimiento(filtros: string[] | undefined): "seguimiento" | undefined {
  return (filtros ?? []).some(
    (f) => f.startsWith(`${CLAVE_DE_SEGUIMIENTO}:`) && f !== `${CLAVE_DE_SEGUIMIENTO}:sin_seguimiento`,
  )
    ? "seguimiento"
    : undefined;
}
