import { errorDeNumero, leerNumero, limpiarNumero } from "./numeros";

describe("campos numéricos de Configuración", () => {
  it("lee números con coma o punto y rechaza lo incompleto", () => {
    expect(leerNumero("1,5")).toBe(1.5);
    expect(leerNumero(" 2 ")).toBe(2);
    expect(leerNumero("3.")).toBe(3);
    expect(leerNumero("")).toBeNull();
    expect(leerNumero("abc")).toBeNull();
    expect(leerNumero(",")).toBeNull();
  });

  it("limpia lo escrito: solo dígitos, un separador y sin ceros a la izquierda", () => {
    expect(limpiarNumero("04", false)).toBe("4");
    expect(limpiarNumero("0", false)).toBe("0");
    expect(limpiarNumero("1e5-", false)).toBe("15");
    expect(limpiarNumero("1,5", false)).toBe("15");
    expect(limpiarNumero("0,5", true)).toBe("0,5");
    expect(limpiarNumero("00,5", true)).toBe("0,5");
    expect(limpiarNumero("1.2.3", true)).toBe("1.23");
    expect(limpiarNumero("", true)).toBe("");
  });

  it("valida vacío, enteros y rango con mensajes en español", () => {
    expect(errorDeNumero("Temperatura", "", { min: 0, max: 2, decimal: true })).toBe("«Temperatura» necesita un número.");
    expect(errorDeNumero("Temperatura", "2,5", { min: 0, max: 2, decimal: true })).toBe(
      "«Temperatura» debe estar entre 0 y 2.",
    );
    expect(errorDeNumero("Temperatura", "0,7", { min: 0, max: 2, decimal: true })).toBeNull();
    expect(errorDeNumero("Turnos", "1.5", { min: 1, max: 200 })).toBe("«Turnos» debe ser un número entero.");
    expect(errorDeNumero("Turnos", "0", { min: 1, max: 200 })).toBe("«Turnos» debe estar entre 1 y 200.");
    expect(errorDeNumero("Presupuesto", "-1", { min: 0, decimal: true })).toBe("«Presupuesto» debe ser 0 o más.");
    expect(errorDeNumero("Presupuesto", "0", { min: 0, decimal: true })).toBeNull();
  });
});
