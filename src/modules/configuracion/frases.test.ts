import { agregarFrase, normalizarFrase } from "./frases";

describe("listas de frases", () => {
  it("normaliza sin tildes, mayúsculas ni signos", () => {
    expect(normalizarFrase("  ¡No, Gracias! ")).toBe("no gracias");
    expect(normalizarFrase("Cancelación")).toBe("cancelacion");
  });

  it("agrega frases con espacios y comas intactas", () => {
    expect(agregarFrase([], "  no, gracias  ", 3, 10)).toEqual(["no, gracias"]);
  });

  it("ignora repetidas sin importar mayúsculas ni tildes", () => {
    expect(agregarFrase(["Cancelación"], "cancelacion", 2, 10)).toBeNull();
    expect(agregarFrase(["no, gracias"], "NO GRACIAS", 2, 10)).toBeNull();
  });

  it("respeta el largo mínimo, el tope de la lista y 300 caracteres", () => {
    expect(agregarFrase([], "ab", 3, 10)).toBeNull();
    expect(agregarFrase([], "ab", 2, 10)).toEqual(["ab"]);
    expect(agregarFrase(["uno"], "dos", 2, 1)).toBeNull();
    expect(agregarFrase([], "x".repeat(400), 3, 10)![0]).toHaveLength(300);
  });
});
