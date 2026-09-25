import { render } from "@testing-library/react-native";
import { OverlayDetalle } from "./OverlayDetalle";
import { PantallaActiva } from "./pantalla-activa-context";

jest.mock("../screens/ClienteScreen", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    ClienteScreen: jest.fn((props: Record<string, unknown>) =>
      React.createElement(View, { testID: "mock-cliente" }),
    ),
  };
});

jest.mock("../screens/CarteraDetalleScreen", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    CarteraDetalleScreen: jest.fn((props: Record<string, unknown>) =>
      React.createElement(View, { testID: "mock-cartera" }),
    ),
  };
});

import { ClienteScreen } from "../screens/ClienteScreen";
import { CarteraDetalleScreen } from "../screens/CarteraDetalleScreen";

describe("OverlayDetalle", () => {
  beforeEach(() => jest.clearAllMocks());

  it("no renderiza nada si no hay pantalla activa", async () => {
    const { queryByTestId } = await render(
      <OverlayDetalle onCerrar={jest.fn()} />,
    );
    expect(queryByTestId("mock-cliente")).toBeNull();
  });

  it("renderiza el detalle de cliente cuando la pantalla activa es cliente", async () => {
    const pantalla: PantallaActiva = {
      tipo: "cliente",
      carteraId: "6",
      clienteId: "12",
      nombre: "Juan",
    };
    const { getByTestId } = await render(
      <OverlayDetalle pantalla={pantalla} onCerrar={jest.fn()} />,
    );
    expect(getByTestId("mock-cliente")).toBeTruthy();
  });

  it("le pasa las props de la pantalla al ClienteScreen", async () => {
    const pantalla: PantallaActiva = {
      tipo: "cliente",
      carteraId: "6",
      clienteId: "12",
      nombre: "Juan",
      latitud: -17.78,
      longitud: -63.18,
      latitudDomicilio: -17.79,
      longitudDomicilio: -63.19,
      prestamoAutoSeleccionado: true,
    };
    await render(<OverlayDetalle pantalla={pantalla} onCerrar={jest.fn()} />);
    const props = (ClienteScreen as jest.Mock).mock.calls[0][0];
    expect(props).toEqual(
      expect.objectContaining({
        carteraId: "6",
        clienteId: "12",
        latitud: -17.78,
        longitud: -63.18,
        latitudDomicilio: -17.79,
        longitudDomicilio: -63.19,
        prestamoAutoSeleccionado: true,
      }),
    );
    // El cierre del overlay lo gestiona el gesto swipe del wrapper, no el botón.
    expect(props).not.toHaveProperty("onCerrar");
  });

  it("envuelve el detalle con el gesto de cerrar (handlers del responder)", async () => {
    const pantalla: PantallaActiva = {
      tipo: "cliente",
      carteraId: "6",
      clienteId: "12",
      nombre: "Juan",
    };
    const { getByTestId } = await render(
      <OverlayDetalle pantalla={pantalla} onCerrar={jest.fn()} />,
    );

    const props = getByTestId("overlay-detalle").props as {
      onMoveShouldSetResponder?: unknown;
      onResponderRelease?: unknown;
      onResponderTerminate?: unknown;
    };
    expect(props.onMoveShouldSetResponder).toBeDefined();
    expect(props.onResponderRelease).toBeDefined();
    expect(props.onResponderTerminate).toBeDefined();
  });

  it("renderiza el detalle de cartera cuando la pantalla activa es cartera", async () => {
    const pantalla: PantallaActiva = {
      tipo: "cartera",
      carteraId: "6",
      carteraNombre: "Cartera Centro",
    };
    const { getByTestId } = await render(
      <OverlayDetalle pantalla={pantalla} onCerrar={jest.fn()} />,
    );
    expect(getByTestId("mock-cartera")).toBeTruthy();
    expect((CarteraDetalleScreen as jest.Mock).mock.calls[0][0]).toEqual(
      expect.objectContaining({
        carteraId: "6",
        carteraNombre: "Cartera Centro",
        onCerrar: expect.any(Function),
      }),
    );
  });

  it("no renderiza nada para una pantalla de préstamo sin vista propia", async () => {
    const pantalla: PantallaActiva = {
      tipo: "prestamo",
      carteraId: "6",
      prestamoId: "9",
      clienteNombre: "Juan",
      telefonoWhatsapp: "+5917000111",
      valor: 500,
      numCuotas: 4,
    };
    const { queryByTestId } = await render(
      <OverlayDetalle pantalla={pantalla} onCerrar={jest.fn()} />,
    );
    expect(queryByTestId("mock-cliente")).toBeNull();
    expect(queryByTestId("mock-cartera")).toBeNull();
  });
});