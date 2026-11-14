import type { components } from "@core/api/schema";
import type { AdminSesion } from "@core/session/types";

/**
 * Reglas de la sección Seguridad de la app (HU-ACC-05, ADR-0174). Espejo de las del panel:
 * solo se ofrece lo que la API acepta ("nunca un 403 por diseño").
 */
export type DispositivoAcceso = components["schemas"]["AccessDeviceOut"];
export type EventoAcceso = components["schemas"]["AccessEventOut"];
export type PoliticaAcceso = components["schemas"]["AccessPolicyOut"];
export type EstadoDispositivo = DispositivoAcceso["estado"];

export const ESTADOS: EstadoDispositivo[] = ["pendiente", "activo", "bloqueado"];

export const ETIQUETA_ESTADO: Record<EstadoDispositivo, string> = {
  pendiente: "Pendiente",
  activo: "Activo",
  bloqueado: "Bloqueado",
};

export const TIPO_EVENTO: Record<EventoAcceso["tipo"], string> = {
  login_fallido: "Intento de acceso fallido",
  login_bloqueado: "Acceso bloqueado por intentos",
  dispositivo_nuevo: "Equipo nuevo",
  dispositivo_pendiente: "Equipo pendiente de aprobación",
  dispositivo_aprobado: "Equipo aprobado",
  dispositivo_bloqueado_usado: "Equipo bloqueado intentó entrar",
  acceso_denegado_politica: "Acceso denegado por la política",
  dispositivo_sin_id: "Equipo sin identificador",
  dispositivo_compartido: "Equipo usado por varias cuentas",
  politica_cambiada: "Política cambiada",
  acceso_master: "Acceso del administrador de plataforma",
  legado_pack: "Intento del registro anterior",
};

export const ETIQUETA_SEVERIDAD: Record<EventoAcceso["severidad"], string> = {
  info: "Informativo",
  aviso: "Aviso",
  critico: "Crítico",
};

export const ETIQUETA_POLITICA: Record<PoliticaAcceso["owner"], string> = {
  abierto: "Abierto",
  restringido: "Restringido",
};

const ROL: Record<string, string> = {
  owner: "Dueño",
  colaborador: "Colaborador",
  gestor: "Gestor",
  master: "Administrador de plataforma",
};

export function rolDelDispositivo(d: Pick<DispositivoAcceso, "rol_al_registrar" | "cuenta">): string {
  return ROL[d.rol_al_registrar ?? d.cuenta?.rol ?? ""] ?? "—";
}

export function nombreDelEquipo(d: Pick<DispositivoAcceso, "device_label" | "plataforma" | "legacy">): string {
  if (d.device_label?.trim()) return d.device_label.trim();
  if (d.legacy) return "Equipo del registro anterior";
  return d.plataforma === "ios" ? "iPhone" : "Android";
}

export type AccionDispositivo = "aprobar" | "reactivar" | "bloquear" | "dar-de-baja";

export interface ContextoDeAcciones {
  puedeEscribir: boolean;
  esDuenoOMaster: boolean;
  miAdminId: string | null;
}

export function contextoDeAcciones(sesion: AdminSesion | null): ContextoDeAcciones {
  if (!sesion) return { puedeEscribir: false, esDuenoOMaster: false, miAdminId: null };
  const esDuenoOMaster =
    sesion.role === "master" || sesion.role === "tester" || sesion.tenantRole === "owner";
  return {
    puedeEscribir: esDuenoOMaster || sesion.permissions?.devices === "write",
    esDuenoOMaster,
    miAdminId: sesion.adminId,
  };
}

/**
 * Pendiente: aprobar y dar de baja. Activo: bloquear y dar de baja. Bloqueado: solo reactivar
 * (darlo de baja haría desaparecer el bloqueo con la política abierta). Nadie aprueba ni reactiva
 * su propio equipo, y los equipos de un dueño solo los gestiona un dueño.
 */
export function accionesDeDispositivo(d: DispositivoAcceso, ctx: ContextoDeAcciones): AccionDispositivo[] {
  if (!ctx.puedeEscribir) return [];
  if (d.cuenta?.rol === "owner" && !ctx.esDuenoOMaster) return [];
  const propio = ctx.miAdminId !== null && d.cuenta?.id === ctx.miAdminId;
  switch (d.estado) {
    case "pendiente":
      return propio ? ["dar-de-baja"] : ["aprobar", "dar-de-baja"];
    case "activo":
      return ["bloquear", "dar-de-baja"];
    case "bloqueado":
      return propio ? [] : ["reactivar"];
  }
}

export const ETIQUETA_ACCION: Record<AccionDispositivo, string> = {
  aprobar: "Aprobar",
  reactivar: "Reactivar",
  bloquear: "Bloquear",
  "dar-de-baja": "Dar de baja",
};

export const TEXTO_DE_CONFIRMACION: Record<AccionDispositivo, string> = {
  aprobar: "El equipo podrá entrar a la app de inmediato.",
  reactivar: "El equipo vuelve a poder entrar a la app.",
  bloquear: "La cuenta no podrá entrar con este equipo hasta que lo reactives.",
  "dar-de-baja":
    "El equipo sale de la lista. Si la política del rol es «Restringido», tendrá que registrarse otra vez y quedar pendiente.",
};

/** Una acción rechazada, con una frase que dice cómo seguir. */
export function mensajeDeAccionRechazada(status: number, code: string): string {
  if (status === 409 && code === "estado_desactualizado") {
    return "Este equipo cambió mientras lo mirabas. Se actualizó la lista; revisa su estado y vuelve a intentarlo.";
  }
  return "No se pudo completar la acción. Inténtalo de nuevo.";
}
