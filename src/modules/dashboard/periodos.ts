/** Ventanas del Resumen (ADR-0171, adenda): 7, 15 o 30 días. */
export const DIAS_DEL_RESUMEN = [7, 15, 30] as const;
export type DiasDelResumen = (typeof DIAS_DEL_RESUMEN)[number];
export const DIAS_POR_DEFECTO: DiasDelResumen = 7;

export function diasValidos(valor: string | number | undefined): DiasDelResumen {
  const n = Number(valor);
  return DIAS_DEL_RESUMEN.find((d) => d === n) ?? DIAS_POR_DEFECTO;
}

export function etiquetaDeDias(dias: number): string {
  return `${dias} días`;
}

export function versusDeDias(dias: number): string {
  return `los ${dias} días anteriores`;
}

const fecha = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short" });

export function rangoDePeriodo(periodo: { desde?: string; hasta?: string }): string {
  if (!periodo.desde || !periodo.hasta) return "";
  return `${fecha.format(new Date(periodo.desde))} – ${fecha.format(new Date(periodo.hasta))}`;
}
