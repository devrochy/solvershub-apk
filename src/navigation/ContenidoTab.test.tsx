import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { BackHandler, Pressable, Text } from "react-native";
import { PantallaActivaProvider, usePantallaActiva } from "./pantalla-activa-context";
import { ContenidoTab } from "./ContenidoTab";
import * as swipeCerrar from "./swipe-cerrar";

jest.mock("./OverlayDetalle", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    OverlayDetalle: jest.fn(({ pantalla }: { pantalla?: unknown }) =>
      pantalla ? React.createElement(View, { testID: "overlay" }) : null,
    ),
  };
});

function AbrePantalla() {
  const { abrir } = usePantallaActiva();
  return (
    <Pressable
      testID="abrir"
      onPress={() =>
        abrir({ tipo: "cliente", rutaId: 6, clienteId: 1, nombre: "Juan" })
      }
    >
      <Text>abrir</Text>
    </Pressable>
  );
}

describe("ContenidoTab", () => {
  it("renderiza el contenido del tab", async () => {
    const { getByText } = await render(
      <PantallaActivaProvider>
        <ContenidoTab>
          <Text>Contenido</Text>
        </ContenidoTab>
      </PantallaActivaProvider>,
    );

    expect(getByText("Contenido")).toBeTruthy();
  });

  it("envuelve el contenido con el gesto de cerrar (handlers del responder)", async () => {
    const { getByTestId } = await render(
      <PantallaActivaProvider>
        <ContenidoTab onCerrar={jest.fn()}>
          <Text>Contenido</Text>
        </ContenidoTab>
      </PantallaActivaProvider>,
    );

    const props = getByTestId("contenido-tab").props as {
      onMoveShouldSetResponder?: unknown;
      onResponderRelease?: unknown;
      onResponderTerminate?: unknown;
    };
    expect(props.onMoveShouldSetResponder).toBeDefined();
    expect(props.onResponderRelease).toBeDefined();
    expect(props.onResponderTerminate).toBeDefined();
  });

  it("configura el swipe de la pestaña para revelar la pantalla destino durante la salida", async () => {
    const spy = jest
      .spyOn(swipeCerrar, "crearPanResponderCerrar")
      .mockReturnValue({ config: {}, panHandlers: {} } as never);
    const onCerrar = jest.fn();

    await render(
      <PantallaActivaProvider>
        <ContenidoTab onCerrar={onCerrar}>
          <Text>Contenido</Text>
        </ContenidoTab>
      </PantallaActivaProvider>,
    );

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ onCerrar, animarSalida: "alInicio" }),
    );
    spy.mockRestore();
  });

  it("muestra el overlay de detalle encima del contenido al abrir una pantalla", async () => {
    const { getByTestId } = await render(
      <PantallaActivaProvider>
        <ContenidoTab>
          <AbrePantalla />
        </ContenidoTab>
      </PantallaActivaProvider>,
    );

    await fireEvent.press(getByTestId("abrir"));

    expect(getByTestId("overlay")).toBeTruthy();
  });

  it("el back físico de Android cierra la pantalla activa (overlay)", async () => {
    const spy = jest.spyOn(BackHandler, "addEventListener");
    const { getByTestId, queryByTestId } = await render(
      <PantallaActivaProvider>
        <ContenidoTab>
          <AbrePantalla />
        </ContenidoTab>
      </PantallaActivaProvider>,
    );

    await fireEvent.press(getByTestId("abrir"));
    await waitFor(() => expect(getByTestId("overlay")).toBeTruthy());

    const llamadas = spy.mock.calls.filter(
      ([evento]) => evento === "hardwareBackPress",
    );
    const handler = llamadas[llamadas.length - 1][1] as () => boolean;
    await act(async () => {
      expect(handler()).toBe(true);
    });

    await waitFor(() => expect(queryByTestId("overlay")).toBeNull());
  });
});