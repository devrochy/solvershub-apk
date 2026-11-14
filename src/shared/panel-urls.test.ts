import { urlDocumentacion } from "./panel-urls";

describe("urlDocumentacion", () => {
  it("cuelga la wiki de /ayuda en el host del panel", () => {
    expect(urlDocumentacion("https://panel.ejemplo.test")).toBe("https://panel.ejemplo.test/ayuda");
  });

  it("tolera barras finales y espacios en el host configurado", () => {
    expect(urlDocumentacion(" https://panel.ejemplo.test// ")).toBe("https://panel.ejemplo.test/ayuda");
  });

  it("sin host de panel no hay enlace", () => {
    expect(urlDocumentacion("")).toBeNull();
    expect(urlDocumentacion("   ")).toBeNull();
  });

  it("por defecto usa el host del panel del entorno", () => {
    const { PANEL_URL } = jest.requireActual<typeof import("@core/config")>("@core/config");
    expect(urlDocumentacion()).toBe(`${PANEL_URL}/ayuda`);
  });
});
