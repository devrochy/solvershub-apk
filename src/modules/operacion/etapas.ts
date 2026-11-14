import type { IconName } from "@shared/ui";
import type { FiltroLeads, LeadFaceta, LeadFilter, LeadRow } from "./api";

type Tono = "neutral" | "accent" | "success" | "warning" | "danger";

/** Pack dueño de la etapa y clave del campo editable (ADR-0149, HU-CRM-18). */
export const PACK_DE_ETAPA = "pack_commerce";
export const CLAVE_DE_ETAPA = "estado_lead";

export interface OpcionDeEtapa {
  value: string;
  label: string;
  tone: Tono;
  icon: IconName;
}

/** Las cinco etapas del lead de venta, en el orden del embudo. El color nunca va solo: lleva icono y texto. */
const ETAPAS: OpcionDeEtapa[] = [
  { value: "nuevo", label: "Nuevo", tone: "accent", icon: "fiber-new" },
  { value: "calificado", label: "Calificado", tone: "accent", icon: "verified" },
  { value: "contactado", label: "Contactado", tone: "warning", icon: "chat" },
  { value: "convertido", label: "Convertido", tone: "success", icon: "check-circle" },
  { value: "perdido", label: "Perdido", tone: "danger", icon: "cancel" },
];

/**
 * Etapas que ofrece el negocio: los nombres los declara el pack en el filtro `estado_lead`; si el
 * backend no lo trae (versión anterior) se usan las cinco de siempre.
 */
export function opcionesDeEtapa(filtros?: LeadFilter[]): OpcionDeEtapa[] {
  const declaradas = filtros?.find((f) => f.key === CLAVE_DE_ETAPA)?.options ?? [];
  if (declaradas.length === 0) return ETAPAS;
  return declaradas.map((o) => {
    const base = ETAPAS.find((e) => e.value === o.value);
    return { value: o.value, label: o.label, tone: base?.tone ?? "neutral", icon: base?.icon ?? "flag" };
  });
}

/**
 * Etapa de una fila. La lista trae el nombre ("Calificado"), no el código, así que se busca por los
 * dos. `null` = el cliente no tiene lead de venta.
 */
export function etapaDeFila(item: Pick<LeadRow, "extras">, opciones: OpcionDeEtapa[]): OpcionDeEtapa | null {
  const crudo = item.extras?.[CLAVE_DE_ETAPA];
  if (typeof crudo !== "string" || crudo.trim() === "") return null;
  const buscado = crudo.trim().toLowerCase();
  return (
    opciones.find((o) => o.value === buscado || o.label.toLowerCase() === buscado) ?? {
      value: buscado,
      label: crudo.trim(),
      tone: "neutral",
      icon: "flag",
    }
  );
}

// ── Motivo de pérdida y valor estimado (HU-CRM-23) ─────────────────────────────────────────────

/** Etapa que pide motivo (ADR-0181): el catálogo de etapas es fijo. */
export const ETAPA_PERDIDA = "perdido";
/** Claves de los campos del pack que solo existen mientras el lead está perdido. */
export const CAMPOS_DE_PERDIDA = ["motivo_perdida", "nota_perdida"];
export const CLAVE_DE_MOTIVO = "motivo_perdida";
export const CLAVE_DE_NOTA_PERDIDA = "nota_perdida";
export const CLAVE_DE_VALOR = "valor_estimado";
/** Largo máximo de la nota de la pérdida (`max_length` del campo `nota_perdida`). */
export const NOTA_PERDIDA_MAX = 300;

/**
 * Motivos que una persona puede elegir al perder un lead: las opciones del filtro `motivo_perdida` del
 * pack, sin «Sin motivo registrado» (solo describe a los perdidos de antes y no se puede escribir). Vacío
 * si el backend no lo declara (versión anterior): entonces no se pide motivo y el servidor responde.
 */
export function motivosDePerdida(filtros?: LeadFilter[]): { value: string; label: string }[] {
  const opciones = filtros?.find((f) => f.key === CLAVE_DE_MOTIVO)?.options ?? [];
  return opciones.filter((o) => o.value !== "sin_motivo").map((o) => ({ value: o.value, label: o.label }));
}

export const MENSAJE_VALOR_INVALIDO =
  "Escribe el valor como número de cero en adelante, sin puntos de miles ni símbolos (por ejemplo 250000 o 250000.50).";

/** Vacío (quita el valor) o un monto simple con hasta dos decimales; el servidor vuelve a validar. */
export function valorEstimadoValido(texto: string): boolean {
  const t = texto.trim();
  return t === "" || /^\d+(?:[.,]\d{1,2})?$/.test(t);
}

/** «$ 250.000» en pesos, o `null` si el lead no tiene valor. */
export function textoDeValor(valor: unknown): string | null {
  if (typeof valor !== "number" || !Number.isFinite(valor)) return null;
  return `$ ${Math.round(valor).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

// ── Embudo por etapas (HU-CRM-24) ──────────────────────────────────────────────────────────────

/**
 * Lo que se le pide al servidor en la vista «Embudo» para la etapa elegida: los filtros del usuario sin
 * ninguna otra etapa, la etapa de la pestaña, y los contadores y las sumas de todas las etapas (que no
 * dependen de la pestaña: el servidor no aplica a un contador su propio filtro).
 */
export function filtrosDeEmbudo(filtro: FiltroLeads, etapa: string): FiltroLeads {
  return {
    ...filtro,
    filtros: [...sinEtapa(filtro.filtros), `${CLAVE_DE_ETAPA}:${etapa}`],
    facetas: [CLAVE_DE_ETAPA],
    resumen: "valor",
  };
}

/** Los filtros del pack sin el de etapa (en el embudo la etapa la elige la pestaña). */
export function sinEtapa(filtros?: string[]): string[] {
  return (filtros ?? []).filter((f) => !f.startsWith(`${CLAVE_DE_ETAPA}:`));
}

export interface ResumenDeEtapa {
  value: string;
  label: string;
  /** Leads de la etapa con los filtros activos, o `null` si el servidor no trae contadores. */
  cantidad: number | null;
  /** Suma del valor estimado de la etapa, o `null` si el servidor no la calcula. */
  suma: number | null;
}

/** Una pestaña por etapa con su cantidad y su suma, tal como las trae la faceta `estado_lead`. */
export function resumenesDeEtapa(opciones: OpcionDeEtapa[], facetas?: LeadFaceta[]): ResumenDeEtapa[] {
  const faceta = facetas?.find((f) => f.key === CLAVE_DE_ETAPA);
  return opciones.map((o) => ({
    value: o.value,
    label: o.label,
    cantidad: faceta ? (faceta.counts[o.value] ?? 0) : null,
    suma: faceta?.sumas ? (faceta.sumas[o.value] ?? 0) : null,
  }));
}
