export type RootStackParamList = {
  Login: undefined;
  VincularDispositivo: undefined;
  Main: undefined;
  Cartera: { seccion?: "Cartera" | "TrayectoDiario" | "Clientes" } | undefined;
  Perfil: undefined;
  Configuracion: undefined;
  Notificaciones: undefined;
  Cliente: {
    carteraId: string;
    clienteId: string;
    nombre: string;
    latitud?: number;
    longitud?: number;
    latitudDomicilio?: number;
    longitudDomicilio?: number;
    prestamoAutoSeleccionado?: boolean;
  };
  Prestamo: {
    carteraId: string;
    prestamoId: string;
    clienteNombre: string;
    telefonoWhatsapp: string;
    valor: number;
    numCuotas: number;
  };
};
