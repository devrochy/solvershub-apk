import { contarEnMora } from "./contar-en-mora";
import type { ClienteTrayectoDiarioPublic } from "../types/gestor";

function cliente(color: ClienteTrayectoDiarioPublic["color"]): ClienteTrayectoDiarioPublic {
  return {
    clienteId: "1",
    nombre: "test-cliente",
    enTrayecto: false,
    color,
    visitaRegistrada: false,
    diasMora: 0,
    compromisoValor: null,
  };
}

describe("contarEnMora", () => {
  it("cuenta solo los clientes en rojo", () => {
    expect(contarEnMora([cliente("rojo"), cliente("verde"), cliente("blanco")])).toBe(1);
  });

  it("devuelve 0 si no hay clientes en rojo", () => {
    expect(contarEnMora([cliente("verde"), cliente("blanco")])).toBe(0);
  });

  it("devuelve 0 con la lista vacía", () => {
    expect(contarEnMora([])).toBe(0);
  });
});
