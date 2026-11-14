import { estadoDelPlan, formatearFechaCorta, formatearPrecio } from "./presentacion";

describe("estadoDelPlan", () => {
  it("nombra el plan y su estado de suscripción", () => {
    expect(estadoDelPlan({ status: "active", plan_name: "Negocio", plan_status: "active", operational: true })).toMatchObject({
      label: "Negocio · Vigente",
      tone: "success",
    });
    expect(estadoDelPlan({ status: "active", plan_name: "Negocio", plan_status: "trialing", operational: true })).toMatchObject({
      label: "Negocio · En prueba",
      tone: "accent",
    });
    expect(estadoDelPlan({ status: "active", plan_name: "Negocio", plan_status: "past_due", operational: false })).toMatchObject({
      label: "Negocio · Pago pendiente",
      tone: "warning",
    });
    expect(estadoDelPlan({ status: "active", plan_name: "Negocio", plan_status: "expired", operational: false })).toMatchObject({
      label: "Negocio · Vencida",
      tone: "danger",
    });
    expect(estadoDelPlan({ status: "active", plan_name: "Negocio", plan_status: "canceled", operational: false })).toMatchObject({
      label: "Negocio · Cancelada",
      tone: "neutral",
    });
  });

  it("un negocio sin suscripción se lee como «Sin plan»", () => {
    expect(estadoDelPlan({ status: "active", plan_name: "—", plan_status: "sin_suscripcion", operational: true })).toMatchObject({
      label: "Sin plan",
      tone: "neutral",
    });
  });

  it("avisa cuando el plan está vigente pero el negocio activo no opera", () => {
    expect(estadoDelPlan({ status: "active", plan_name: "Negocio", plan_status: "active", operational: false })).toMatchObject({
      label: "Negocio · Sin operar",
      tone: "warning",
      icon: "pause-circle-outline",
    });
  });

  it("un negocio suspendido conserva el estado de su plan", () => {
    expect(estadoDelPlan({ status: "suspended", plan_name: "Negocio", plan_status: "active", operational: false })).toMatchObject({
      label: "Negocio · Vigente",
      tone: "success",
    });
  });
});

describe("formato de plan", () => {
  it("un plan gratuito se lee «Gratis» y uno pago lleva su precio", () => {
    expect(formatearPrecio(0)).toBe("Gratis");
    expect(formatearPrecio(199000)).toContain("$");
  });

  it("la fecha corta no rompe con valores vacíos", () => {
    expect(formatearFechaCorta(null)).toBe("—");
    expect(formatearFechaCorta("2026-10-01T00:00:00Z")).not.toBe("—");
  });
});
