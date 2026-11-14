import type { DashboardResponse, KpiResumen, ResumenPorAgente } from "./api";
import type { DefWidget } from "./widgets";

/** La cifra de un widget KPI dentro de `/admin/dashboard/agents`; `undefined` si no vino (sin permiso o sin pack). */
export function kpiDeWidget(def: DefWidget, datos: ResumenPorAgente | null): KpiResumen | undefined {
  if (!def.kpi || !datos) return undefined;
  const { modulo, id } = def.kpi;
  if (!modulo) return datos.general.kpis.find((k) => k.id === id);
  for (const agente of datos.agentes) {
    const encontrado = agente.modulos.find((m) => m.id === modulo)?.kpis.find((k) => k.id === id);
    if (encontrado) return encontrado;
  }
  return undefined;
}

/** Respaldo cuando el Resumen por agente no llega: las cifras de siempre de `/admin/dashboard`. */
export function kpiDeRespaldo(def: DefWidget, d: DashboardResponse | null): KpiResumen | undefined {
  if (!d) return undefined;
  const base = { previo: null, delta_pct: null, unidad: "count", valor: 0 } as const;
  if (def.clave === "kpi.conversaciones") {
    return {
      ...base,
      id: "conversaciones",
      label: "Conversaciones",
      valor: d.kpi.conversations_7d,
      polaridad: "up-good",
      hint: "Últimos 7 días",
      destino: { ruta: "conversaciones", params: {} },
    };
  }
  if (def.clave === "kpi.por_atender") {
    return {
      ...base,
      id: "escalaciones_pendientes",
      label: "Escalaciones pendientes",
      valor: d.kpi.pending_escalations,
      polaridad: "up-bad",
      destino: { ruta: "escalaciones", params: {} },
    };
  }
  return undefined;
}

export interface AlertaResumen {
  id: string;
  texto: string;
  /** Pantalla a la que lleva, si existe en la app. */
  destino?: { tab: string; pestana?: string };
}

/** Alertas que salen de `/admin/dashboard`: el asistente pausado y el consumo del plan. */
export function alertasDe(d: DashboardResponse | null): AlertaResumen[] {
  if (!d) return [];
  const alertas: AlertaResumen[] = [];
  if (d.bot_paused) {
    alertas.push({ id: "asistente-pausado", texto: "Tu asistente está pausado" });
  }
  const metrica = d.billing?.alert_metric ?? d.billing?.warning_metric ?? null;
  if (metrica) {
    const pct = metrica.percent !== null && metrica.percent !== undefined ? `${Math.round(metrica.percent)} %` : null;
    alertas.push({
      id: "consumo",
      texto: pct ? `Consumo al ${pct}: ${metrica.label}` : `Consumo del plan: ${metrica.label}`,
      destino: { tab: "negocio", pestana: "consumo" },
    });
  }
  if (d.billing && d.billing.has_plan && !d.billing.operational) {
    alertas.push({ id: "plan-inactivo", texto: `El plan ${d.billing.plan_name} no está operativo` });
  }
  return alertas;
}

export interface ConsumoResumen {
  label: string;
  value: string;
  hint?: string;
}

/** Tarjeta del plan: el consumo en alerta si lo hay; si no, el plan y los días que le quedan. */
export function consumoDe(d: DashboardResponse | null): ConsumoResumen | null {
  const b = d?.billing;
  if (!b || !b.has_plan) return null;
  const dias = b.days_left !== null && b.days_left !== undefined ? `${b.days_left} días restantes` : undefined;
  const m = b.alert_metric ?? b.warning_metric ?? null;
  if (m && m.percent !== null && m.percent !== undefined) {
    return { label: "Consumo del plan", value: `${Math.round(m.percent)} %`, hint: [m.label, dias].filter(Boolean).join(" · ") };
  }
  return { label: "Plan", value: b.plan_name, hint: dias };
}

/** «hace 5 min», «hace 3 h», «hace 2 d» para la antigüedad de una escalación. */
export function antiguedad(iso: string, ahora: Date = new Date()): string {
  const minutos = Math.max(0, Math.floor((ahora.getTime() - new Date(iso).getTime()) / 60000));
  if (Number.isNaN(minutos)) return "";
  if (minutos < 1) return "ahora";
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  return `hace ${Math.floor(horas / 24)} d`;
}
