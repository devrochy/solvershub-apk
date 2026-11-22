import { avisoDeHistorial } from "./historial";

// HU-BILL-25/27: el 409 de historial del plan se explica en palabras, sin parecer una falla.

describe("avisoDeHistorial", () => {
  it("cita los días del plan y dice que no se borró nada", () => {
    const aviso = avisoDeHistorial({
      code: "plan_feature_not_included",
      details: { feature: "historial", plan: "basic", historial_dias: 90 },
    });
    expect(aviso?.titulo).toBe("Esta conversación es de hace más de 90 días");
    expect(aviso?.descripcion).toMatch(/^Tu plan muestra 90 días de historial\. No se borró nada/);
  });

  it("otro 409 del plan u otro error no es este aviso", () => {
    expect(avisoDeHistorial({ code: "plan_feature_not_included", details: { feature: "exportar", plan: "basic" } })).toBeNull();
    expect(avisoDeHistorial({ code: "not_found" })).toBeNull();
    expect(avisoDeHistorial(null)).toBeNull();
  });

  it("sin los días no inventa un número", () => {
    const aviso = avisoDeHistorial({ code: "plan_feature_not_included", details: { feature: "historial" } });
    expect(aviso?.titulo).not.toMatch(/\d/);
    expect(aviso?.descripcion).toMatch(/No se borró nada/);
  });
});
