import { faltantes, rellenarCuerpo } from "./plantillas";

describe("plantillas", () => {
  it("rellena las variables y deja visibles las que faltan", () => {
    expect(rellenarCuerpo("Hola {{1}}, paga {{monto}}.", { "1": "Ana", monto: "10" })).toBe(
      "Hola Ana, paga 10.",
    );
    expect(rellenarCuerpo("Hola {{1}}.", {})).toBe("Hola [1].");
  });

  it("detecta las variables pendientes", () => {
    expect(faltantes(["1", "monto"], { "1": "Ana" })).toEqual(["monto"]);
    expect(faltantes(["1"], { "1": "Ana" })).toEqual([]);
  });
});
