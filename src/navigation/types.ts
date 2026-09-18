export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  Cartera: { seccion?: "Cartera" | "TrayectoDiario" | "Clientes" } | undefined;
  Perfil: undefined;
  Configuracion: undefined;
  Notificaciones: undefined;
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
