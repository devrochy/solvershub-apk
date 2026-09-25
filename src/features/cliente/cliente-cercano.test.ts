import { clienteMasCercano, distanciaKm } from "./cliente-cercano";

describe("distanciaKm", () => {
  it("es 0 para el mismo punto", () => {
    expect(distanciaKm({ latitud: 4.6, longitud: -74.1 }, { latitud: 4.6, longitud: -74.1 })).toBe(0);
  });

  it("calcula una distancia razonable (~1.1 km por 0.01°)", () => {
    const d = distanciaKm({ latitud: 4.6, longitud: -74.1 }, { latitud: 4.61, longitud: -74.1 });
    expect(d).toBeGreaterThan(1);
    expect(d).toBeLessThan(1.3);
  });
});

describe("clienteMasCercano", () => {
  const desde = { latitud: 4.6, longitud: -74.1 };

  it("devuelve el cliente con menor distancia", () => {
    const clientes = [
      { clienteId: "lejos", latitud: 4.7, longitud: -74.1 },
      { clienteId: "cerca", latitud: 4.601, longitud: -74.1 },
    ];
    expect(clienteMasCercano(clientes, desde)?.clienteId).toBe("cerca");
  });

  it("ignora clientes sin coordenadas", () => {
    const clientes = [
      { clienteId: "sin", latitud: null, longitud: null },
      { clienteId: "con", latitud: 4.6, longitud: -74.1 },
    ];
    expect(clienteMasCercano(clientes, desde)?.clienteId).toBe("con");
  });

  it("devuelve null si ninguno tiene ubicación", () => {
    expect(clienteMasCercano([{ clienteId: "x" }], desde)).toBeNull();
  });
});
