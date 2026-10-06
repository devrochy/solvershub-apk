import { etiquetaEstatus } from "./estatus";

describe("etiquetaEstatus", () => {
  it("traduce los estatus conocidos a etiquetas legibles", () => {
    expect(etiquetaEstatus("vigente")).toBe("Vigente");
    expect(etiquetaEstatus("liquidado")).toBe("Liquidado");
    expect(etiquetaEstatus("activo")).toBe("Activo");
    expect(etiquetaEstatus("bloqueado")).toBe("Bloqueado");
    expect(etiquetaEstatus("pagada")).toBe("Pagada");
    expect(etiquetaEstatus("atrasada")).toBe("Atrasada");
    expect(etiquetaEstatus("pendiente")).toBe("Pendiente");
    expect(etiquetaEstatus("pendiente_revalidacion")).toBe("Pendiente de revalidación");
    expect(etiquetaEstatus("revocado")).toBe("Revocado");
  });

  it("capitaliza un estatus desconocido en vez de mostrarlo crudo", () => {
    expect(etiquetaEstatus("otro_estado")).toBe("Otro estado");
  });

  it("maneja vacío", () => {
    expect(etiquetaEstatus("")).toBe("");
  });
});
