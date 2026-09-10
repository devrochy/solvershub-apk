import { fireEvent, render } from "@testing-library/react-native";
import { Linking } from "react-native";
import { TrayectosLista } from "./TrayectosLista";
import type { ClienteDiaPublic, TrayectoPublic } from "../types/cobrador";

jest.mock("../features/navegacion/navegacion", () => {
  const real = jest.requireActual("../features/navegacion/navegacion");
  return {
    ...real,
    enlaceGoogleMapsRuta: jest.fn(() => "https://maps.test/ruta"),
  };
});

import { enlaceGoogleMapsRuta } from "../features/navegacion/navegacion";

const clientes: ClienteDiaPublic[] = [
  { clienteId: 1, nombre: "Juan", enTrayecto: false, color: "verde", visitaRegistrada: false, diasMora: 0, compromisoValor: null },
  { clienteId: 2, nombre: "Ana", enTrayecto: false, color: "rojo", visitaRegistrada: false, diasMora: 0, compromisoValor: null },
  { clienteId: 3, nombre: "Luis", enTrayecto: false, color: "verde", visitaRegistrada: false, diasMora: 0, compromisoValor: null },
];

const trayectos: TrayectoPublic = {
  id: 1,
  rutaId: 6,
  fecha: "2026-09-02",
  ordenClientes: [
    [
      { clienteId: 1, latitud: -17.78, longitud: -63.18 },
      { clienteId: 2, latitud: -17.79, longitud: -63.19 },
    ],
    [{ clienteId: 3, latitud: -17.8, longitud: -63.2 }],
  ],
  waypoints: [],
  distanciaEstimadaKm: 5,
  tiempoEstimadoMin: 20,
  tipo: "planificada",
};

describe("TrayectosLista", () => {
  beforeEach(() => {
    jest.spyOn(Linking, "openURL").mockResolvedValue(true as never);
  });

  it("lista los trayectos generados con sus paradas en orden", async () => {
    const { getByText } = await render(
      <TrayectosLista clientes={clientes} trayectos={trayectos} />,
    );

    expect(getByText("Trayecto 1")).toBeTruthy();
    expect(getByText("Trayecto 2")).toBeTruthy();
    expect(getByText("1. Juan")).toBeTruthy();
    expect(getByText("2. Ana")).toBeTruthy();
    expect(getByText("1. Luis")).toBeTruthy();
  });

  it("abre el enlace de navegación del trayecto completo", async () => {
    const { getByTestId } = await render(
      <TrayectosLista clientes={clientes} trayectos={trayectos} />,
    );

    await fireEvent.press(getByTestId("navegar-trayecto-0"));
    expect(enlaceGoogleMapsRuta).toHaveBeenCalled();
    expect(Linking.openURL).toHaveBeenCalledWith("https://maps.test/ruta");
  });

  it("no muestra paradas sin nombre conocido", async () => {
    const trayectoConDesconocido: TrayectoPublic = {
      ...trayectos,
      ordenClientes: [[{ clienteId: 99, latitud: 0, longitud: 0 }]],
    };
    const { getByText } = await render(
      <TrayectosLista
        clientes={clientes}
        trayectos={trayectoConDesconocido}
      />,
    );
    expect(getByText(/Cliente 99/)).toBeTruthy();
  });
});