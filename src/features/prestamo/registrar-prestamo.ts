export interface CamposPrestamo {
  valor: string;
  numCuotas: string;
  diasEntreCuotas: string;
  tipoInteres?: string;
}

/** Valida los campos del formulario de nuevo préstamo; devuelve el error o null. */
export function validarPrestamo(campos: CamposPrestamo): string | null {
  const valor = Number(campos.valor);
  if (!campos.valor.trim() || !Number.isFinite(valor) || valor <= 0) {
    return "Ingresa un valor de préstamo válido.";
  }
  const numCuotas = Number(campos.numCuotas);
  if (!Number.isInteger(numCuotas) || numCuotas < 1) {
    return "El número de cuotas debe ser al menos 1.";
  }
  const dias = Number(campos.diasEntreCuotas);
  if (!Number.isInteger(dias) || dias < 1) {
    return "Los días entre cuotas deben ser al menos 1.";
  }
  if (campos.tipoInteres?.trim()) {
    const interes = Number(campos.tipoInteres);
    if (!Number.isFinite(interes) || interes <= 0) {
      return "El tipo de interés debe ser mayor que 0.";
    }
  }
  return null;
}