import { agregarFrase, claveDeFrase, completarLista, normalizarFrase } from "./frases";

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

describe("frases solo de emojis o símbolos", () => {
  it("la clave cae al texto recortado en minúsculas cuando la normalización queda vacía", () => {
    expect(claveDeFrase("  ¡No, Gracias! ")).toBe("no gracias");
    expect(claveDeFrase(" 👍 ")).toBe("👍");
    expect(claveDeFrase("👍")).not.toBe(claveDeFrase("🙏"));
  });

  it("dos emojis distintos no se toman como repetidos, pero el mismo sí", () => {
    expect(agregarFrase(["👍"], "🙏", 1, 10)).toEqual(["👍", "🙏"]);
    expect(agregarFrase(["👍"], "👍", 1, 10)).toBeNull();
  });
});

describe("completarLista (texto escrito y no agregado al guardar)", () => {
  it("suma el texto pendiente al final, recortado", () => {
    expect(completarLista(["uno solo"], "  no, gracias  ", 3, 10)).toEqual({ frases: ["uno solo", "no, gracias"] });
  });

  it("sin texto no cambia la lista ni avisa", () => {
    expect(completarLista(["uno solo"], "   ", 3, 10)).toEqual({ frases: null });
  });

  it("una repetida se absorbe sin avisar", () => {
    expect(completarLista(["Cancelación"], "CANCELACION", 3, 10)).toEqual({ frases: null });
  });

  it("una frase demasiado corta avisa en vez de perderse", () => {
    const r = completarLista([], "ab", 3, 10);
    expect(r.frases).toBeNull();
    expect(r.error).toContain("«ab»");
    expect(r.error).toContain("mínimo 3");
  });

  it("con la lista llena avisa en vez de perderse", () => {
    const r = completarLista(["uno", "dos"], "tres", 3, 2);
    expect(r.frases).toBeNull();
    expect(r.error).toContain("máximo de 2");
  });
});
