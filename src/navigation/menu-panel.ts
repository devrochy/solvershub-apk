import type { MaterialIcons } from "@expo/vector-icons";
import { puedeVerSeccion, type PermisosSeccion } from "@core/permisos";
import type { EntradaPestanas } from "@shared/pestana-inicial";

type Icono = keyof typeof MaterialIcons.glyphMap;

/**
 * Menú del panel dentro de la app (HU-DS-11, D-34; menú v2 en HU-UX-11, D-37):
 * la misma lista que el sidebar del panel web (`components/shell/nav.ts`), con
 * una entrada por tarea y sus pestañas. Cada pestaña apunta a un módulo de la
 * app y a su pestaña interna; la entrada se ve si el usuario puede ver al menos
 * una pestaña y abre la primera permitida. Las claves estables son el `id` de
 * la entrada (testID `cajon-item-<id>`), `modulo`, `pestana` y `seccion` (RBAC,
 * ADR-0047); los labels son reemplazables.
 *
 * Solo se mapean pantallas que ya existen en la app: las pestañas del panel web
 * sin pantalla aquí (Agentes, Suscripciones, Pruebas…) se omiten.
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

/**
 * Módulo → título del header cuando el destino no dice pestaña (back del
 * sistema) y, si tiene stack propio, el nombre de su pantalla raíz. Con pestaña,
 * el header lleva el nombre de la entrada del cajón (`tituloDeDestino`).
 */
export const MODULOS_PANEL: Record<ModuloPanel, { label: string; raizStack?: string }> = {
  inicio: { label: "Resumen" },
  conversaciones: { label: "Conversaciones", raizStack: "Operacion" },
  cobranza: { label: "Cobranza", raizStack: "CobranzaAdmin" },
  comercio: { label: "Ventas" },
  calendario: { label: "Agenda" },
  negocio: { label: "Consumo y plan" },
  configuracion: { label: "Configuración" },
  herramientas: { label: "Mensajes fallidos" },
  busqueda: { label: "Buscar" },
  catalogo: { label: "Catálogo de UI" },
};

/** Pestaña de una entrada: destino real en la app y su clave RBAC. */
export interface PestanaMenuPanel {
  label: string;
  modulo: ModuloPanel;
  /** Pestaña interna de la pantalla del módulo; sin pestaña = pantalla única. */
  pestana?: string;
  /**
   * Clave RBAC igual a la del panel. `null` = siempre visible (se gatea por
   * `soloDev`/`soloMaster`).
   */
  seccion: string | null;
  /** Subgrupo de pestañas (Cobranza: Operación, Monitoreo y Seguridad). */
  sub?: string;
  soloMaster?: boolean;
  /**
   * Fuera de la barra de pestañas (HU-UX-08, como `oculta` en el panel web): la
   * pantalla sigue abriéndose por su pestaña (push, Búsqueda) y se gatea por su
   * clave RBAC.
   */
  oculta?: boolean;
}

export interface EntradaMenuPanel {
  /** Clave estable (testID `cajon-item-<id>`). */
  id: string;
  label: string;
  icono: Icono;
  /** Pack del negocio: si no está habilitado, la entrada queda con candado. */
  pack?: "pack_cobranza" | "pack_commerce" | "pack_calendar";
  soloMaster?: boolean;
  soloDev?: boolean;
  /** En orden: tocar la entrada abre la primera permitida. */
  pestanas: PestanaMenuPanel[];
}

export interface GrupoMenuPanel {
  id: string;
  label: string;
  icono: Icono;
  soloMaster?: boolean;
  soloDev?: boolean;
  entradas: EntradaMenuPanel[];
}

const COBRANZA: PestanaMenuPanel[] = [
  { label: "Resumen", modulo: "cobranza", pestana: "resumen", seccion: "pack_cobranza:resumen" },
  { label: "Gestores", modulo: "cobranza", pestana: "gestores", seccion: "pack_cobranza:gestores", sub: "Operación" },
  { label: "Carteras", modulo: "cobranza", pestana: "carteras", seccion: "pack_cobranza:carteras", sub: "Operación" },
  { label: "Clientes", modulo: "cobranza", pestana: "clientes", seccion: "pack_cobranza:clientes", sub: "Operación" },
  { label: "Pagos", modulo: "cobranza", pestana: "pagos", seccion: "pack_cobranza:cobros", sub: "Operación" },
  { label: "Promesas", modulo: "cobranza", pestana: "promesas", seccion: "pack_cobranza:promesas", sub: "Operación" },
  { label: "Propietario", modulo: "cobranza", pestana: "propietario", seccion: "pack_cobranza:propietario", sub: "Operación" },
  { label: "Reportes", modulo: "cobranza", pestana: "reportes", seccion: "pack_cobranza:reportes", sub: "Operación" },
  { label: "Monitoreo IA", modulo: "cobranza", pestana: "monitoreo", seccion: "pack_cobranza:monitoreo", sub: "Monitoreo" },
  { label: "Reglas de negociación", modulo: "cobranza", pestana: "reglas", seccion: "pack_cobranza:reglas", sub: "Monitoreo" },
  { label: "Alertas de acceso", modulo: "cobranza", pestana: "alertas", seccion: "pack_cobranza:alertas", sub: "Seguridad" },
  { label: "Auditoría", modulo: "cobranza", pestana: "auditoria", seccion: "pack_cobranza:auditoria", sub: "Seguridad" },
  { label: "Dispositivos", modulo: "cobranza", pestana: "dispositivos", seccion: "pack_cobranza:dispositivos", sub: "Seguridad" },
];

export const MENU_PANEL: GrupoMenuPanel[] = [
  {
    id: "operacion",
    label: "Operación",
    icono: "dashboard",
    entradas: [
      {
        id: "resumen",
        label: "Resumen",
        icono: "dashboard",
        pestanas: [{ label: "Resumen", modulo: "inicio", seccion: "dashboard" }],
      },
      {
        id: "conversaciones",
        label: "Conversaciones",
        icono: "chat",
        pestanas: [
          { label: "Conversaciones", modulo: "conversaciones", pestana: "conversaciones", seccion: "conversations" },
          { label: "Escalaciones", modulo: "conversaciones", pestana: "escalaciones", seccion: "escalations" },
        ],
      },
      {
        id: "clientes",
        label: "Clientes",
        icono: "people",
        pestanas: [{ label: "Clientes", modulo: "conversaciones", pestana: "leads", seccion: "leads" }],
      },
    ],
  },
  {
    id: "asistente",
    label: "Tu asistente",
    icono: "smart-toy",
    entradas: [
      {
        // La lista de agentes aún no tiene pantalla en la app: solo «Probar asistente».
        id: "agentes",
        label: "Agentes",
        icono: "smart-toy",
        pestanas: [{ label: "Probar asistente", modulo: "conversaciones", pestana: "playground", seccion: "connections" }],
      },
      {
        // Plantillas, Producción y Requisitos de Meta viven dentro de la pestaña Conexiones de la app.
        id: "conexiones",
        label: "Conexiones",
        icono: "cable",
        pestanas: [
          { label: "Conexiones", modulo: "configuracion", pestana: "conexiones", seccion: "connections" },
          { label: "Plantillas", modulo: "configuracion", pestana: "conexiones", seccion: "connections" },
          { label: "Producción", modulo: "configuracion", pestana: "conexiones", seccion: "connections" },
          { label: "Requisitos de Meta", modulo: "configuracion", pestana: "conexiones", seccion: "connections" },
        ],
      },
    ],
  },
  {
    id: "negocio",
    label: "Negocio",
    icono: "business-center",
    entradas: [
      {
        id: "agenda",
        label: "Agenda",
        icono: "event",
        pack: "pack_calendar",
        pestanas: [
          { label: "Calendario", modulo: "calendario", pestana: "semana", seccion: "pack_calendar:citas" },
          { label: "Tipos de cita", modulo: "calendario", pestana: "tipos", seccion: "pack_calendar:tipos" },
          { label: "Horario", modulo: "calendario", pestana: "horario", seccion: "pack_calendar:configuracion" },
          { label: "Google Calendar", modulo: "calendario", pestana: "conexion", seccion: "pack_calendar:conexion" },
          // HU-UX-08: en el panel web los bloqueos se crean y se arrastran en el Calendario. Va al
          // final para que la entrada nunca abra en ella si el usuario ve el Calendario.
          { label: "Bloqueos", modulo: "calendario", pestana: "bloqueos", seccion: "pack_calendar:bloqueos", oculta: true },
        ],
      },
      {
        id: "ventas",
        label: "Ventas",
        icono: "storefront",
        pack: "pack_commerce",
        pestanas: [
          { label: "Resumen", modulo: "comercio", pestana: "resumen", seccion: "pack_commerce" },
          { label: "Productos", modulo: "comercio", pestana: "productos", seccion: "pack_commerce" },
          { label: "Categorías", modulo: "comercio", pestana: "categorias", seccion: "pack_commerce" },
          { label: "Promociones", modulo: "comercio", pestana: "promociones", seccion: "pack_commerce" },
          { label: "Pedidos", modulo: "comercio", pestana: "pedidos", seccion: "pack_commerce" },
        ],
      },
      { id: "cobranza", label: "Cobranza", icono: "payments", pack: "pack_cobranza", pestanas: COBRANZA },
    ],
  },
  {
    id: "cuenta",
    label: "Cuenta",
    icono: "account-circle",
    entradas: [
      {
        id: "consumo",
        label: "Consumo y plan",
        icono: "credit-card",
        pestanas: [
          { label: "Plan", modulo: "negocio", pestana: "plan", seccion: "plan" },
          { label: "Costos", modulo: "negocio", pestana: "costos", seccion: "costs" },
        ],
      },
      {
        id: "equipo",
        label: "Equipo",
        icono: "group",
        pestanas: [{ label: "Colaboradores", modulo: "configuracion", pestana: "colaboradores", seccion: "collaborators" }],
      },
      {
        id: "configuracion",
        label: "Configuración",
        icono: "settings",
        pestanas: [
          { label: "General", modulo: "configuracion", pestana: "ajustes", seccion: "settings" },
          { label: "Habilidades", modulo: "configuracion", pestana: "habilidades", seccion: "plugins" },
          { label: "Mensajes fallidos", modulo: "herramientas", pestana: "fallos", seccion: "settings" },
          // Solo de la app (el push es del dispositivo): no existe en el panel web.
          { label: "Notificaciones push", modulo: "configuracion", pestana: "notificaciones", seccion: "settings" },
        ],
      },
    ],
  },
  {
    id: "plataforma",
    label: "Plataforma",
    icono: "admin-panel-settings",
    soloMaster: true,
    entradas: [
      {
        id: "negocios",
        label: "Negocios",
        icono: "business",
        soloMaster: true,
        pestanas: [{ label: "Negocios", modulo: "herramientas", pestana: "negocios", seccion: "tenants", soloMaster: true }],
      },
    ],
  },
  {
    id: "desarrollo",
    label: "Desarrollo",
    icono: "code",
    soloDev: true,
    entradas: [
      {
        id: "catalogo",
        label: "Catálogo de UI",
        icono: "palette",
        soloDev: true,
        pestanas: [{ label: "Catálogo de UI", modulo: "catalogo", seccion: null }],
      },
    ],
  },
];

/** El catálogo del kit solo se registra en builds de desarrollo (`__DEV__`). */
export function catalogoDisponible(): boolean {
  return __DEV__;
}

export interface OpcionesMenu {
  /** Fuerza (o apaga) las entradas de desarrollo; por defecto `catalogoDisponible()`. */
  dev?: boolean;
  /** Packs habilitados en el negocio; un pack en `false` muestra su entrada con candado. */
  packs?: Record<string, boolean>;
}

function tieneAlgunPermiso(permisos: PermisosSeccion): boolean {
  return Object.values(permisos).some((v) => v != null);
}

function pestanaVisible(pestana: PestanaMenuPanel, permisos: PermisosSeccion, esMaster: boolean): boolean {
  if (pestana.soloMaster && !esMaster) return false;
  if (pestana.seccion === null) return true;
  return puedeVerSeccion(permisos, pestana.seccion, esMaster);
}

export type EntradaVisible = EntradaMenuPanel & {
  /** Primera pestaña permitida: adonde lleva tocar la entrada. */
  destino: PestanaMenuPanel;
  bloqueado: boolean;
};

export type GrupoVisible = Omit<GrupoMenuPanel, "entradas"> & { entradas: EntradaVisible[] };

/**
 * Grupos con las entradas que el usuario puede ver: una entrada se ve si tiene
 * permiso en al menos una de sus pestañas, y solo conserva esas pestañas.
 */
export function gruposDeMenu(
  permisos: PermisosSeccion,
  esMaster: boolean,
  opciones: OpcionesMenu = {},
): GrupoVisible[] {
  const dev = opciones.dev ?? catalogoDisponible();
  return MENU_PANEL.flatMap((grupo) => {
    if (grupo.soloMaster && !esMaster) return [];
    if (grupo.soloDev && !dev) return [];
    const entradas = grupo.entradas.flatMap((entrada): EntradaVisible[] => {
      if (entrada.soloMaster && !esMaster) return [];
      if (entrada.soloDev && !dev) return [];
      const pestanas = entrada.pestanas.filter((p) => pestanaVisible(p, permisos, esMaster));
      if (pestanas.length === 0) return [];
      const bloqueado = Boolean(entrada.pack) && opciones.packs?.[entrada.pack!] === false;
      return [{ ...entrada, pestanas, destino: pestanas[0], bloqueado }];
    });
    if (entradas.length === 0) return [];
    return [{ ...grupo, entradas }];
  });
}

export type PestanaVisible = PestanaMenuPanel & { entrada: string; grupo: string; bloqueado: boolean };

/** Pestañas visibles de todas las entradas, planas (lógica pura, testeable). */
export function seccionesDeMenu(
  permisos: PermisosSeccion,
  esMaster: boolean,
  opciones: OpcionesMenu = {},
): PestanaVisible[] {
  return gruposDeMenu(permisos, esMaster, opciones).flatMap((g) =>
    g.entradas.flatMap((e) =>
      e.pestanas.map((p) => ({ ...p, entrada: e.id, grupo: g.label, bloqueado: e.bloqueado })),
    ),
  );
}

/**
 * Módulos que el shell monta (una pantalla por módulo), en el orden fijo. La
 * Búsqueda no tiene entrada en el cajón (el panel web la tiene en la topbar):
 * se abre desde el header y basta cualquier permiso.
 */
export function modulosVisibles(
  permisos: PermisosSeccion,
  esMaster: boolean,
  opciones: OpcionesMenu = {},
): ModuloPanel[] {
  const presentes = new Set<ModuloPanel>(seccionesDeMenu(permisos, esMaster, opciones).map((p) => p.modulo));
  if (esMaster || tieneAlgunPermiso(permisos)) presentes.add("busqueda");
  return ORDEN_MODULOS.filter((m) => presentes.has(m));
}

/** Destino exacto (módulo y pestaña) dentro de una entrada. */
export function entradaContiene(
  entrada: Pick<EntradaMenuPanel, "pestanas">,
  destino: { modulo: ModuloPanel; pestana?: string },
): boolean {
  return entrada.pestanas.some((p) => p.modulo === destino.modulo && p.pestana === destino.pestana);
}

/** Destino del shell: módulo, pestaña interna y, si se sabe, la entrada del cajón. */
export interface DestinoMenu {
  modulo: ModuloPanel;
  pestana?: string;
  /** `id` de la entrada por la que se llegó; manda sobre el módulo y la pestaña. */
  entrada?: string;
}

/**
 * Entrada visible a la que pertenece un destino: la de `entrada` si viene; si
 * no, la que contiene el módulo y la pestaña exactos (push, Búsqueda); sin
 * pestaña (o sin coincidencia), la primera visible con una pestaña del módulo.
 */
export function entradaDeDestino(
  permisos: PermisosSeccion,
  esMaster: boolean,
  destino: DestinoMenu,
  opciones: OpcionesMenu = {},
): EntradaVisible | null {
  const entradas = gruposDeMenu(permisos, esMaster, opciones).flatMap((g) => g.entradas);
  return (
    (destino.entrada ? entradas.find((e) => e.id === destino.entrada) : undefined) ??
    entradas.find((e) => entradaContiene(e, destino)) ??
    entradas.find((e) => e.pestanas.some((p) => p.modulo === destino.modulo)) ??
    null
  );
}

/**
 * Pestañas de una entrada para las pantallas (`EntradaPestanas`): solo las que
 * apuntan a una pestaña interna y sin repetir (las cuatro de Conexiones viven
 * en la misma pestaña de Configuración).
 */
export function pestanasDeEntrada(entrada: Pick<EntradaMenuPanel, "id" | "pestanas">): EntradaPestanas {
  const vistas = new Set<string>();
  const pestanas = entrada.pestanas.flatMap((p) => {
    if (!p.pestana) return [];
    const clave = `${p.modulo}/${p.pestana}`;
    if (vistas.has(clave)) return [];
    vistas.add(clave);
    return [{ tab: p.modulo, pestana: p.pestana, label: p.label, ...(p.oculta ? { oculta: true } : {}) }];
  });
  return { id: entrada.id, pestanas };
}

/**
 * Título del header para un destino: el nombre de la entrada del cajón por la
 * que se llegó (o la que lo contiene); sin entrada (p. ej. back del sistema,
 * sin pestaña), el del módulo.
 */
export function tituloDeDestino(destino: DestinoMenu): string {
  for (const grupo of MENU_PANEL) {
    const entrada = destino.entrada
      ? grupo.entradas.find((e) => e.id === destino.entrada)
      : grupo.entradas.find((e) => entradaContiene(e, destino));
    if (entrada) return entrada.label;
  }
  return MODULOS_PANEL[destino.modulo].label;
}
