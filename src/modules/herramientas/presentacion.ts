import type { IconName } from "@shared/ui";

import type { PlatformTenant } from "./api";

export type TonoDePlan = "neutral" | "accent" | "success" | "warning" | "danger";

export interface EstadoDelPlan {
  label: string;
  tone: TonoDePlan;
  icon: IconName;
}

/**
 * Estado de la suscripción de un negocio (`/admin/platform/tenants`). El backend usa
 * `active`, `trialing`, `past_due`, `expired` y `canceled`; sin suscripción llega
 * `sin_suscripcion`. «Vigente» evita confundirlo con el estado del negocio.
 */
export const ESTADOS_DEL_PLAN: Record<string, { label: string; tone: TonoDePlan; icon: IconName }> = {
  active: { label: "Vigente", tone: "success", icon: "check-circle" },
  trialing: { label: "En prueba", tone: "accent", icon: "schedule" },
  past_due: { label: "Pago pendiente", tone: "warning", icon: "schedule" },
  expired: { label: "Vencida", tone: "danger", icon: "error-outline" },
  canceled: { label: "Cancelada", tone: "neutral", icon: "cancel" },
  sin_suscripcion: { label: "Sin plan", tone: "neutral", icon: "remove-circle-outline" },
};

/** Plan y estado de suscripción listos para el badge de la tarjeta. */
export function estadoDelPlan(
  tenant: Pick<PlatformTenant, "status" | "plan_name" | "plan_status" | "operational">,
): EstadoDelPlan {
  const sinPlan =
    !tenant.plan_name ||
    tenant.plan_name === "—" ||
    tenant.plan_status === "sin_suscripcion";
  if (sinPlan) {
    return { label: "Sin plan", tone: "neutral", icon: "remove-circle-outline" };
  }

  const estado = ESTADOS_DEL_PLAN[tenant.plan_status] ?? {
    label: tenant.plan_status || "Sin plan",
    tone: "neutral" as const,
    icon: "workspace-premium" as const,
  };

  if (
    tenant.status === "active" &&
    !tenant.operational &&
    (tenant.plan_status === "active" || tenant.plan_status === "trialing")
  ) {
    return {
      label: `${tenant.plan_name} · Sin operar`,
      tone: "warning",
      icon: "pause-circle-outline",
    };
  }

  return {
    label: `${tenant.plan_name} · ${estado.label}`,
    tone: estado.tone,
    icon: estado.icon,
  };
}

const PESOS = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export function formatearPrecio(cop: number): string {
  return cop === 0 ? "Gratis" : PESOS.format(cop);
}

export function formatearFechaCorta(iso: string | null | undefined): string {
  if (!iso) return "—";
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "short" }).format(fecha);
}
