export type RootStackParamList = {
  Login: undefined;
  Rutas: undefined;
  Dia: { rutaId: number; rutaNombre: string };
  Cliente: {
    rutaId: number;
    clienteId: number;
    nombre: string;
    latitud?: number;
    longitud?: number;
  };
};