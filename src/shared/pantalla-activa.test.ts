import { esPantallaDePlan } from "./pantalla-activa";

describe("pantalla activa (HU-BILL-15)", () => {
  it("reconoce Consumo y plan por el módulo negocio", () => {
    expect(esPantallaDePlan({ modulo: "negocio" })).toBe(true);
    expect(esPantallaDePlan({ modulo: "negocio", pestana: "costos" })).toBe(true);
    expect(esPantallaDePlan({ modulo: "inicio" })).toBe(false);
    expect(esPantallaDePlan(null)).toBe(false);
  });
});
