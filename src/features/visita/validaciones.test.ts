import { validarFechaPrometida, validarMonto } from "./validaciones";

describe("validarFechaPrometida", () => {
  it("acepta una fecha futura en formato YYYY-MM-DD", () => {
    const manana = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    expect(validarFechaPrometida(manana)).toBeNull();
  });

  it("rechaza un formato inválido", () => {
    expect(validarFechaPrometida("31/12/2026")).toMatch(/formato/i);
    expect(validarFechaPrometida("2026-13-01")).toMatch(/no existe|formato/i);
  });

  it("rechaza una fecha que no existe (2026-02-30)", () => {
    expect(validarFechaPrometida("2026-02-30")).toMatch(/no existe/i);
  });

  it("rechaza una fecha en el pasado", () => {
    expect(validarFechaPrometida("2020-01-01")).toMatch(/futura/i);
  });

  it("acepta una fecha vacía (promesa opcional)", () => {
    expect(validarFechaPrometida("")).toBeNull();
  });
});

describe("validarMonto", () => {
  it("acepta un monto positivo", () => {
    expect(validarMonto(100)).toBeNull();
  });

  it("rechaza cero o negativos", () => {
    expect(validarMonto(0)).toMatch(/mayor/i);
    expect(validarMonto(-5)).toMatch(/mayor/i);
  });

  it("rechaza no-números", () => {
    expect(validarMonto(NaN)).toMatch(/válido/i);
  });
});