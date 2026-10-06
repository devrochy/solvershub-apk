const FORMATO_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;

function hoyLocal(): string {
  const ahora = new Date();
  const anio = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, "0");
  const dia = String(ahora.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

/**
 * Valida una fecha prometida (opcional) en formato YYYY-MM-DD, que exista
 * realmente (rechaza p. ej. 2026-02-30) y no esté en el pasado (local).
 * Devuelve un mensaje de error o null si es válida/vacía.
 */
export function validarFechaPrometida(fecha: string): string | null {
  const valor = fecha.trim();
  if (!valor) {
    return null;
  }
  const match = FORMATO_FECHA.exec(valor);
  if (!match) {
    return "Formato de fecha inválido (usa AAAA-MM-DD).";
  }
  const anio = Number(match[1]);
  const mes = Number(match[2]);
  const dia = Number(match[3]);
  const fechaLocal = new Date(anio, mes - 1, dia);
  if (
    fechaLocal.getFullYear() !== anio ||
    fechaLocal.getMonth() !== mes - 1 ||
    fechaLocal.getDate() !== dia
  ) {
    return "La fecha no existe (revisa día y mes).";
  }
  if (valor < hoyLocal()) {
    return "La fecha prometida debe ser futura.";
  }
  return null;
}

export function validarMonto(monto: number): string | null {
  if (!Number.isFinite(monto) || monto <= 0) {
    return "Ingresa un monto válido (mayor que 0).";
  }
  return null;
}

/**
 * Valida que el monto no supere un tope (saldo pendiente de la cuota o del
 * préstamo). `tope = null` significa "sin tope" (no valida). Tolerancia de
 * 0.001 para evitar falsos positivos por decimales.
 */
export function validarMontoContraTope(monto: number, tope: number | null): string | null {
  if (tope !== null && Number.isFinite(monto) && monto > tope + 0.001) {
    return `El monto no puede superar el saldo pendiente (${tope}).`;
  }
  return null;
}

/** Valida un teléfono de WhatsApp: al menos 7 dígitos. */
export function validarTelefonoWhatsapp(telefono: string): string | null {
  const digitos = telefono.replace(/\D/g, "");
  if (digitos.length < 7) {
    return "Ingresa un teléfono válido (al menos 7 dígitos).";
  }
  return null;
}