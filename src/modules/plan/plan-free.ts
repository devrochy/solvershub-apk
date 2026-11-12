import type { PlanAdmin } from "@core/session/types";

/**
 * Recordatorio de plan Free en la app (HU-BILL-15). Lógica pura: el banner del header y la
 * tarjeta del centro de notificaciones comparten el mismo texto, y solo lo ve quien puede
 * contratar el plan (owner/master o colaborador con escritura en `plan`).
 */

export type AvisoDePlan = {
  tono: "warning" | "danger";
  titulo: string;
  texto: string;
  cta: string;
};

export const TEXTO_MEJORAR_PLAN = "Mejorar mi plan";

/** ¿El negocio está en Free (o sin suscripción)? */
export function esPlanFree(plan?: PlanAdmin | null): boolean {
  return !!plan && (!plan.has_plan || plan.plan_id === "free");
}

/** Solo quien puede pagar el plan: owner/master o colaborador con escritura en `plan`. */
export function puedeMejorarPlan(
  permisos: Record<string, string | null> | null | undefined,
  esMaster: boolean,
): boolean {
  return !esMaster && permisos?.plan === "write";
}

/** Texto del recordatorio; cambia a peligro cuando la prueba ya venció. */
export function avisoDePlanFree(plan?: PlanAdmin | null): AvisoDePlan | null {
  if (!esPlanFree(plan)) return null;
  const vencido =
    !plan?.has_plan ||
    plan?.status === "expired" ||
    plan?.status === "canceled" ||
    plan?.status === "past_due";
  if (vencido) {
    return {
      tono: "danger",
      titulo: "Tu plan Free terminó",
      texto: "Tu asistente dejó de atender clientes nuevos. Reactívalo con un plan pago y sigue operando.",
      cta: TEXTO_MEJORAR_PLAN,
    };
  }
  const dias = plan?.days_left;
  const restante =
    dias === 1
      ? "Te queda 1 día de prueba."
      : dias != null && dias > 0
        ? `Te quedan ${dias} días de prueba.`
        : "Tu prueba está por terminar.";
  return {
    tono: "warning",
    titulo: "Estás en el plan Free",
    texto: `${restante} Con un plan pago tienes más agentes, canales y crédito mensual.`,
    cta: TEXTO_MEJORAR_PLAN,
  };
}
