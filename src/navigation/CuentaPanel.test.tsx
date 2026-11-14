import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Linking } from "react-native";
import { ThemeProvider } from "@core/theme/theme-context";
import { CuentaPanel } from "./CuentaPanel";

async function renderCuenta(overrides: Partial<React.ComponentProps<typeof CuentaPanel>> = {}) {
  const props = {
    abierto: true,
    nombre: "Dueño Demo",
    email: "dueno-a@demo.test",
    avatarUrl: null,
    tema: "oscuro" as const,
    onAlternarTema: jest.fn(),
    onPerfil: jest.fn(),
    onCerrarSesion: jest.fn(),
    ...overrides,
  };
  const utils = await render(
    <ThemeProvider>
      <CuentaPanel {...props} />
    </ThemeProvider>,
  );
  return { ...utils, ...props };
}

describe("CuentaPanel", () => {
  it("muestra el avatar, el nombre y el correo, y despliega el submenú", async () => {
    const { getByTestId, getByText, queryByTestId } = await renderCuenta();
    expect(getByText("Dueño Demo")).toBeTruthy();
    expect(getByText("dueno-a@demo.test")).toBeTruthy();
    expect(getByTestId("cajon-cuenta")).toHaveProp("accessibilityState", { expanded: false });
    expect(queryByTestId("cajon-cuenta-submenu")).toBeNull();

    await fireEvent.press(getByTestId("cajon-cuenta"));
    expect(getByTestId("cajon-cuenta-submenu")).toBeTruthy();
    expect(getByTestId("cajon-cuenta")).toHaveProp("accessibilityState", { expanded: true });
  });

  it("el switch alterna el tema sin cerrar el submenú", async () => {
    const onAlternarTema = jest.fn();
    const { getByTestId } = await renderCuenta({ onAlternarTema });
    await fireEvent.press(getByTestId("cajon-cuenta"));

    expect(getByTestId("cajon-tema")).toHaveProp("value", true);
    await fireEvent(getByTestId("cajon-tema"), "valueChange", false);
    expect(onAlternarTema).toHaveBeenCalledTimes(1);
    expect(getByTestId("cajon-cuenta-submenu")).toBeTruthy();
  });

  it("Perfil y Cerrar sesión disparan su acción y pliegan el submenú", async () => {
    const onPerfil = jest.fn();
    const onCerrarSesion = jest.fn();
    const { getByTestId, queryByTestId } = await renderCuenta({ onPerfil, onCerrarSesion });

    await fireEvent.press(getByTestId("cajon-cuenta"));
    await fireEvent.press(getByTestId("cajon-perfil"));
    expect(onPerfil).toHaveBeenCalledTimes(1);
    expect(queryByTestId("cajon-cuenta-submenu")).toBeNull();

    await fireEvent.press(getByTestId("cajon-cuenta"));
    await fireEvent.press(getByTestId("cajon-logout"));
    expect(onCerrarSesion).toHaveBeenCalledTimes(1);
    expect(queryByTestId("cajon-cuenta-submenu")).toBeNull();
  });

  it("al cerrar el cajón el submenú vuelve a plegarse", async () => {
    const { getByTestId, queryByTestId, rerender } = await renderCuenta();
    await fireEvent.press(getByTestId("cajon-cuenta"));
    expect(getByTestId("cajon-cuenta-submenu")).toBeTruthy();

    rerender(
      <ThemeProvider>
        <CuentaPanel
          key="cuenta-cerrada"
          abierto={false}
          nombre="Dueño Demo"
          email="dueno-a@demo.test"
          tema="oscuro"
          onAlternarTema={jest.fn()}
          onPerfil={jest.fn()}
          onCerrarSesion={jest.fn()}
        />
      </ThemeProvider>,
    );
    await waitFor(() => expect(queryByTestId("cajon-cuenta-submenu")).toBeNull());
  });

  describe("Documentación", () => {
    const URL_WIKI = "https://panel.ejemplo.test/ayuda";

    afterEach(() => jest.restoreAllMocks());

    it.each([
      ["sin la prop", undefined],
      ["con URL nula", null],
      ["con URL vacía", ""],
    ])("no se muestra %s", async (_caso, documentacionUrl) => {
      const { getByTestId, queryByTestId } = await renderCuenta({ documentacionUrl });
      await fireEvent.press(getByTestId("cajon-cuenta"));
      expect(getByTestId("cajon-cuenta-submenu")).toBeTruthy();
      expect(queryByTestId("cajon-documentacion")).toBeNull();
    });

    it("es un enlace accesible entre Perfil y Tema oscuro", async () => {
      const { getByTestId } = await renderCuenta({ documentacionUrl: URL_WIKI });
      await fireEvent.press(getByTestId("cajon-cuenta"));

      const enlace = getByTestId("cajon-documentacion");
      expect(enlace).toHaveProp("accessibilityRole", "link");
      expect(enlace).toHaveProp("accessibilityLabel", "Documentación, se abre en el navegador");

      const orden = getByTestId("cajon-cuenta-submenu").props.children
        .flat(Infinity)
        .filter(Boolean)
        .map((hijo: { props: { testID?: string } }) => hijo.props.testID);
      expect(orden.indexOf("cajon-perfil")).toBeLessThan(orden.indexOf("cajon-documentacion"));
      expect(orden.indexOf("cajon-documentacion")).toBeLessThan(orden.indexOf("cajon-tema-fila"));
      expect(orden.indexOf("cajon-tema-fila")).toBeLessThan(orden.indexOf("cajon-logout"));
    });

    it("abre la wiki en el navegador del sistema y pliega el submenú", async () => {
      const abrir = jest.spyOn(Linking, "openURL").mockResolvedValue(true as never);
      const { getByTestId, queryByTestId } = await renderCuenta({ documentacionUrl: URL_WIKI });
      await fireEvent.press(getByTestId("cajon-cuenta"));
      await fireEvent.press(getByTestId("cajon-documentacion"));

      expect(abrir).toHaveBeenCalledTimes(1);
      expect(abrir).toHaveBeenCalledWith(URL_WIKI);
      expect(queryByTestId("cajon-cuenta-submenu")).toBeNull();
    });

    it("si el sistema no puede abrir el enlace no revienta la app", async () => {
      jest.spyOn(Linking, "openURL").mockRejectedValue(new Error("sin navegador"));
      const { getByTestId, queryByTestId } = await renderCuenta({ documentacionUrl: URL_WIKI });
      await fireEvent.press(getByTestId("cajon-cuenta"));
      await fireEvent.press(getByTestId("cajon-documentacion"));
      expect(Linking.openURL).toHaveBeenCalledWith(URL_WIKI);
      expect(queryByTestId("cajon-cuenta-submenu")).toBeNull();
    });
  });
});
