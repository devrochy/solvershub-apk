import { Linking } from "react-native";
import { emitirNavegacion } from "@shared/navegacion-evento";
import type { KpiPolarity } from "@shared/ui";
import type { KpiResumen } from "./api";
import { destinoDeResumen, urlDeResumen } from "./destinos";
import { versusDeDias } from "./periodos";

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

/** «frente a los 7 días anteriores», pero «frente al mes anterior» (nunca «a el»). */
function frenteA(versus: string): string {
  return versus.startsWith("el ") ? `frente al ${versus.slice(3)}` : `frente a ${versus}`;
}

export interface PropsDeKpi {
  label: string;
  value: string;
  delta?: number;
  period?: string;
  hint?: string;
  polarity: KpiPolarity;
  onPress?: () => void;
}

/**
 * Props de `KpiTile` para un KPI del Resumen: valor, variación con su polaridad y enlace.
 * Si la app no tiene la pantalla, abre la del panel; así ninguna cifra queda muerta.
 */
export function propsDeKpi(
  k: KpiResumen,
  opciones: { dias?: number; tenantId?: string | null } = {},
): PropsDeKpi {
  const dias = opciones.dias ?? 7;
  const tenantId = opciones.tenantId ?? null;
  const destino = destinoDeResumen(k.destino);
  const url = destino ? null : urlDeResumen(k.destino, tenantId);
  const hayDelta = k.delta_pct !== null && k.delta_pct !== undefined;
  return {
    label: k.label,
    value: valorDeKpi(k),
    delta: hayDelta ? k.delta_pct! : undefined,
    period: hayDelta ? frenteA(k.versus ?? versusDeDias(dias)) : undefined,
    hint: k.hint ?? undefined,
    polarity: k.polaridad,
    onPress: destino
      ? () => emitirNavegacion(destino)
      : url
        ? () => void Linking.openURL(url)
        : undefined,
  };
}
