import { fireEvent, render } from "@testing-library/react-native";
import { BackHandler, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemeProvider } from "@core/theme/theme-context";
import { Drawer } from "./Drawer";
import { kitDeTema } from "./tema";

const claro = kitDeTema("claro");

describe("Drawer", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    (useSafeAreaInsets as unknown as jest.Mock).mockReturnValue({ top: 0, right: 0, bottom: 0, left: 0 });
  });

  it("solo recibe toques cuando está abierto y el fondo lo cierra", async () => {
    const onCerrar = jest.fn();
    const { getByTestId, rerender } = await render(
      <Drawer abierto={false} onCerrar={onCerrar} testID="cajon" testIDFondo="cajon-fondo">
        <Text>contenido</Text>
      </Drawer>,
    );
    expect(getByTestId("cajon")).toHaveProp("pointerEvents", "none");

    await rerender(
      <Drawer abierto onCerrar={onCerrar} testID="cajon" testIDFondo="cajon-fondo">
        <Text>contenido</Text>
      </Drawer>,
    );
    expect(getByTestId("cajon")).toHaveProp("pointerEvents", "auto");

    await fireEvent.press(getByTestId("cajon-fondo"));
    expect(onCerrar).toHaveBeenCalledTimes(1);
    expect(getByTestId("cajon-fondo")).toHaveProp("accessibilityLabel", "Cerrar menú");
  });

  it("pinta con los tokens del tema, respeta el área segura y acepta estilos propios", async () => {
    (useSafeAreaInsets as unknown as jest.Mock).mockReturnValue({ top: 30, right: 0, bottom: 24, left: 0 });
    const { getByTestId } = await render(
      <Drawer abierto onCerrar={jest.fn()} testID="cajon" ancho={300} style={{ boxShadow: "1px 0 0 red" }}>
        <Text>contenido</Text>
      </Drawer>,
    );
    expect(getByTestId("cajon")).toHaveStyle({
      width: 300,
      backgroundColor: claro.c.surface,
      borderColor: claro.c.border,
      borderRightWidth: 1,
      borderTopRightRadius: 20,
      borderBottomRightRadius: 20,
      paddingTop: 50,
      paddingBottom: 24,
      boxShadow: "1px 0 0 red",
    });
  });

  it("en tema oscuro pinta el fondo con el navy de superficie de la web (#11224D)", async () => {
    const oscuro = kitDeTema("oscuro");
    const { getByTestId } = await render(
      <ThemeProvider>
        <Drawer abierto onCerrar={jest.fn()} testID="cajon-oscuro">
          <Text>contenido</Text>
        </Drawer>
      </ThemeProvider>,
    );
    expect(oscuro.c.surface).toBe("#11224D");
    expect(getByTestId("cajon-oscuro")).toHaveStyle({ backgroundColor: oscuro.c.surface });
  });

  it("el botón atrás cierra el cajón solo si se pide y mientras está abierto", async () => {
    const remove = jest.fn();
    const spy = jest
      .spyOn(BackHandler, "addEventListener")
      .mockReturnValue({ remove } as unknown as ReturnType<typeof BackHandler.addEventListener>);
    const onCerrar = jest.fn();

    const { rerender, unmount } = await render(
      <Drawer abierto onCerrar={onCerrar} testID="cajon">
        <Text>contenido</Text>
      </Drawer>,
    );
    expect(spy).not.toHaveBeenCalled();

    await rerender(
      <Drawer abierto onCerrar={onCerrar} testID="cajon" cerrarConBack>
        <Text>contenido</Text>
      </Drawer>,
    );
    expect(spy).toHaveBeenCalledWith("hardwareBackPress", expect.any(Function));
    const handler = spy.mock.calls[0][1] as () => boolean;
    expect(handler()).toBe(true);
    expect(onCerrar).toHaveBeenCalledTimes(1);

    await rerender(
      <Drawer abierto={false} onCerrar={onCerrar} testID="cajon" cerrarConBack>
        <Text>contenido</Text>
      </Drawer>,
    );
    expect(remove).toHaveBeenCalled();
    unmount();
  });
});
