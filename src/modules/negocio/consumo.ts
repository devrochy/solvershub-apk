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

/**
 * El crédito del mes: lo que queda, su equivalente en pesos y lo usado. Sin medición, lo dice. Con el
 * saldo desglosado (HU-BILL-22) la cuenta va sobre el saldo total del ciclo (mes + acumulado + recargas)
 * y la barra usa `balance_percent`; sin `balance`, sobre el crédito mensual como antes.
 */
export function creditoDelMes(credit: Credito | null | undefined): CreditoEnPalabras | null {
  if (!credit) return null;
  if (credit.used == null) {
    return {
      titulo: `${formatearNumero(credit.limit)} créditos al mes`,
      detalle: `La medición del consumo llega pronto. 1 crédito = ${formatearCop(PESOS_POR_CREDITO)}.`,
      porcentaje: null,
    };
  }
  const saldo = credit.balance;
  const limite = saldo ? Math.round(saldo.total) : credit.limit;
  const usado = Math.round(credit.used);
  const quedan = Math.max(0, limite - usado);
  const medido = saldo ? credit.balance_percent : credit.percent;
  const porcentaje = Math.min(100, Math.max(0, medido ?? (limite > 0 ? (usado / limite) * 100 : 100)));
  const uso = `Usaste ${formatearNumero(usado)} de ${formatearNumero(limite)}`;
  if (quedan === 0) {
    return { titulo: saldo ? "Usaste todo tu saldo de créditos" : "Usaste todo el crédito del mes", detalle: uso, porcentaje };
  }
  return {
    titulo: `Te quedan ${formatearNumero(quedan)} créditos`,
    detalle: `Unos ${formatearCop(quedan * PESOS_POR_CREDITO)} · ${uso}`,
    porcentaje,
  };
}

type Saldo = NonNullable<Credito["balance"]>;
type Recarga = PlanResponse["recargas"][number];

const MESES_CORTOS = ["ene.", "feb.", "mar.", "abr.", "may.", "jun.", "jul.", "ago.", "sept.", "oct.", "nov.", "dic."];

/** «19 de dic.» (con el año si no es el de `ahora`); vacío si la fecha no sirve. */
function diaCorto(valor: string | null | undefined, ahora: Date): string {
  if (!valor) return "";
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return "";
  const base = `${d.getDate()} de ${MESES_CORTOS[d.getMonth()]}`;
  return d.getFullYear() === ahora.getFullYear() ? base : `${base} ${d.getFullYear()}`;
}

const creditos = (n: number) => {
  const redondo = Math.round(n);
  return `${formatearNumero(redondo)} ${redondo === 1 ? "crédito" : "créditos"}`;
};

export type ParteDelSaldo = {
  clave: "mes" | "acumulado" | "recargas";
  nombre: string;
  /** «Usaste 3.000 de 12.000». */
  uso: string;
  /** «Vence el 19 de dic.» (solo el acumulado). */
  nota: string | null;
};

/**
 * El saldo del ciclo desglosado (HU-BILL-22), igual que en el panel: el total con su equivalente en
 * pesos y, por parte, lo usado. El mes siempre va; el acumulado y las recargas solo si hay algo.
 */
export function desgloseDelSaldo(
  saldo: Saldo | null | undefined,
  ahora: Date = new Date(),
): { total: string; partes: ParteDelSaldo[] } | null {
  if (!saldo) return null;
  const uso = (usado: number, total: number) =>
    `Usaste ${formatearNumero(Math.round(usado))} de ${formatearNumero(Math.round(total))}`;
  const partes: ParteDelSaldo[] = [
    { clave: "mes", nombre: "Del mes", uso: uso(saldo.used_month ?? 0, saldo.month), nota: null },
  ];
  const acumulado = saldo.accumulated ?? 0;
  if (acumulado > 0 || (saldo.used_accumulated ?? 0) > 0) {
    const vence = diaCorto(saldo.accumulated_expires_at, ahora);
    partes.push({
      clave: "acumulado",
      nombre: "Acumulado",
      uso: uso(saldo.used_accumulated ?? 0, acumulado),
      nota: vence ? `Vence el ${vence}` : null,
    });
  }
  const recargas = saldo.top_ups ?? 0;
  if (recargas > 0 || (saldo.used_top_ups ?? 0) > 0) {
    partes.push({ clave: "recargas", nombre: "Recargas", uso: uso(saldo.used_top_ups ?? 0, recargas), nota: null });
  }
  return {
    total: `Saldo total: ${creditos(saldo.total)} · ${formatearCop(Math.round(saldo.total) * PESOS_POR_CREDITO)}`,
    partes,
  };
}

/** Un paquete de recarga: créditos, precio final y, si hay descuento, el de lista y «−15 %». */
export function recargaEnPalabras(paquete: Recarga): {
  creditos: string;
  precio: string;
  lista: string | null;
  descuento: string | null;
} {
  const conDescuento = paquete.descuento_pct > 0 && paquete.precio_lista_cop > paquete.precio_cop;
  return {
    creditos: creditos(paquete.creditos),
    precio: formatearCop(paquete.precio_cop),
    lista: conDescuento ? formatearCop(paquete.precio_lista_cop) : null,
    descuento: conDescuento ? `−${paquete.descuento_pct} %` : null,
  };
}

/**
 * Comprar créditos escribe en la sección `plan` (mismo permiso que `POST /admin/plan/subscribe`):
 * el dueño, el master o quien tenga `plan` en escritura.
 */
export function puedeComprarCreditos(
  sesion: { role: string; tenantRole?: string | null; permissions?: Record<string, string | null> | null } | null | undefined,
): boolean {
  if (!sesion) return false;
  return sesion.role === "master" || sesion.tenantRole === "owner" || sesion.permissions?.plan === "write";
}

const ERROR_DE_RECARGA: Record<string, string> = {
  recarga_no_disponible:
    "Las recargas son para negocios con un plan pago activo. Elige o paga un plan para poder recargar.",
  unknown_package: "Ese paquete ya no está disponible. Cierra y vuelve a abrir la lista de paquetes.",
  checkout_failed: "No pudimos abrir el pago. Intenta de nuevo en unos minutos.",
};

/** El error al comprar: «bajo el mínimo» trae precio y mínimo y va tal cual; los demás, un texto claro. */
export function errorDeRecarga(code: string | null | undefined, mensaje: string | null | undefined): string {
  if (code === "recarga_bajo_minimo" && mensaje) return mensaje;
  return (code && ERROR_DE_RECARGA[code]) || "No pudimos abrir el pago de la recarga. Vuelve a intentarlo.";
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
  } else if (f.descuento_recarga === 0) {
    // Basic compra créditos sin descuento (HU-BILL-23).
    lista.push("Puedes comprar créditos extra");
  }
  if (f.marca_propia === true) lista.push("Tu propia marca");
  if (f.byok === true) lista.push("Tu propia llave de IA");
  if (typeof f.historial_dias === "number") lista.push(`Historial de ${formatearNumero(f.historial_dias)} días`);
  else if (f.historial_dias === null) lista.push("Historial sin límite");
  if (typeof f.soporte === "string" && SOPORTE[f.soporte]) lista.push(SOPORTE[f.soporte]);
  return lista;
}
