import { act, fireEvent, render } from "@testing-library/react-native";
import { Text, Pressable } from "react-native";
import { useCallback } from "react";
import {
  PantallaActivaProvider,
  usePantallaActiva,
} from "./pantalla-activa-context";

function Consumidor() {
  const { pantalla, abrir, cerrar } = usePantallaActiva();
  const abrirCliente = useCallback(
    () =>
      abrir({ tipo: "cliente", carteraId: 6, clienteId: 12, nombre: "Juan" }),
    [abrir],
  );
  return (
    <>
      <Pressable testID="abrir" onPress={abrirCliente}>
        <Text>abrir</Text>
      </Pressable>
      <Pressable testID="cerrar" onPress={cerrar}>
        <Text>cerrar</Text>
      </Pressable>
      <Text testID="estado">{pantalla?.tipo ?? "ninguna"}</Text>
    </>
  );
}

describe("PantallaActivaProvider", () => {
  it("abre y cierra la pantalla activa", async () => {
    const { getByTestId } = await render(
      <PantallaActivaProvider>
        <Consumidor />
      </PantallaActivaProvider>,
    );

    await act(async () => {
      fireEvent.press(getByTestId("abrir"));
    });
    expect(getByTestId("estado").props.children).toBe("cliente");

    await act(async () => {
      fireEvent.press(getByTestId("cerrar"));
    });
    expect(getByTestId("estado").props.children).toBe("ninguna");
  });

  it("limpia la pantalla activa cuando cambia el resetKey (p. ej. logout)", async () => {
    const { getByTestId, rerender } = await render(
      <PantallaActivaProvider resetKey={1}>
        <Consumidor />
      </PantallaActivaProvider>,
    );

    await act(async () => {
      fireEvent.press(getByTestId("abrir"));
    });
    expect(getByTestId("estado").props.children).toBe("cliente");

    await act(async () => {
      rerender(
        <PantallaActivaProvider resetKey={null}>
          <Consumidor />
        </PantallaActivaProvider>,
      );
    });
    expect(getByTestId("estado").props.children).toBe("ninguna");
  });
});