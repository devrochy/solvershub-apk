import type { PropsDeEstacionDelAgente } from "@shared/ruta/estacion-del-agente";
import { EstacionDatosDelCliente } from "./EstacionDatosDelCliente";
import { EstacionDatosParaProbar } from "./EstacionDatosParaProbar";
import { EstacionHabilidades } from "./EstacionHabilidades";

/**
 * Las estaciones 2 a 4 de la «Ruta de lanzamiento» sobre el agente ya creado (HU-APP-23). Las usan Nuevo agente
 * y, por la navegación, la bienvenida (`RecorridoScreen`), que no puede importar este módulo.
 */
export function EstacionDelAgente(props: PropsDeEstacionDelAgente) {
  if (props.estacion === "habilidades") return <EstacionHabilidades key={props.agenteId} {...props} />;
  if (props.estacion === "datos-cliente") return <EstacionDatosDelCliente key={props.agenteId} {...props} />;
  return <EstacionDatosParaProbar key={props.agenteId} {...props} />;
}
