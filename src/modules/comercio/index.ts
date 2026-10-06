import { registrarDespachadorComercio } from "./offline";

export { ComercioScreen } from "./screens/ComercioScreen";
export { cambiarEstadoPedidoConOffline, registrarDespachadorComercio } from "./offline";
export * from "./api";

// Registra el despachador de escrituras encoladas al cargar el módulo.
registrarDespachadorComercio();
