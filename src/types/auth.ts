export interface LoginResult {
  accessToken: string;
  refreshToken: string;
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