import { formatearCop, formatearNumero } from "@shared/domain/formato-clientes";
import type { PlanResponse } from "./api";

/**
 * «Plan y consumo» de los planes v3 (D-79, SPEC-51, HU-BILL-27 parte 1). Lógica pura: la pantalla
 * solo pinta lo que devuelve. El crédito del mes es el único tope de consumo; lo demás son topes
 * estructurales que solo bloquean un alta.
 */

type Credito = NonNullable<PlanResponse["credit"]>;
type Uso = PlanResponse["usage"][number];
type Plan = PlanResponse["plans"][number];

/** Lo que vale un crédito, en pesos (ADR-0144). */
export const PESOS_POR_CREDITO = 10;

/**
 * Topes que se muestran, en este orden. Las métricas que no están aquí no se pintan: así no
 * reaparecen las barras de v1 (conversaciones, audios, imágenes, mensajes, USD) si un backend
 * viejo las manda, ni se duplica el crédito (`creditos`), que tiene su propia tarjeta.
 */
const TOPES: Record<string, { titulo: string; singular: string; plural: string }> = {
  agentes: { titulo: "Agentes publicados", singular: "agente", plural: "agentes" },
  colaboradores: { titulo: "Personas del equipo", singular: "persona del equipo", plural: "personas del equipo" },
  clientes: { titulo: "Clientes", singular: "cliente", plural: "clientes" },
  conexiones: { titulo: "Conexiones", singular: "conexión", plural: "conexiones" },
  correos: { titulo: "Correos conectados", singular: "correo", plural: "correos" },
};
const ORDEN_DE_TOPES = Object.keys(TOPES);

export type CreditoEnPalabras = {
  titulo: string;
  detalle: string;
  /** `null` = sin medición: no se pinta barra. */
  porcentaje: number | null;
};

/** El crédito del mes: lo que queda, su equivalente en pesos y lo usado. Sin medición, lo dice. */
export function creditoDelMes(credit: Credito | null | undefined): CreditoEnPalabras | null {
  if (!credit) return null;
  if (credit.used == null) {
    return {
      titulo: `${formatearNumero(credit.limit)} créditos al mes`,
      detalle: `La medición del consumo llega pronto. 1 crédito = ${formatearCop(PESOS_POR_CREDITO)}.`,
      porcentaje: null,
    };
  }
  const usado = Math.round(credit.used);
  const quedan = Math.max(0, credit.limit - usado);
  const porcentaje = Math.min(100, Math.max(0, credit.percent ?? (credit.limit > 0 ? (usado / credit.limit) * 100 : 100)));
  const uso = `Usaste ${formatearNumero(usado)} de ${formatearNumero(credit.limit)}`;
  if (quedan === 0) {
    return { titulo: "Usaste todo el crédito del mes", detalle: uso, porcentaje };
  }
  return {
    titulo: `Te quedan ${formatearNumero(quedan)} créditos`,
    detalle: `Unos ${formatearCop(quedan * PESOS_POR_CREDITO)} · ${uso}`,
    porcentaje,
  };
}

export type TopeEnPalabras = {
  clave: string;
  titulo: string;
  /** «1 de 2», o «12, sin límite». */
  uso: string;
  porcentaje: number | null;
};

/** Los topes del plan (agentes, equipo, clientes, conexiones y correos), en un orden fijo. */
export function topesDelPlan(usage: readonly Uso[] | null | undefined): TopeEnPalabras[] {
  return (usage ?? [])
    .filter((u) => u.key in TOPES)
    .sort((a, b) => ORDEN_DE_TOPES.indexOf(a.key) - ORDEN_DE_TOPES.indexOf(b.key))
    .map((u) => {
      const titulo = TOPES[u.key].titulo;
      if (u.limit == null) {
        return { clave: u.key, titulo, uso: `${formatearNumero(u.used)}, sin límite`, porcentaje: null };
      }
      const porcentaje = u.percent ?? (u.limit > 0 ? (u.used / u.limit) * 100 : 100);
      return {
        clave: u.key,
        titulo,
        uso: `${formatearNumero(u.used)} de ${formatearNumero(u.limit)}`,
        porcentaje: Math.min(100, Math.max(0, porcentaje)),
      };
    });
}

/** «$ 129.000 al mes» o «Gratis». */
export function precioDelPlan(plan: Plan): string {
  return plan.is_free ? "Gratis" : `${formatearCop(plan.price_cop)} al mes`;
}

function cantidad(clave: string, valor: number | null | undefined): string | null {
  const n = TOPES[clave];
  if (!n || valor === undefined) return null;
  if (valor === null) return `${n.plural.charAt(0).toUpperCase()}${n.plural.slice(1)} sin límite`;
  if (valor === 0) return clave === "correos" ? "Sin correos" : null;
  return `${formatearNumero(valor)} ${valor === 1 ? n.singular : n.plural}`;
}

const CANAL: Record<string, string> = {
  whatsapp: "WhatsApp",
  web: "Chat web",
  telegram: "Telegram",
  instagram: "Instagram",
  messenger: "Messenger",
};

const SOPORTE: Record<string, string> = {
  comunidad: "Soporte de la comunidad",
  email: "Soporte por correo",
  prioritario: "Soporte prioritario",
  dedicado: "Soporte dedicado",
};

/** Lo que trae cada plan, en frases cortas: crédito, topes y beneficios del catálogo v3. */
export function beneficiosDelPlan(plan: Plan): string[] {
  const f = plan.features ?? {};
  const lista: string[] = [];
  const creditos = plan.monthly_credits ?? (typeof f.credito_mensual === "number" ? f.credito_mensual : null);
  if (creditos != null) lista.push(`${formatearNumero(creditos)} créditos al mes`);
  for (const clave of ORDEN_DE_TOPES) {
    const texto = cantidad(clave, plan.limits?.[clave]);
    if (texto) lista.push(texto);
  }
  if (Array.isArray(f.canales) && f.canales.length > 0) {
    lista.push(f.canales.map((c) => CANAL[String(c)] ?? String(c)).join(", "));
  }
  if (f.nivel_ia === "avanzado") lista.push("IA avanzada");
  if (typeof f.acumulable_meses === "number" && f.acumulable_meses > 0) {
    lista.push(`El crédito que sobra se acumula ${f.acumulable_meses === 1 ? "1 mes" : `${f.acumulable_meses} meses`}`);
  }
  if (typeof f.descuento_recarga === "number" && f.descuento_recarga > 0) {
    lista.push(`${f.descuento_recarga} % de descuento en recargas`);
  }
  if (f.marca_propia === true) lista.push("Tu propia marca");
  if (f.byok === true) lista.push("Tu propia llave de IA");
  if (typeof f.historial_dias === "number") lista.push(`Historial de ${formatearNumero(f.historial_dias)} días`);
  else if (f.historial_dias === null) lista.push("Historial sin límite");
  if (typeof f.soporte === "string" && SOPORTE[f.soporte]) lista.push(SOPORTE[f.soporte]);
  return lista;
}
