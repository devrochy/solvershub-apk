import type { IconName } from "@shared/ui";
import type { LeadFilter, LeadRow } from "./api";

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
