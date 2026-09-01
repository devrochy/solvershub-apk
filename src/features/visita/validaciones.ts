const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

function hoyIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Valida una fecha prometida (opcional) en formato YYYY-MM-DD y no en el
 * pasado. Devuelve un mensaje de error o null si es válida/vacía.
 */
export function validarFechaPrometida(fecha: string): string | null {
  const valor = fecha.trim();
  if (!valor) {
    return null;
  }
  if (!FORMATO_FECHA.test(valor) || Number.isNaN(Date.parse(`${valor}T00:00:00`))) {
    return "Formato de fecha inválido (usa AAAA-MM-DD).";
  }
  if (valor < hoyIso()) {
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