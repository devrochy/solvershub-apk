import type { NavigatorScreenParams } from "@react-navigation/native";

export type RootTabParamList = {
  Ruta: undefined;
  Dia: undefined;
  Clientes: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  SeleccionRuta: undefined;
  Main: NavigatorScreenParams<RootTabParamList> | undefined;
  Cliente: {
    rutaId: number;
    clienteId: number;
    nombre: string;
    latitud?: number;
    longitud?: number;
    latitudDomicilio?: number;
    longitudDomicilio?: number;
    prestamoAutoSeleccionado?: boolean;
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