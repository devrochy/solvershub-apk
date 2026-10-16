import type { MaterialIcons } from "@expo/vector-icons";
import { grupoVisible, puedeVerSeccion, type PermisosSeccion } from "@core/permisos";

type Icono = keyof typeof MaterialIcons.glyphMap;

/**
 * Menú del panel dentro de la app (HU-DS-11, D-34): la misma lista agrupada que
 * el sidebar del panel web (`components/shell/nav.ts`), con cada sección
 * apuntando al módulo de la app y a su pestaña interna. Las claves estables son
 * `modulo`, `pestana` y `seccion` (RBAC, ADR-0047); los labels son
 * reemplazables (SPEC-12 los renombrará).
 */

export type ModuloPanel =
  | "inicio"
  | "conversaciones"
  | "cobranza"
  | "comercio"
  | "calendario"
  | "negocio"
  | "configuracion"
  | "herramientas"
  | "busqueda"
  | "catalogo";

/** Orden fijo de los módulos en el shell (y destino del back: el primero visible). */
export const ORDEN_MODULOS: readonly ModuloPanel[] = [
  "inicio",
  "conversaciones",
  "cobranza",
  "comercio",
  "calendario",
  "negocio",
  "configuracion",
  "herramientas",
  "busqueda",
  "catalogo",
];

/** Módulo → título del header y, si tiene stack propio, el nombre de su pantalla raíz. */
export const MODULOS_PANEL: Record<ModuloPanel, { label: string; raizStack?: string }> = {
  inicio: { label: "Resumen" },
  conversaciones: { label: "Operación", raizStack: "Operacion" },
  cobranza: { label: "Cobranza", raizStack: "CobranzaAdmin" },
  comercio: { label: "Comercio" },
  calendario: { label: "Calendario" },
  negocio: { label: "Negocio" },
  configuracion: { label: "Configuración" },
  herramientas: { label: "Herramientas" },
  busqueda: { label: "Buscar" },
  catalogo: { label: "Catálogo de UI" },
};

export interface ItemMenuPanel {
  label: string;
  icono: Icono;
  modulo: ModuloPanel;
  /** Pestaña interna real de la pantalla del módulo; sin pestaña = pantalla única. */
  pestana?: string;
  /**
   * Clave RBAC igual a la del panel. `"*"` = basta cualquier permiso (o master);
   * `null` = siempre visible (se gatea por `soloDev`/`soloMaster`).
   */
  seccion: string | null;
  soloMaster?: boolean;
  soloDev?: boolean;
}

export interface GrupoMenuPanel {
  id: string;
  label: string;
  icono: Icono;
  /** Pack del negocio (el panel lo atenúa con candado si no está habilitado). */
  pack?: "pack_cobranza" | "pack_commerce" | "pack_calendar";
  soloMaster?: boolean;
  soloDev?: boolean;
  items: ItemMenuPanel[];
}

export const MENU_PANEL: GrupoMenuPanel[] = [
  {
    id: "operacion",
    label: "Operación",
    icono: "dashboard",
    items: [
      { label: "Resumen", icono: "dashboard", modulo: "inicio", seccion: "dashboard" },
      { label: "Conversaciones", icono: "chat", modulo: "conversaciones", pestana: "conversaciones", seccion: "conversations" },
      { label: "Escalaciones", icono: "report", modulo: "conversaciones", pestana: "escalaciones", seccion: "escalations" },
      { label: "Leads", icono: "people", modulo: "conversaciones", pestana: "leads", seccion: "leads" },
    ],
  },
  {
    id: "pack_cobranza",
    label: "Cobranza",
    icono: "payments",
    pack: "pack_cobranza",
    items: [
      { label: "Resumen", icono: "dashboard", modulo: "cobranza", pestana: "resumen", seccion: "pack_cobranza:resumen" },
      { label: "Gestores", icono: "manage-accounts", modulo: "cobranza", pestana: "gestores", seccion: "pack_cobranza:gestores" },
      { label: "Carteras", icono: "account-balance-wallet", modulo: "cobranza", pestana: "carteras", seccion: "pack_cobranza:carteras" },
      { label: "Clientes", icono: "people", modulo: "cobranza", pestana: "clientes", seccion: "pack_cobranza:clientes" },
      { label: "Pagos", icono: "receipt-long", modulo: "cobranza", pestana: "pagos", seccion: "pack_cobranza:cobros" },
      { label: "Promesas", icono: "handshake", modulo: "cobranza", pestana: "promesas", seccion: "pack_cobranza:promesas" },
      { label: "Propietario", icono: "account-balance", modulo: "cobranza", pestana: "propietario", seccion: "pack_cobranza:propietario" },
      { label: "Reportes", icono: "bar-chart", modulo: "cobranza", pestana: "reportes", seccion: "pack_cobranza:reportes" },
      { label: "Monitoreo", icono: "monitor-heart", modulo: "cobranza", pestana: "monitoreo", seccion: "pack_cobranza:monitoreo" },
      { label: "Reglas", icono: "balance", modulo: "cobranza", pestana: "reglas", seccion: "pack_cobranza:reglas" },
      { label: "Alertas", icono: "notifications-active", modulo: "cobranza", pestana: "alertas", seccion: "pack_cobranza:alertas" },
      { label: "Auditoría", icono: "history", modulo: "cobranza", pestana: "auditoria", seccion: "pack_cobranza:auditoria" },
      { label: "Dispositivos", icono: "smartphone", modulo: "cobranza", pestana: "dispositivos", seccion: "pack_cobranza:dispositivos" },
    ],
  },
  {
    id: "pack_commerce",
    label: "Comercio",
    icono: "storefront",
    pack: "pack_commerce",
    items: [
      { label: "Resumen", icono: "dashboard", modulo: "comercio", pestana: "resumen", seccion: "pack_commerce" },
      { label: "Productos", icono: "inventory-2", modulo: "comercio", pestana: "productos", seccion: "pack_commerce" },
      { label: "Categorías", icono: "sell", modulo: "comercio", pestana: "categorias", seccion: "pack_commerce" },
      { label: "Promociones", icono: "local-offer", modulo: "comercio", pestana: "promociones", seccion: "pack_commerce" },
      { label: "Pedidos", icono: "shopping-cart", modulo: "comercio", pestana: "pedidos", seccion: "pack_commerce" },
    ],
  },
  {
    id: "pack_calendar",
    label: "Calendario",
    icono: "event",
    pack: "pack_calendar",
    items: [
      { label: "Conexión", icono: "link", modulo: "calendario", pestana: "conexion", seccion: "pack_calendar:conexion" },
      { label: "Horario", icono: "schedule", modulo: "calendario", pestana: "horario", seccion: "pack_calendar:conexion" },
      { label: "Tipos de cita", icono: "category", modulo: "calendario", pestana: "tipos", seccion: "pack_calendar:tipos" },
      { label: "Bloqueos", icono: "event-busy", modulo: "calendario", pestana: "bloqueos", seccion: "pack_calendar:bloqueos" },
      { label: "Citas", icono: "event", modulo: "calendario", pestana: "semana", seccion: "pack_calendar:citas" },
    ],
  },
  {
    id: "negocio",
    label: "Negocio",
    icono: "business-center",
    items: [
      { label: "Plan y consumo", icono: "credit-card", modulo: "negocio", pestana: "plan", seccion: "plan" },
      { label: "Costos LLM", icono: "paid", modulo: "negocio", pestana: "costos", seccion: "costs" },
    ],
  },
  {
    id: "configuracion",
    label: "Configuración",
    icono: "settings",
    items: [
      { label: "Conexiones", icono: "cable", modulo: "configuracion", pestana: "conexiones", seccion: "connections" },
      { label: "Habilidades", icono: "extension", modulo: "configuracion", pestana: "habilidades", seccion: "plugins" },
      { label: "Colaboradores", icono: "group", modulo: "configuracion", pestana: "colaboradores", seccion: "collaborators" },
      { label: "Configuración", icono: "tune", modulo: "configuracion", pestana: "ajustes", seccion: "settings" },
      { label: "Notificaciones push", icono: "notifications", modulo: "configuracion", pestana: "notificaciones", seccion: "settings" },
    ],
  },
  {
    id: "herramientas",
    label: "Herramientas",
    icono: "build",
    items: [
      { label: "Buscar", icono: "search", modulo: "busqueda", seccion: "*" },
      { label: "Bandeja de fallos", icono: "error-outline", modulo: "herramientas", pestana: "fallos", seccion: "settings" },
      { label: "Probar asistente", icono: "play-circle", modulo: "conversaciones", pestana: "playground", seccion: "connections" },
      { label: "Plantillas WhatsApp", icono: "description", modulo: "configuracion", pestana: "conexiones", seccion: "connections" },
    ],
  },
  {
    id: "plataforma",
    label: "Plataforma",
    icono: "admin-panel-settings",
    soloMaster: true,
    items: [{ label: "Negocios", icono: "business", modulo: "herramientas", pestana: "negocios", seccion: "tenants", soloMaster: true }],
  },
  {
    id: "desarrollo",
    label: "Desarrollo",
    icono: "code",
    soloDev: true,
    items: [{ label: "Catálogo de UI", icono: "palette", modulo: "catalogo", seccion: null, soloDev: true }],
  },
];

/** El catálogo del kit solo se registra en builds de desarrollo (`__DEV__`). */
export function catalogoDisponible(): boolean {
  return __DEV__;
}

export interface OpcionesMenu {
  /** Fuerza (o apaga) las entradas de desarrollo; por defecto `catalogoDisponible()`. */
  dev?: boolean;
  /** Packs habilitados en el negocio; un pack en `false` muestra su grupo con candado. */
  packs?: Record<string, boolean>;
}

function tieneAlgunPermiso(permisos: PermisosSeccion): boolean {
  return Object.values(permisos).some((v) => v != null);
}

function itemVisible(item: ItemMenuPanel, permisos: PermisosSeccion, esMaster: boolean, dev: boolean): boolean {
  if (item.soloMaster && !esMaster) return false;
  if (item.soloDev && !dev) return false;
  if (item.seccion === null) return true;
  if (item.seccion === "*") return esMaster || tieneAlgunPermiso(permisos);
  return puedeVerSeccion(permisos, item.seccion, esMaster);
}

export type GrupoVisible = GrupoMenuPanel & { bloqueado: boolean };

/** Grupos con solo los ítems que los permisos del usuario dejan ver. */
export function gruposDeMenu(
  permisos: PermisosSeccion,
  esMaster: boolean,
  opciones: OpcionesMenu = {},
): GrupoVisible[] {
  const dev = opciones.dev ?? catalogoDisponible();
  return MENU_PANEL.flatMap((grupo) => {
    if (grupo.soloMaster && !esMaster) return [];
    if (grupo.soloDev && !dev) return [];
    const items = grupo.items.filter((item) => itemVisible(item, permisos, esMaster, dev));
    if (items.length === 0) return [];
    const bloqueado = Boolean(grupo.pack) && opciones.packs?.[grupo.pack!] === false;
    return [{ ...grupo, items, bloqueado }];
  });
}

export type ItemVisible = ItemMenuPanel & { grupo: string; bloqueado: boolean };

/** Ítems visibles, planos (lógica pura, testeable). */
export function seccionesDeMenu(
  permisos: PermisosSeccion,
  esMaster: boolean,
  opciones: OpcionesMenu = {},
): ItemVisible[] {
  return gruposDeMenu(permisos, esMaster, opciones).flatMap((g) =>
    g.items.map((item) => ({ ...item, grupo: g.label, bloqueado: g.bloqueado })),
  );
}

/** Módulos que el shell monta (una pantalla por módulo), en el orden fijo. */
export function modulosVisibles(
  permisos: PermisosSeccion,
  esMaster: boolean,
  opciones: OpcionesMenu = {},
): ModuloPanel[] {
  const presentes = new Set(seccionesDeMenu(permisos, esMaster, opciones).map((i) => i.modulo));
  return ORDEN_MODULOS.filter((m) => presentes.has(m));
}

/** Clave estable de un destino (testID `cajon-item-<clave>`). */
export function claveDeDestino(modulo: ModuloPanel, pestana?: string): string {
  return pestana ? `${modulo}-${pestana}` : modulo;
}

/** Secciones RBAC de un grupo (para `grupoVisible` de `@core/permisos`). */
export function seccionesDeGrupo(grupo: GrupoMenuPanel): string[] {
  return grupo.items.flatMap((i) => (i.seccion && i.seccion !== "*" ? [i.seccion] : []));
}

export { grupoVisible };
