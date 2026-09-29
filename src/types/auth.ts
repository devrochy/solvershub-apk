export type RolCampo = "gestor" | "propietario" | "master";

export interface Perfil {
  id: string;
  usuario: string;
  nombre: string;
  apellido: string;
}

export interface Negocio {
  slug: string;
  nombre: string;
  rol: RolCampo;
}

export interface Invitacion {
  id: string;
  slug: string;
  nombre: string;
  rol: string;
}

/** Login unificado (ADR-0081). Los tokens solo llegan cuando hay negocio elegido. */
export interface LoginResult {
  accessToken?: string;
  refreshToken?: string;
  rol?: RolCampo;
  perfil?: Perfil;
  tenantSlug?: string;
  tenantNombre?: string;
  /** Autovinculación de dispositivo (HU-39/43). */
  telefono?: string;
  dispositivoVinculado?: boolean;
  estadoDispositivo?: "none" | "pendiente" | "activo" | "bloqueado";
  requiereVinculacion?: boolean;
  /** El usuario pertenece a varios negocios: hay que elegir. */
  seleccionRequerida?: boolean;
  negocios?: Negocio[];
  /** El usuario no tiene membresías activas pero sí invitaciones pendientes. */
  requiereMembresia?: boolean;
  membresiaToken?: string;
  invitaciones?: Invitacion[];
  /** Compatibilidad (payload anterior por rol). */
  gestor?: Perfil;
  propietario?: Perfil;
}

export interface RefreshResult {
  accessToken: string;
  refreshToken: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}
