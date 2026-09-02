import type { NavigatorScreenParams } from "@react-navigation/native";

export type RootTabParamList = {
  Rutas: undefined;
  Clientes: undefined;
  Dia: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  Main: NavigatorScreenParams<RootTabParamList> | undefined;
  Cliente: {
    rutaId: number;
    clienteId: number;
    nombre: string;
    latitud?: number;
    longitud?: number;
  };
  Prestamo: {
    rutaId: number;
    prestamoId: number;
    clienteNombre: string;
    telefonoWhatsapp: string;
    valor: number;
    numCuotas: number;
  };
};