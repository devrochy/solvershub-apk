import { emitirNavegacion } from "@shared/navegacion-evento";
import type { KpiPolarity } from "@shared/ui";
import type { KpiResumen } from "./api";
import { destinoDeResumen } from "./destinos";

/** Contra qué se compara cuando el backend no lo dice: la ventana anterior del Resumen. */
const VERSUS_POR_DEFECTO = "los 7 días anteriores";

const SIN_DATO = "—";

const numero = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });
const pesos = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });
const dolares = new Intl.NumberFormat("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** El valor listo para mostrar: «—» cuando el backend no tiene datos suficientes. */
export function valorDeKpi(k: Pick<KpiResumen, "valor" | "unidad">): string {
  if (k.valor === null || k.valor === undefined) return SIN_DATO;
  switch (k.unidad) {
    case "pct":
      return `${numero.format(k.valor)} %`;
    case "usd":
      return `US$ ${dolares.format(k.valor)}`;
    case "money":
      return `$ ${pesos.format(k.valor)}`;
    case "ms":
      return k.valor >= 1000 ? `${numero.format(k.valor / 1000)} s` : `${pesos.format(k.valor)} ms`;
    default:
      return numero.format(k.valor);
  }
}

export interface PropsDeKpi {
  label: string;
  value: string;
  delta?: number;
  period?: string;
  polarity: KpiPolarity;
  onPress?: () => void;
}

/** Props de `KpiTile` para un KPI del Resumen: valor, variación con su polaridad y enlace. */
export function propsDeKpi(k: KpiResumen): PropsDeKpi {
  const destino = destinoDeResumen(k.destino);
  const hayDelta = k.delta_pct !== null && k.delta_pct !== undefined;
  return {
    label: k.label,
    value: valorDeKpi(k),
    delta: hayDelta ? k.delta_pct! : undefined,
    period: hayDelta ? `frente a ${k.versus ?? VERSUS_POR_DEFECTO}` : undefined,
    polarity: k.polaridad,
    onPress: destino ? () => emitirNavegacion(destino) : undefined,
  };
}
