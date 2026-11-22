/**
 * Historial por plan (HU-BILL-25; app en HU-BILL-27): una conversación más vieja que el historial del plan
 * responde 409 `plan_feature_not_included` con `details = {feature: "historial", plan, historial_dias}`.
 * Nada se borró: al mejorar el plan se ve de nuevo. Lógica pura, igual que el aviso del panel.
 */

export type AvisoDeHistorial = { titulo: string; descripcion: string };

/** El aviso en palabras si el error es el 409 de historial; `null` si es otro error. */
export function avisoDeHistorial(
  error: { code?: string | null; details?: Record<string, unknown> | null } | null | undefined,
): AvisoDeHistorial | null {
  if (!error || error.code !== "plan_feature_not_included" || error.details?.feature !== "historial") return null;
  const dias = error.details?.historial_dias;
  if (typeof dias === "number" && dias > 0) {
    const n = dias === 1 ? "1 día" : `${dias} días`;
    return {
      titulo: `Esta conversación es de hace más de ${n}`,
      descripcion: `Tu plan muestra ${n} de historial. No se borró nada: al mejorar tu plan la vuelves a ver.`,
    };
  }
  return {
    titulo: "Esta conversación es más antigua que el historial de tu plan",
    descripcion: "No se borró nada: al mejorar tu plan la vuelves a ver.",
  };
}
