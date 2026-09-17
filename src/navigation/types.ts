import type { NavigatorScreenParams } from "@react-navigation/native";

/** Tabs del flujo de cartera (a pantalla completa, sin menú principal). */
export type RootTabParamList = {
  Cartera: undefined;
  TrayectoDiario: undefined;
  Clientes: undefined;
};

/** Tabs principales de la app (menú inferior). */
export type MainTabParamList = {
  Perfil: undefined;
  Carteras: undefined;
  Configuracion: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  Cartera: undefined;
  Cliente: {
    carteraId: number;
    clienteId: number;
    nombre: string;
    latitud?: number;
    longitud?: number;
    latitudDomicilio?: number;
    longitudDomicilio?: number;
    prestamoAutoSeleccionado?: boolean;
  };
  Prestamo: {
    carteraId: number;
    prestamoId: number;
    clienteNombre: string;
    telefonoWhatsapp: string;
    valor: number;
    numCuotas: number;
  };
};