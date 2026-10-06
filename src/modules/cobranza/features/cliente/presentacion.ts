import { conAlfa } from "@core/theme/alpha";
import { shColor } from "@core/theme/tokens";
import type { TipoCuotaCanvas } from "../prestamo/canvas-cuotas";

/**
 * Presentación de la ficha del cliente: colores/etiquetas del canvas de cuotas
 * y helpers de formato (extraídos de `ClienteScreen` en HU-APP-07 para que la
 * lógica pura tenga pruebas propias).
 */

export const COLORES_CANVAS: Record<TipoCuotaCanvas, { fondo: string; borde: string }> = {
  pagada: { fondo: conAlfa(shColor.success, 0.12), borde: shColor.success },
  actual: { fondo: conAlfa(shColor.blue["500"], 0.2), borde: shColor.navy["700"] },
  en_mora: { fondo: conAlfa(shColor.danger, 0.12), borde: shColor.danger },
  futura: { fondo: shColor.frost, borde: shColor.slate["300"] },
  abonada: { fondo: conAlfa(shColor.warning, 0.15), borde: shColor.warning },
};

export const ETIQUETA_CANVAS: Record<TipoCuotaCanvas, string> = {
  pagada: "Pagada",
  actual: "Cuota actual",
  en_mora: "En mora",
  futura: "Futura",
  abonada: "Abonada",
};

/** Una cuota es accionable (registrar pago/abono) si está pendiente o atrasada. */
export function esPendienteOAtrasada(estatus: string): boolean {
  return estatus === "pendiente" || estatus === "atrasada";
}

/** `2026-10-06T14:30:00Z` → `2026-10-06 14:30` (local). Fecha inválida → texto tal cual. */
export function formatearFechaHora(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
