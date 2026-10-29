import type { PermisosSeccion } from "@core/permisos";
import { puedeVerSeccion } from "@core/permisos";
import type { PackResumen, PerfilResumen } from "./perfil";

/**
 * Catálogo de widgets del Resumen (SPEC-29 design.md §4). Las claves, permisos y endpoints son el
 * contrato que comparten el panel (HU-DS-07) y la app: `widgets.test.ts` los compara con la tabla
 * de la spec. Un widget sin dato en el backend está `pendiente` y no se dibuja (no se inventan
 * métricas): el motivo y la HU que lo destraba quedan aquí.
 */

export type FuenteResumen = "agentes" | "dashboard" | "escalaciones" | "ninguna";
export type FormaWidget = "kpi" | "grafico" | "lista" | "acciones" | "estado";

export interface DefWidget {
  clave: string;
  titulo: string;
  forma: FormaWidget;
  /** Sección RBAC que lo respalda; `null` si cada elemento filtra la suya. */
  permiso: string | null;
  /** Endpoint del que salen los datos, como lo nombra la spec. */
  endpoint: string;
  fuente: FuenteResumen;
  /** Para los KPI: dónde está la cifra en `/admin/dashboard/agents`. */
  kpi?: { modulo?: PackResumen; id: string };
  perfiles: PerfilResumen[];
  /** Si falta el dato: por qué y qué HU lo destraba. */
  pendiente?: string;
  /** Aclaración cuando la cifra del backend no es exactamente la de la spec. */
  nota?: string;
}

const HU_UI_07 =
  "HU-UI-07: el backend aún no ofrece `GET /admin/dashboard?period=` con series ni comparación por período";

export const WIDGETS: DefWidget[] = [
  {
    clave: "kpi.conversaciones",
    titulo: "Conversaciones",
    forma: "kpi",
    permiso: "conversations",
    endpoint: "GET /admin/dashboard?period=",
    fuente: "agentes",
    kpi: { id: "conversaciones" },
    perfiles: ["dueno"],
    nota: "Hoy sale de /admin/dashboard/agents (7 días contra 7 días); sin sparkline.",
  },
  {
    clave: "kpi.resueltas_sin_humano",
    titulo: "Resueltas sin humano",
    forma: "kpi",
    permiso: "conversations",
    endpoint: "GET /admin/dashboard?period=",
    fuente: "ninguna",
    perfiles: ["dueno", "operador"],
    pendiente: HU_UI_07,
  },
  {
    clave: "kpi.por_atender",
    titulo: "Escalaciones pendientes",
    forma: "kpi",
    permiso: "escalations",
    endpoint: "GET /admin/dashboard?period=",
    fuente: "agentes",
    kpi: { id: "escalaciones_pendientes" },
    perfiles: ["dueno", "operador"],
  },
  {
    clave: "kpi.consumo",
    titulo: "Consumo del plan",
    forma: "kpi",
    permiso: "plan",
    endpoint: "GET /admin/dashboard?period=",
    fuente: "dashboard",
    perfiles: ["dueno"],
  },
  {
    clave: "kpi.recaudo_hoy",
    titulo: "Recaudo",
    forma: "kpi",
    permiso: "pack_cobranza:resumen",
    endpoint: "GET /admin/dashboard/agents (pack_cobranza)",
    fuente: "agentes",
    kpi: { modulo: "pack_cobranza", id: "recaudo" },
    perfiles: ["dueno", "supervisor"],
    nota: "El backend entrega los últimos 7 días, no «hoy».",
  },
  {
    clave: "kpi.mora",
    titulo: "Cartera en mora",
    forma: "kpi",
    permiso: "pack_cobranza:resumen",
    endpoint: "GET /admin/dashboard/agents (pack_cobranza)",
    fuente: "agentes",
    kpi: { modulo: "pack_cobranza", id: "cartera_en_mora" },
    perfiles: ["supervisor"],
  },
  {
    clave: "kpi.promesas_hoy",
    titulo: "Promesas pendientes",
    forma: "kpi",
    permiso: "pack_cobranza:resumen",
    endpoint: "GET /admin/dashboard/agents (pack_cobranza)",
    fuente: "agentes",
    kpi: { modulo: "pack_cobranza", id: "promesas_pendientes" },
    perfiles: ["supervisor"],
    nota: "El backend cuenta las pendientes, no las que vencen hoy.",
  },
  {
    clave: "kpi.pedidos",
    titulo: "Pedidos",
    forma: "kpi",
    permiso: "pack_commerce",
    endpoint: "GET /admin/dashboard/agents (pack_commerce)",
    fuente: "agentes",
    kpi: { modulo: "pack_commerce", id: "pedidos" },
    perfiles: ["dueno", "supervisor"],
  },
  {
    clave: "kpi.citas_hoy",
    titulo: "Citas de hoy",
    forma: "kpi",
    permiso: "pack_calendar:citas",
    endpoint: "GET /admin/dashboard/agents (pack_calendar)",
    fuente: "agentes",
    kpi: { modulo: "pack_calendar", id: "citas_hoy" },
    perfiles: ["dueno", "supervisor"],
  },
  {
    clave: "chart.tendencia_atencion",
    titulo: "Tendencia de atención",
    forma: "grafico",
    permiso: "conversations",
    endpoint: "GET /admin/dashboard?period=",
    fuente: "ninguna",
    perfiles: ["dueno"],
    pendiente: HU_UI_07,
  },
  {
    clave: "chart.recaudo_vs_meta",
    titulo: "Recaudo frente a meta",
    forma: "grafico",
    permiso: "pack_cobranza:reportes",
    endpoint: "GET /pack/cobranza/summary",
    fuente: "ninguna",
    perfiles: ["supervisor"],
    pendiente: "El resumen de cobranza no trae meta ni serie diaria del recaudo",
  },
  {
    clave: "lista.actividad",
    titulo: "Actividad reciente",
    forma: "lista",
    permiso: "conversations",
    endpoint: "GET /admin/dashboard",
    fuente: "dashboard",
    perfiles: ["dueno", "supervisor"],
    nota: "Solo conversaciones recientes; la auditoría de cobranza no se une todavía.",
  },
  {
    clave: "lista.alertas",
    titulo: "Alertas",
    forma: "lista",
    permiso: null,
    endpoint: "GET /admin/dashboard",
    fuente: "dashboard",
    perfiles: ["dueno", "supervisor", "operador"],
    nota: "Asistente pausado y consumo del plan; faltan plantillas y alertas de acceso.",
  },
  {
    clave: "lista.escalaciones",
    titulo: "Cola de escalaciones",
    forma: "lista",
    permiso: "escalations",
    endpoint: "GET /admin/escalations",
    fuente: "escalaciones",
    perfiles: ["operador"],
  },
  {
    clave: "acciones.rapidas",
    titulo: "Acciones rápidas",
    forma: "acciones",
    permiso: null,
    endpoint: "PUT /admin/settings/bot-paused",
    fuente: "dashboard",
    perfiles: ["dueno", "operador"],
    nota: "Cada acción revisa su permiso de escritura.",
  },
  {
    clave: "estado.sistema",
    titulo: "Estado del sistema",
    forma: "estado",
    permiso: "dashboard",
    endpoint: "GET /admin/dashboard",
    fuente: "dashboard",
    perfiles: ["dueno"],
  },
];

/** Orden de lectura de cada perfil (una columna en el celular; los KPI van de dos en dos). */
export const ORDEN_POR_PERFIL: Record<PerfilResumen, string[]> = {
  dueno: [
    "lista.alertas",
    "kpi.conversaciones",
    "kpi.resueltas_sin_humano",
    "kpi.por_atender",
    "kpi.consumo",
    "kpi.recaudo_hoy",
    "kpi.pedidos",
    "kpi.citas_hoy",
    "chart.tendencia_atencion",
    "acciones.rapidas",
    "lista.actividad",
    "estado.sistema",
  ],
  supervisor: [
    "lista.alertas",
    "kpi.recaudo_hoy",
    "kpi.mora",
    "kpi.promesas_hoy",
    "kpi.pedidos",
    "kpi.citas_hoy",
    "chart.recaudo_vs_meta",
    "lista.actividad",
  ],
  operador: [
    "lista.alertas",
    "kpi.por_atender",
    "kpi.resueltas_sin_humano",
    "lista.escalaciones",
    "acciones.rapidas",
  ],
};

export function widgetPorClave(clave: string): DefWidget | undefined {
  return WIDGETS.find((w) => w.clave === clave);
}

export interface AccesoResumen {
  permissions: PermisosSeccion;
  esMaster: boolean;
}

/**
 * Widgets que se dibujan para un perfil: los de su orden, con permiso y con dato en el backend.
 * Nunca devuelve un widget que el usuario no puede ver.
 */
export function widgetsDelPerfil(perfil: PerfilResumen, acceso: AccesoResumen): DefWidget[] {
  return ORDEN_POR_PERFIL[perfil]
    .map(widgetPorClave)
    .filter((w): w is DefWidget => w !== undefined)
    .filter((w) => w.perfiles.includes(perfil) && !w.pendiente)
    .filter((w) => w.permiso === null || puedeVerSeccion(acceso.permissions, w.permiso, acceso.esMaster));
}
