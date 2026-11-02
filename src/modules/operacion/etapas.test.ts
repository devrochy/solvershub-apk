import { motivosDePerdida, textoDeValor, valorEstimadoValido } from "./etapas";

// HU-CRM-23: motivos que se pueden elegir, valor estimado como número simple y en pesos.

describe("motivo de pérdida y valor estimado", () => {
  it("los motivos para elegir salen del filtro del pack y no incluyen «Sin motivo registrado»", () => {
    const filtros = [
      { key: "estado_lead", label: "Etapa", options: [{ value: "nuevo", label: "Nuevo" }] },
      {
        key: "motivo_perdida",
        label: "Motivo de pérdida",
        options: [
          { value: "precio", label: "Precio" },
          { value: "sin_motivo", label: "Sin motivo registrado" },
        ],
      },
    ];
    expect(motivosDePerdida(filtros)).toEqual([{ value: "precio", label: "Precio" }]);
  });

  it("sin el filtro (backend anterior) no hay motivos que pedir", () => {
    expect(motivosDePerdida(undefined)).toEqual([]);
    expect(motivosDePerdida([])).toEqual([]);
  });

  it("el valor es vacío o un número simple con hasta dos decimales", () => {
    for (const bueno of ["", "  ", "0", "250000", "250000.5", "250000,50"]) expect(valorEstimadoValido(bueno)).toBe(true);
    for (const malo of ["150.000", "$150000", "-5", "1e3", "12.345", "abc"]) expect(valorEstimadoValido(malo)).toBe(false);
  });

  it("el valor se muestra en pesos y sin valor es null", () => {
    expect(textoDeValor(250000)).toBe("$ 250.000");
    expect(textoDeValor(1500000)).toBe("$ 1.500.000");
    expect(textoDeValor(0)).toBe("$ 0");
    expect(textoDeValor(null)).toBeNull();
    expect(textoDeValor("250000")).toBeNull();
  });
});
