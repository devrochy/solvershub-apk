import { Linking } from "react-native";
import {
  abrirNavegacion,
  coordenadaDeCliente,
  enlaceGoogleMaps,
  enlaceGoogleMapsCartera,
  enlaceWaze,
} from "./navegacion";
import type { TrayectoPublic } from "../../types/gestor";

const trayectos: TrayectoPublic = {
  id: "1",
  carteraId: "6",
  fecha: "2026-09-02",
  ordenClientes: [
    [{ clienteId: "1", latitud: -17.78, longitud: -63.18 }],
    [
      { clienteId: "2", latitud: -17.79, longitud: -63.19 },
      { clienteId: "3" },
    ],
  ],
  waypoints: [
    { latitud: -17.78, longitud: -63.18 },
    { latitud: -17.79, longitud: -63.19 },
  ],
  distanciaEstimadaKm: 5,
  tiempoEstimadoMin: 20,
  tipo: "planificada",
};

describe("navegacion", () => {
  it("coordenadaDeCliente encuentra la parada del cliente en el trayecto", () => {
    expect(coordenadaDeCliente(trayectos, "2")).toEqual({
      latitud: -17.79,
      longitud: -63.19,
    });
  });

  it("coordenadaDeCliente devuelve null si el cliente no tiene coords", () => {
    expect(coordenadaDeCliente(trayectos, "3")).toBeNull();
  });

  it("coordenadaDeCliente devuelve null si no hay trayectos", () => {
    expect(coordenadaDeCliente(null, "1")).toBeNull();
  });

  it("enlaceGoogleMaps genera la URL de dirección", () => {
    expect(enlaceGoogleMaps(-17.78, -63.18)).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=-17.78,-63.18",
    );
  });

  it("enlaceWaze genera la URL con ll=lat,lon", () => {
    expect(enlaceWaze(-17.78, -63.18)).toBe(
      "https://waze.com/ul?ll=-17.78,-63.18&navigate=yes",
    );
  });

  it("abrirNavegacion abre el enlace de la app solicitada", async () => {
    (Linking.openURL as jest.Mock).mockResolvedValue(true);

    await abrirNavegacion(-17.78, -63.18, "waze");

    expect(Linking.openURL).toHaveBeenCalledWith(
      "https://waze.com/ul?ll=-17.78,-63.18&navigate=yes",
    );
  });

  it("enlaceGoogleMapsCartera encadena las paradas en el orden del trayecto", () => {
    const url = enlaceGoogleMapsCartera([
      { latitud: -17.78, longitud: -63.18 },
      { latitud: -17.79, longitud: -63.19 },
      { latitud: -17.8, longitud: -63.2 },
    ]);
    expect(url).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=-17.78,-63.18&waypoints=-17.79,-63.19|-17.8,-63.2",
    );
  });

  it("enlaceGoogleMapsCartera devuelve null si hay menos de 1 parada con coords", () => {
    expect(enlaceGoogleMapsCartera([])).toBeNull();
    expect(enlaceGoogleMapsCartera([{ latitud: undefined as never, longitud: 0 }])).toBeNull();
  });
});