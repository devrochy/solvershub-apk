import { Pressable, Text } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";
import { CarteraFlujo } from "./CarteraFlujo";
import { MenuLateralProvider, useMenuLateral } from "./menu-lateral-context";

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));
jest.mock("./pantalla-activa-context", () => ({
  usePantallaActiva: () => ({ pantalla: null, cerrar: jest.fn() }),
}));
jest.mock("./trayectos-overlay-context", () => ({
  useTrayectosOverlay: () => ({ contenido: null, cerrar: jest.fn() }),
}));
jest.mock("./OverlaysActivos", () => ({ OverlaysActivos: () => null }));
jest.mock("../screens/CarteraDetalleScreen", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    CarteraDetalleScreen: () =>
      React.createElement(Text, { testID: "seccion-cartera" }, "cartera"),
  };
});
jest.mock("../screens/TrayectoDiarioScreen", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    TrayectoDiarioScreen: () =>
      React.createElement(Text, { testID: "seccion-trayecto" }, "trayecto"),
  };
});
jest.mock("../screens/ClientesScreen", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    ClientesScreen: () =>
      React.createElement(Text, { testID: "seccion-clientes" }, "clientes"),
  };
});

function Probe() {
  const { itemsExtra } = useMenuLateral();
  return (
    <>
      {itemsExtra.map((item) => (
        <Pressable key={item.key} testID={`probe-${item.key}`} onPress={item.onPress}>
          <Text>{item.label}</Text>
        </Pressable>
      ))}
    </>
  );
}

function renderFlujo() {
  return render(
    <MenuLateralProvider>
      <CarteraFlujo
        route={{ key: "c", name: "Cartera", params: undefined } as never}
        navigation={{ navigate: jest.fn() } as never}
      />
      <Probe />
    </MenuLateralProvider>,
  );
}

describe("CarteraFlujo", () => {
  it("abre en la sección Cartera (información)", async () => {
    const { getByTestId, queryByTestId } = await renderFlujo();

    expect(getByTestId("seccion-cartera")).toBeTruthy();
    expect(queryByTestId("seccion-clientes")).toBeNull();
  });

  it("cambia de sección desde el menú y muestra los filtros en Clientes", async () => {
    const { getByTestId } = await renderFlujo();

    await fireEvent.press(getByTestId("probe-seccion-clientes"));
    expect(getByTestId("seccion-clientes")).toBeTruthy();
    expect(getByTestId("probe-filtro-en-mora")).toBeTruthy();

    await fireEvent.press(getByTestId("probe-seccion-trayecto"));
    expect(getByTestId("seccion-trayecto")).toBeTruthy();
  });
});
