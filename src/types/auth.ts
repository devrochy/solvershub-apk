export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  /** Autovinculación de dispositivo (HU-39/43). */
  telefono?: string;
  dispositivoVinculado?: boolean;
  estadoDispositivo?: "none" | "pendiente" | "activo" | "bloqueado";
  requiereVinculacion?: boolean;
  gestor?: {
    id: string;
    usuario: string;
    nombre: string;
    apellido: string;
  };
  propietario?: {
    id: string;
    usuario: string;
    nombre: string;
    apellido: string;
  };
}

export interface RefreshResult {
  accessToken: string;
  refreshToken: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}