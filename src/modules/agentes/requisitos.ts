import type { DestinoNavegacion } from "@shared/navegacion-evento";
import type { RequisitoDeAgente } from "./api";

export interface CopiaDeRequisito {
  titulo: string;
  descripcion: string;
  /** Texto del atajo, o `null` si la app no tiene esa pantalla (se hace desde el panel web). */
  accion: string | null;
  destino: DestinoNavegacion | null;
}

/**
 * «Falta configurar» en lenguaje de negocio (como el panel web, HU-AOS-50). El atajo lleva a la
 * pantalla de la app que lo resuelve; si no la tiene, se avisa que se hace en el panel web y no se
 * duplica la pantalla (HU-AOS-56).
 */
export function copiaDelRequisito(r: RequisitoDeAgente): CopiaDeRequisito {
  if (r.kind === "sin_contenido" && r.content === "catalogo") {
    return {
      titulo: "Carga tu catálogo",
      descripcion: "Agrega los productos que tu asistente puede ofrecer y cotizar.",
      accion: "Cargar productos",
      destino: { tab: "comercio", pestana: "productos" },
    };
  }
  if (r.kind === "sin_contenido" && r.content === "servicios") {
    return {
      titulo: "Define tus tipos de cita",
      descripcion: "Crea los servicios que tu asistente puede agendar.",
      accion: "Crear tipos de cita",
      destino: { tab: "calendario", pestana: "tipos" },
    };
  }
  if (r.kind === "sin_contenido" && r.content === "cartera") {
    return {
      titulo: "Carga tu cartera",
      descripcion: "Registra los clientes y préstamos que tu asistente va a atender.",
      accion: "Abrir Cobranza",
      destino: { tab: "cobranza" },
    };
  }
  return {
    titulo: `Configura ${r.title}`,
    descripcion: r.explanation || "Completa sus datos para que tu agente la pueda usar. Se hace desde el panel web.",
    accion: null,
    destino: null,
  };
}
