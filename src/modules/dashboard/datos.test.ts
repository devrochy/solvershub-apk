import type { DashboardResponse, KpiResumen, ResumenPorAgente } from "./api";
import { alertasDe, antiguedad, consumoDe, kpiDeRespaldo, kpiDeWidget } from "./datos";
import { widgetPorClave } from "./widgets";

const kpi = (parcial: Partial<KpiResumen>): KpiResumen => ({
  id: "k",
  label: "K",
  valor: 1,
  unidad: "count",
  previo: null,
  delta_pct: null,
  polaridad: "up-good",
  ...parcial,
});

const RESUMEN = {
  periodo: { desde: "", hasta: "", previo_desde: "", previo_hasta: "" },
  runtime: "v3",
  general: { kpis: [kpi({ id: "conversaciones", valor: 10 })] },
  agentes: [
    {
      ref: "cobranza",
      name: "Cobranza",
      kind: "specialist",
      kpis: [],
      modulos: [{ id: "pack_cobranza", nombre: "Cobranza", error: null, kpis: [kpi({ id: "recaudo", valor: 5 })] }],
    },
  ],
} as unknown as ResumenPorAgente;

const dashboard = (parcial: Partial<DashboardResponse> = {}): DashboardResponse => ({
  tenant_id: "t",
  bot_paused: false,
  llm_label: "m",
  recent: [],
  billing: null,
  kpi: { active_plugins: 1, conversations_7d: 4, cost_30d: 0, messages_7d: 0, pending_escalations: 2 },
  ...parcial,
});

describe("kpiDeWidget", () => {
  it("lee del bloque del negocio o del módulo del pack", () => {
    expect(kpiDeWidget(widgetPorClave("kpi.conversaciones")!, RESUMEN)?.valor).toBe(10);
    expect(kpiDeWidget(widgetPorClave("kpi.recaudo_hoy")!, RESUMEN)?.valor).toBe(5);
  });

  it("devuelve undefined si el backend lo omitió (sin permiso o sin pack)", () => {
    expect(kpiDeWidget(widgetPorClave("kpi.pedidos")!, RESUMEN)).toBeUndefined();
    expect(kpiDeWidget(widgetPorClave("kpi.conversaciones")!, null)).toBeUndefined();
  });
});

describe("kpiDeRespaldo", () => {
  it("usa las cifras de /admin/dashboard cuando no llega el Resumen por agente", () => {
    expect(kpiDeRespaldo(widgetPorClave("kpi.conversaciones")!, dashboard())?.valor).toBe(4);
    expect(kpiDeRespaldo(widgetPorClave("kpi.por_atender")!, dashboard())?.polaridad).toBe("up-bad");
    expect(kpiDeRespaldo(widgetPorClave("kpi.pedidos")!, dashboard())).toBeUndefined();
  });
});

describe("alertasDe y consumoDe", () => {
  it("avisa del asistente pausado y del consumo en alerta", () => {
    const d = dashboard({
      bot_paused: true,
      billing: {
        plan_name: "Pro",
        status: "active",
        operational: true,
        days_left: 11,
        has_plan: true,
        alert_metric: { key: "k", label: "Mensajes", scope: "s", unit: "u", used: 8, limit: 10, percent: 80, exceeded: false },
      },
    });
    expect(alertasDe(d).map((a) => a.texto)).toEqual(["Tu asistente está pausado", "Consumo al 80 %: Mensajes"]);
    expect(consumoDe(d)).toEqual({ label: "Consumo del plan", value: "80 %", hint: "Mensajes · 11 días restantes" });
  });

  it("sin alertas muestra el plan y sus días, no un porcentaje inventado", () => {
    const d = dashboard({
      billing: { plan_name: "Pro", status: "active", operational: true, days_left: 5, has_plan: true },
    });
    expect(alertasDe(d)).toEqual([]);
    expect(consumoDe(d)).toEqual({ label: "Plan", value: "Pro", hint: "5 días restantes" });
    expect(consumoDe(dashboard())).toBeNull();
  });
});

describe("antiguedad", () => {
  const ahora = new Date("2026-10-28T12:00:00Z");
  it.each([
    ["2026-10-28T11:59:40Z", "ahora"],
    ["2026-10-28T11:55:00Z", "hace 5 min"],
    ["2026-10-28T09:00:00Z", "hace 3 h"],
    ["2026-10-26T12:00:00Z", "hace 2 d"],
  ])("%s → %s", (iso, esperado) => {
    expect(antiguedad(iso, ahora)).toBe(esperado);
  });
});
