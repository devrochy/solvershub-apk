import type { NavigatorScreenParams } from "@react-navigation/native";

/** Tabs del flujo de ruta (a pantalla completa, sin menú principal). */
export type RootTabParamList = {
  Ruta: undefined;
  Dia: undefined;
  Clientes: undefined;
};

/** Tabs principales de la app (menú inferior). */
export type MainTabParamList = {
  Perfil: undefined;
  Rutas: undefined;
  Configuracion: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  Ruta: undefined;
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