import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { BackHandler } from "react-native";
import { InicioCobrador } from "./InicioCobrador";
import { PantallaActivaProvider } from "./pantalla-activa-context";
import { TrayectosOverlayProvider } from "./trayectos-overlay-context";

jest.mock("./TabsNavigator", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    TabsNavigator: () => React.createElement(View, { testID: "tabs-nav" }),
  };
});

jest.mock("../screens/SeleccionRutaScreen", () => {
  const React = require("react");
  const { Pressable, Text } = require("react-native");
  return {
    SeleccionRutaScreen: ({
      onRutaSeleccionada,
    }: {
      onRutaSeleccionada?: () => void;
    }) =>
      React.createElement(
        Pressable,
        { testID: "elegir-ruta", onPress: onRutaSeleccionada },
        React.createElement(Text, null, "elegir"),
      ),
  };
});

function renderInicio() {
  return render(
    <PantallaActivaProvider>
      <TrayectosOverlayProvider>
        <InicioCobrador />
      </TrayectosOverlayProvider>
    </PantallaActivaProvider>,
  );
}

describe("InicioCobrador", () => {
  it("monta la capa de pestañas al elegir una ruta (reveal sobre SeleccionRuta)", async () => {
    const { getByTestId, queryByTestId } = await renderInicio();

    expect(queryByTestId("tabs-capa")).toBeNull();

    await fireEvent.press(getByTestId("elegir-ruta"));

    expect(getByTestId("tabs-capa")).toBeTruthy();
    expect(getByTestId("tabs-nav")).toBeTruthy();
  });

  it("la capa de pestañas se envuelve con el gesto de cerrar (reveal)", async () => {
    const { getByTestId } = await renderInicio();

    await fireEvent.press(getByTestId("elegir-ruta"));

    const props = getByTestId("tabs-capa").props as {
      onMoveShouldSetResponder?: unknown;
      onResponderRelease?: unknown;
      onResponderTerminate?: unknown;
    };
    expect(props.onMoveShouldSetResponder).toBeDefined();
    expect(props.onResponderRelease).toBeDefined();
    expect(props.onResponderTerminate).toBeDefined();
  });

  it("el back físico de Android cierra la capa de pestañas", async () => {
    const spy = jest.spyOn(BackHandler, "addEventListener");
    const { getByTestId, queryByTestId } = await renderInicio();

    await fireEvent.press(getByTestId("elegir-ruta"));
    await waitFor(() => expect(getByTestId("tabs-capa")).toBeTruthy());

    const llamadas = spy.mock.calls.filter(
      ([evento]) => evento === "hardwareBackPress",
    );
    const handler = llamadas[llamadas.length - 1][1] as () => boolean;
    await act(async () => {
      expect(handler()).toBe(true);
    });

    await waitFor(() => expect(queryByTestId("tabs-capa")).toBeNull());
  });
});
