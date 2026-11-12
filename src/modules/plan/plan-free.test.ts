import { avisoDePlanFree, esPlanFree, puedeMejorarPlan } from "./plan-free";

const FREE = {
  plan_id: "free",
  plan_name: "Free",
  status: "trialing",
  days_left: 12,
  trial_ends_at: null,
  has_plan: true,
};

describe("plan Free en la app (HU-BILL-15)", () => {
  it("reconoce Free y los negocios sin suscripción", () => {
    expect(esPlanFree(FREE)).toBe(true);
    expect(esPlanFree({ ...FREE, has_plan: false })).toBe(true);
    expect(esPlanFree({ ...FREE, plan_id: "basic", plan_name: "Basic" })).toBe(false);
    expect(esPlanFree(null)).toBe(false);
  });

  it("cuenta los días de prueba en singular y plural", () => {
    expect(avisoDePlanFree(FREE)?.texto).toContain("Te quedan 12 días de prueba.");
    expect(avisoDePlanFree({ ...FREE, days_left: 1 })?.texto).toContain("Te queda 1 día de prueba.");
  });

  it("cambia a peligro cuando la prueba venció", () => {
    expect(avisoDePlanFree({ ...FREE, status: "expired" })).toMatchObject({
      tono: "danger",
      titulo: "Tu plan Free terminó",
    });
    expect(avisoDePlanFree({ ...FREE, status: "past_due" })?.tono).toBe("danger");
  });

  it("solo deja mejorar el plan a quien puede pagarlo", () => {
    expect(puedeMejorarPlan({ plan: "write" }, false)).toBe(true);
    expect(puedeMejorarPlan({ plan: "read" }, false)).toBe(false);
    expect(puedeMejorarPlan({ plan: "write" }, true)).toBe(false);
    expect(puedeMejorarPlan(null, false)).toBe(false);
  });
});
