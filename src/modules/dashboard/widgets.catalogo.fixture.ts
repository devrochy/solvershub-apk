/**
 * Tabla «Catálogo de widgets» de SPEC-29 (design.md §4), copiada tal cual. `widgets.test.ts` exige
 * que el registro de la app tenga estas mismas claves, permisos y endpoints (HU-DS-13: test de
 * paridad). Si la spec cambia, se cambia aquí y en `widgets.ts` a la vez.
 */
export interface FilaCatalogo {
  clave: string;
  /** Permiso requerido; `null` = «cualquiera» o «según la acción». */
  permiso: string | null;
}

export const CATALOGO_SPEC_29: FilaCatalogo[] = [
  { clave: "kpi.conversaciones", permiso: "conversations" },
  { clave: "kpi.resueltas_sin_humano", permiso: "conversations" },
  { clave: "kpi.por_atender", permiso: "escalations" },
  { clave: "kpi.consumo", permiso: "plan" },
  { clave: "kpi.recaudo_hoy", permiso: "pack_cobranza:resumen" },
  { clave: "kpi.mora", permiso: "pack_cobranza:resumen" },
  { clave: "kpi.promesas_hoy", permiso: "pack_cobranza:resumen" },
  { clave: "kpi.pedidos", permiso: "pack_commerce" },
  { clave: "kpi.citas_hoy", permiso: "pack_calendar:citas" },
  { clave: "chart.tendencia_atencion", permiso: "conversations" },
  { clave: "chart.recaudo_vs_meta", permiso: "pack_cobranza:reportes" },
  { clave: "lista.actividad", permiso: "conversations" },
  { clave: "lista.alertas", permiso: null },
  { clave: "lista.escalaciones", permiso: "escalations" },
  { clave: "acciones.rapidas", permiso: null },
  { clave: "estado.sistema", permiso: "dashboard" },
];

/**
 * Endpoint de datos que nombra la spec por familia de widget. Los KPI de pack salen del resumen
 * del pack (hoy a través de `/admin/dashboard/agents`, ADR-0171).
 */
export const ENDPOINT_SPEC_29: Record<string, RegExp> = {
  "kpi.conversaciones": /\/admin\/dashboard/,
  "kpi.resueltas_sin_humano": /\/admin\/dashboard/,
  "kpi.por_atender": /\/admin\/dashboard/,
  "kpi.consumo": /\/admin\/dashboard/,
  "kpi.recaudo_hoy": /pack_cobranza|\/pack\/cobranza/,
  "kpi.mora": /pack_cobranza|\/pack\/cobranza/,
  "kpi.promesas_hoy": /pack_cobranza|\/pack\/cobranza/,
  "kpi.pedidos": /pack_commerce/,
  "kpi.citas_hoy": /pack_calendar/,
  "chart.tendencia_atencion": /\/admin\/dashboard/,
  "chart.recaudo_vs_meta": /\/pack\/cobranza/,
  "lista.actividad": /\/admin\/dashboard/,
  "lista.alertas": /\/admin\/dashboard/,
  "lista.escalaciones": /\/admin\/escalations/,
  "acciones.rapidas": /bot-paused/,
  "estado.sistema": /\/admin\/dashboard/,
};
