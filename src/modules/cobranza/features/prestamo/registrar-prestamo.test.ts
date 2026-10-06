import { validarPrestamo } from "./registrar-prestamo";

describe("validarPrestamo", () => {
  it("acepta un préstamo con valor, cuotas y días válidos", () => {
    expect(
      validarPrestamo({ valor: "800", numCuotas: "4", diasEntreCuotas: "7" }),
    ).toBeNull();
  });

  it("rechaza valor no numérico o <= 0", () => {
    expect(
      validarPrestamo({ valor: "0", numCuotas: "4", diasEntreCuotas: "7" }),
    ).toBe("Ingresa un valor de préstamo válido.");
    expect(
      validarPrestamo({ valor: "abc", numCuotas: "4", diasEntreCuotas: "7" }),
    ).toBe("Ingresa un valor de préstamo válido.");
  });

  it("rechaza número de cuotas < 1", () => {
    expect(
      validarPrestamo({ valor: "800", numCuotas: "0", diasEntreCuotas: "7" }),
    ).toBe("El número de cuotas debe ser al menos 1.");
  });

  it("rechaza días entre cuotas < 1", () => {
    expect(
      validarPrestamo({ valor: "800", numCuotas: "4", diasEntreCuotas: "0" }),
    ).toBe("Los días entre cuotas deben ser al menos 1.");
  });

  it("acepta tipo de interés opcional válido", () => {
    expect(
      validarPrestamo({
        valor: "800",
        numCuotas: "4",
        diasEntreCuotas: "7",
        tipoInteres: "20",
      }),
    ).toBeNull();
  });
});