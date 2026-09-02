import type { CuotaEstatus } from "../../types/cobrador";

export type TipoCuotaCanvas =
  | "pagada"
  | "en_mora"
  | "actual"
  | "futura"
  | "abonada";

export interface CuotaCanvas {
  cuotaId: number;
  numeroCuota: number;
  valorEsperado: number;
  fechaVencimiento: string;
  estatus: CuotaEstatus;
  abonosAcumulados: number;
  saldoPendiente: number;
}

export interface CuotaCanvasClasificada extends CuotaCanvas {
  tipo: TipoCuotaCanvas;
}

/**
 * Clasifica las cuotas de un préstamo para el canvas visual:
 * - pagada: cuota pagada por completo.
 * - actual: primera cuota no pagada con saldo pendiente (la que toca pagar).
 * - en_mora: cuotas atrasadas posteriores a la actual (ya vencidas).
 * - futura: cuotas pendientes posteriores a la actual (aún por vencer).
 * - abonada: cuota pendiente totalmente abonada (abonos FIFO).
 */
export function clasificarCuotas(cuotas: CuotaCanvas[]): CuotaCanvasClasificada[] {
  const indiceActual = cuotas.findIndex(
    (c) => c.estatus !== "pagada" && c.saldoPendiente > 0,
  );

  return cuotas.map((cuota, indice) => {
    if (cuota.estatus === "pagada") {
      return { ...cuota, tipo: "pagada" };
    }
    if (indice === indiceActual) {
      return { ...cuota, tipo: "actual" };
    }
    if (cuota.saldoPendiente === 0) {
      return { ...cuota, tipo: "abonada" };
    }
    if (cuota.estatus === "atrasada") {
      return { ...cuota, tipo: "en_mora" };
    }
    return { ...cuota, tipo: "futura" };
  });
}