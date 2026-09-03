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

import { ClienteScreen } from "../screens/ClienteScreen";

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
      rutaId: 6,
      clienteId: 12,
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
      rutaId: 6,
      clienteId: 12,
      nombre: "Juan",
      prestamoAutoSeleccionado: true,
    };
    await render(<OverlayDetalle pantalla={pantalla} onCerrar={jest.fn()} />);
    expect((ClienteScreen as jest.Mock).mock.calls[0][0]).toEqual(
      expect.objectContaining({
        rutaId: 6,
        clienteId: 12,
        prestamoAutoSeleccionado: true,
        onCerrar: expect.any(Function),
      }),
    );
  });
});