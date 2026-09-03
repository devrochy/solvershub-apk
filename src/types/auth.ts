export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  cobrador?: {
    id: number;
    usuario: string;
    nombre: string;
    apellido: string;
  };
  socio?: {
    id: number;
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