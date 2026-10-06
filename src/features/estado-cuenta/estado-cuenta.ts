import type {
  ClienteTarjetaPublic,
  PrestamoPublic,
} from "@shared/types/gestor";

/**
 * Texto legible del estado de cuenta de un préstamo (HU-54): por cada cuota
 * muestra número, valor y estatus; cierra con el saldo pendiente. Se envía por
 * WhatsApp con wa.me.
 */
export function textoReportePrestamo(
  prestamo: PrestamoPublic,
  tarjeta: ClienteTarjetaPublic,
): string {
  const lineas = [
    `Estado de cuenta de ${tarjeta.nombre}`,
    `Préstamo ${prestamo.id} — $${prestamo.valor}, ${prestamo.numCuotas} cuotas`,
    ...prestamo.cuotas.map(
      (c) => `Cuota ${c.numeroCuota}: ${c.valorEsperado} (${c.estatus})`,
    ),
    `Saldo pendiente: ${tarjeta.saldoPendiente}`,
    `Mora: ${tarjeta.diasMora} días`,
  ];
  return lineas.join("\n");
}

/** Número para wa.me: sin "+", espacios ni caracteres no numéricos. */
export function numeroWhatsApp(telefono: string): string {
  return telefono.replace(/[^\d]/g, "");
}

/** Enlace wa.me con el texto codificado (reporte del préstamo). */
export function enlaceWhatsApp(telefono: string, texto: string): string {
  return `https://wa.me/${numeroWhatsApp(telefono)}?text=${encodeURIComponent(texto)}`;
}