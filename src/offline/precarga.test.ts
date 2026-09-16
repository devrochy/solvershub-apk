import { clientesAprecargar } from "./precarga";

describe("clientesAprecargar", () => {
  const ahora = 1_000_000;
  const ttl = 60_000;

  it("devuelve todos los clientes si nunca se precargaron", () => {
    const clientes = [{ clienteId: 1 }, { clienteId: 2 }];
    expect(clientesAprecargar(clientes, new Map(), ahora, ttl)).toEqual(clientes);
  });

  it("omite los clientes precargados dentro del TTL", () => {
    const clientes = [{ clienteId: 1 }, { clienteId: 2 }];
    const precargados = new Map([[1, ahora - 10_000]]);
    expect(clientesAprecargar(clientes, precargados, ahora, ttl)).toEqual([
      { clienteId: 2 },
    ]);
  });

  it("vuelve a precargar cuando expira el TTL", () => {
    const clientes = [{ clienteId: 1 }];
    const precargados = new Map([[1, ahora - ttl - 1]]);
    expect(clientesAprecargar(clientes, precargados, ahora, ttl)).toEqual([
      { clienteId: 1 },
    ]);
  });
});
