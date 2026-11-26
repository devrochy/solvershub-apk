import type { ReactNode } from "react";
import type { RegistroDePrueba } from "../carga-de-datos/carga";
import type { TipoDeNegocio } from "../ruta-de-lanzamiento";

/**
 * Contrato de las estaciones 2 a 4 de la «Ruta de lanzamiento» (HU-APP-23), que escriben sobre el agente ya
 * creado. Las construye el módulo `agentes` (su API vive en `agentes/api.ts`); la bienvenida (`onboarding`) no
 * puede importarlo (ADR-APP-01), así que las recibe por este contrato desde la navegación, que compone los dos.
 */
export type EstacionDelAgenteId = "habilidades" | "datos-cliente" | "datos-probar";

/** Cómo deja la estación su trabajo guardado antes de seguir: `true` si se puede avanzar. */
export type GuardarEstacion = () => Promise<boolean>;

export interface PropsDeEstacionDelAgente {
  estacion: EstacionDelAgenteId;
  agenteId: string;
  tipo: TipoDeNegocio | null;
  nombre: string;
  negocio: string;
  /** La estación registra cómo se guarda; el pie fijo de la ruta lo llama con «Guardar y seguir». */
  registrarGuardar: (guardar: GuardarEstacion | null) => void;
  /** Lo que quedó en la estación, para «Revisar y publicar» («4 de 5 encendidas»). */
  onResumen: (estacion: EstacionDelAgenteId, resumen: string) => void;
  /** Lo cargado en «Datos para probar», para el chat. */
  onCargados: (registros: RegistroDePrueba[]) => void;
  /** «Seguir sin datos» (estación 4 fuera de test): pasa a la estación 5. */
  onSeguir: () => void;
  /**
   * Trae a la vista un aviso de la estación (p. ej. «Se cortó la conexión…» tras «Guardar y seguir»): `y` es su
   * posición dentro de la estación; la ruta, dueña del scroll, se desplaza hasta ahí.
   */
  mostrarAviso?: (y: number) => void;
}

export type EstacionDelAgente = (props: PropsDeEstacionDelAgente) => ReactNode;
