import type {
  CollaboratorItem,
  OutgoingItem,
} from "../api";

/** Acceso de una sección en la grilla (mismos valores que la API). */
export type Acceso = "none" | "read" | "write";

export const ACCESOS: { valor: Acceso; label: string }[] = [
  { valor: "none", label: "Sin acceso" },
  { valor: "read", label: "Ver" },
  { valor: "write", label: "Editar" },
];

const ROL: Record<string, string> = {
  master: "Master",
  owner: "Dueño",
  propietario: "Propietario",
  gestor: "Gestor",
  colaborador: "Colaborador",
  tester: "Tester",
};

const SECCION: Record<string, string> = {
  dashboard: "Resumen",
  leads: "Clientes",
  conversations: "Conversaciones",
  escalations: "Escalaciones",
  agents: "Agentes",
  connections: "Conexiones",
  plugins: "Habilidades",
  costs: "Costos LLM",
  plan: "Plan y consumo",
  settings: "Configuración",
  tenants: "Negocios",
  collaborators: "Equipo",
  qa: "Pruebas",
  pack_commerce: "Comercio",
  "pack_subscriptions:suscripciones": "Suscripciones",
};

const PACK: Record<string, string> = {
  pack_calendar: "Calendario",
  pack_cobranza: "Cobranza",
  pack_commerce: "Comercio",
  pack_subscriptions: "Suscripciones",
};

const SUBSECCION: Record<string, string> = {
  auditoria: "Auditoría",
  conexion: "Conexión",
  configuracion: "Configuración",
  tipos: "Tipos de cita",
};

/** Secciones que un dueño no puede otorgar: plataforma y gestión de cuentas. */
const NO_OTORGABLES_POR_EL_DUENO = new Set(["tenants", "qa", "collaborators"]);

/** Roles de plataforma: solo el master actúa sobre esas cuentas. */
const ROLES_DE_PLATAFORMA = new Set(["master", "tester"]);

function capitalizar(texto: string): string {
  const limpio = texto.replace(/[_-]+/g, " ").trim();
  if (!limpio) return texto;
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

export function rolLabel(rol: string | null | undefined): string {
  return (rol && ROL[rol]) || capitalizar(rol ?? "");
}

export function seccionLabel(clave: string | null | undefined): string {
  if (!clave) return "Sin sección";
  if (SECCION[clave]) return SECCION[clave];
  const match = /^(pack_[a-z]+):(.+)$/.exec(clave);
  if (!match) return capitalizar(clave);
  const [, pack, seccion] = match;
  const nombre = SUBSECCION[seccion] ?? capitalizar(seccion);
  return PACK[pack] ? `${PACK[pack]} · ${nombre}` : nombre;
}

export function accesoLabel(access: string): string {
  if (access === "write") return "escritura";
  if (access === "none") return "sin acceso";
  return "lectura";
}

export function vinculoLegible(link: { name: string; role: string }): string {
  return `${link.name} · ${rolLabel(link.role)}`;
}

export function esMasterDePlataforma(sesion: { role: string } | null | undefined): boolean {
  return sesion?.role === "master";
}

/**
 * ¿La sesión puede actuar sobre esta cuenta? El master, sobre todas. Un dueño no
 * toca cuentas de plataforma ni a otros dueños: la API lo rechazaría.
 */
export function puedeActuarSobre(fila: CollaboratorItem, esMaster: boolean): boolean {
  if (esMaster) return true;
  if (fila.is_platform_master || ROLES_DE_PLATAFORMA.has(fila.role)) return false;
  if (fila.is_self) return true;
  const esDueno = fila.role === "owner" || fila.links.some((link) => link.role === "owner");
  return !esDueno;
}

/** Secciones que se pueden otorgar o revocar desde esta sesión, ordenadas. */
export function seccionesOtorgables(
  permisos: Record<string, string | null> | null | undefined,
  esMaster: boolean,
): string[] {
  return Object.keys(permisos ?? {})
    .filter((seccion) => permisos?.[seccion] && (esMaster || !NO_OTORGABLES_POR_EL_DUENO.has(seccion)))
    .sort();
}

/** Aviso tras el alta según lo que hizo la API (`resultado` de `POST /admin/collaborators`). */
export function mensajeDeAlta(resultado: string | undefined): string {
  if (resultado === "invitado") {
    return "Ese correo ya tiene cuenta: se le envió una invitación al negocio.";
  }
  return "Cuenta creada. Ya puede entrar con la contraseña que definiste.";
}

export interface ResumenEquipo {
  total: number;
  activas: number;
  pendientes: number;
}

export function resumenEquipo(
  filas: CollaboratorItem[],
  invitaciones: OutgoingItem[],
): ResumenEquipo {
  return {
    total: filas.length,
    activas: filas.filter((fila) => fila.active).length,
    pendientes: invitaciones.length,
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Error en español para el correo, o `null` si es válido. */
export function validarEmail(email: string): string | null {
  if (!email.trim()) return "Escribe el correo del colaborador.";
  if (!EMAIL_RE.test(email.trim())) {
    return "Escribe un correo válido, por ejemplo ana@correo.com.";
  }
  return null;
}

/** Error en español para el usuario, o `null` si es válido. */
export function validarUsername(username: string): string | null {
  const limpio = username.trim();
  if (!limpio) return "Escribe un nombre de usuario.";
  if (limpio.length < 3) return "Mínimo 3 caracteres: letras, números, puntos, guiones.";
  if (!/^[a-z0-9._-]+$/i.test(limpio)) {
    return "Solo letras, números, puntos, guiones y guiones bajos.";
  }
  return null;
}

/** Error en español para la contraseña, o `null` si es válida. */
export function validarPassword(password: string): string | null {
  if (password.length < 8) return "Mínimo 8 caracteres.";
  return null;
}

/** Error de la API que representa el tope de colaboradores del plan. */
export function esLimiteDePlan(code: string | undefined): boolean {
  return code === "plan_limit_colaboradores";
}
