import { kitDeTema } from "@shared/ui";
import type { DetalleCuotaPublic, EstadoCuentaPrestamoPublic } from "@shared/types/gestor";
import type { TipoCuotaCanvas } from "../prestamo/canvas-cuotas";

/**
 * Presentación de la ficha del cliente: colores/etiquetas del canvas de cuotas
 * y helpers de formato (extraídos de `ClienteScreen` en HU-APP-07 para que la
 * lógica pura tenga pruebas propias).
 */

/**
 * El canvas de cuotas se comparte como imagen por WhatsApp y siempre es claro
 * (fondo blanco), así que sus colores salen del tema claro del kit en los dos
 * temas de la app (HU-DS-10). `borde` también es el color del texto de la
 * etiqueta: son los `statusXFg`, que dan AA sobre el fondo pastel.
 */
export const CANVAS = kitDeTema("claro");

const { tonos } = CANVAS;

export const COLORES_CANVAS: Record<TipoCuotaCanvas, { fondo: string; borde: string }> = {
  pagada: { fondo: tonos.success.bg, borde: tonos.success.fg },
  actual: { fondo: tonos.info.bg, borde: tonos.info.fg },
  en_mora: { fondo: tonos.danger.bg, borde: tonos.danger.fg },
  futura: { fondo: CANVAS.c.surface2, borde: CANVAS.c.textMuted },
  abonada: { fondo: tonos.warning.bg, borde: tonos.warning.fg },
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

/**
 * Detalle de una cuota armado con lo que ya trajo el estado de cuenta (el canvas),
 * para cuando no hay señal: sin esto el gestor no llegaba al formulario de pago y no
 * podía cobrar en la calle. Los pagos, abonos y la última visita no vienen en el
 * estado de cuenta, así que quedan vacíos. `null` si la cuota no está.
 */
export function detalleDesdeEstadoCuenta(
  estado: EstadoCuentaPrestamoPublic | null,
  cuotaId: string,
): DetalleCuotaPublic | null {
  const cuota = estado?.cuotas.find((c) => c.cuotaId === cuotaId);
  if (!cuota) {
    return null;
  }
  return { ...cuota, pagos: [], abonos: [], ultimaVisita: null };
}

/**
 * `2026-10-13` → `13/10`: la casilla del canvas mide un cuarto del ancho y la fecha
 * completa se partía en dos renglones. Otro formato → texto tal cual.
 */
export function fechaCortaCuota(fecha: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(fecha);
  return m ? `${m[3]}/${m[2]}` : fecha;
}
