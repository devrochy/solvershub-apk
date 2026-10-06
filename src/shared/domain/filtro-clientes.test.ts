import { filtrarClientes, estadoCliente } from "./filtro-clientes";
import type { ClienteGestorPublic } from "@shared/types/gestor";

function cliente(overrides: Partial<ClienteGestorPublic>): ClienteGestorPublic {
  return {
    id: "1",
    carteraId: "1",
    nombre: "Test",
    apellido: "Uno",
    negocio: null,
    telefonoWhatsapp: "70000000",
    latitud: 0,
    longitud: 0,
    latitudDomicilio: null,
    longitudDomicilio: null,
    topeMaximoDeuda: null,
    estatus: "activo",
    colorRiesgo: "blanco",
    fotoUrl: null,
    tipoDocumento: null,
    numeroDocumento: null,
    numPrestamos: 0,
    diasMora: 0,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("filtrarClientes", () => {
  const clientes = [
    cliente({ id: "1", numPrestamos: 1, diasMora: 0 }),
    cliente({ id: "2", numPrestamos: 2, diasMora: 10 }),
    cliente({ id: "3", numPrestamos: 0, diasMora: 0 }),
  ];

  it("sin filtro devuelve todos", () => {
    expect(filtrarClientes(clientes, "todos")).toHaveLength(3);
  });

  it("al_dia: con préstamo y sin mora", () => {
    expect(filtrarClientes(clientes, "al_dia").map((c) => c.id)).toEqual(["1"]);
  });

  it("en_mora: con mora", () => {
    expect(filtrarClientes(clientes, "en_mora").map((c) => c.id)).toEqual(["2"]);
  });

  it("sin_prestamos: sin préstamos vigentes", () => {
    expect(filtrarClientes(clientes, "sin_prestamos").map((c) => c.id)).toEqual(["3"]);
  });
});

describe("estadoCliente", () => {
  it("en_mora si tiene mora (aunque tenga un préstamo al día)", () => {
    expect(estadoCliente(cliente({ numPrestamos: 2, diasMora: 5 }))).toBe("en_mora");
  });

  it("al_dia si tiene préstamo y sin mora", () => {
    expect(estadoCliente(cliente({ numPrestamos: 1, diasMora: 0 }))).toBe("al_dia");
  });

  it("sin_prestamos si no tiene préstamos vigentes", () => {
    expect(estadoCliente(cliente({ numPrestamos: 0, diasMora: 0 }))).toBe("sin_prestamos");
  });
});
