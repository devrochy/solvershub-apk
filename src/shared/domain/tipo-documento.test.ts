import {
  esTipoDocumentoValido,
  normalizarNumeroDocumento,
  validarNumeroDocumento,
} from "./tipo-documento";

describe("tipo-documento (APK)", () => {
  it("valida el número según el tipo", () => {
    expect(validarNumeroDocumento("ci", "1234567")).toBe(true);
    expect(validarNumeroDocumento("ci", "1053796939")).toBe(true);
    expect(validarNumeroDocumento("ci", "ABC")).toBe(false);
    expect(validarNumeroDocumento("pasaporte", "AB123456")).toBe(true);
    expect(validarNumeroDocumento("nit", "1234567890")).toBe(true);
    expect(validarNumeroDocumento("otro", "doc-123")).toBe(true);
  });

  it("normaliza espacios y mayúsculas", () => {
    expect(normalizarNumeroDocumento("  ab12 ")).toBe("AB12");
  });

  it("reconoce tipos válidos", () => {
    expect(esTipoDocumentoValido("ci")).toBe(true);
    expect(esTipoDocumentoValido("dni")).toBe(false);
  });
});
