import { fireEvent, render } from "@testing-library/react-native";
import { CustomTabBar } from "./CustomTabBar";
import { PantallaActivaProvider } from "../navigation/pantalla-activa-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

function propsDe(
  index: number,
  navigate: jest.Mock = jest.fn(),
  insets: { top: number; right: number; bottom: number; left: number } = {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
): BottomTabBarProps {
  return {
    state: {
      index,
      routes: [
        { key: "ruta", name: "Ruta" },
        { key: "dia", name: "Dia" },
        { key: "clientes", name: "Clientes" },
      ],
      routeNames: ["Ruta", "Dia", "Clientes"],
      key: "tab",
      stale: false,
      type: "tab",
    } as never,
    descriptors: {
      ruta: { options: { title: "Ruta" } } as never,
      dia: { options: { title: "Día" } } as never,
      clientes: { options: { title: "Clientes" } } as never,
    },
    navigation: {
      emit: jest.fn(() => ({ defaultPrevented: false })),
      navigate,
    } as never,
    insets,
  };
}

describe("CustomTabBar", () => {
  it("renderiza los 3 tabs con el central (Día) sobresaliente", async () => {
    const { getByTestId, getByText } = await render(
      <PantallaActivaProvider>
        <CustomTabBar {...propsDe(0)} />
      </PantallaActivaProvider>,
    );
    expect(getByTestId("tab-Ruta")).toBeTruthy();
    expect(getByTestId("tab-central")).toBeTruthy();
    expect(getByTestId("tab-Clientes")).toBeTruthy();
    expect(getByText("Día")).toBeTruthy();
  });

  it("navega al tab central al tocarlo", async () => {
    const navigate = jest.fn();
    const { getByTestId } = await render(
      <PantallaActivaProvider>
        <CustomTabBar {...propsDe(0, navigate)} />
      </PantallaActivaProvider>,
    );
    await fireEvent.press(getByTestId("tab-central"));
    expect(navigate).toHaveBeenCalledWith("Dia");
  });

  it("reserva el espacio del inset inferior de la barra de navegación del sistema", async () => {
    const { getByTestId } = await render(
      <PantallaActivaProvider>
        <CustomTabBar {...propsDe(0)} insets={{ top: 0, right: 0, bottom: 34, left: 0 }} />
      </PantallaActivaProvider>,
    );
    const barra = getByTestId("tab-bar").props.style;
    expect(barra[1].paddingBottom).toBe(42);
  });

  it("cierra la pantalla activa (detalle) al cambiar de tab", async () => {
    const navigate = jest.fn();
    const { getByTestId } = await render(
      <PantallaActivaProvider>
        <CustomTabBar {...propsDe(0, navigate)} />
      </PantallaActivaProvider>,
    );
    await fireEvent.press(getByTestId("tab-Clientes"));
    expect(navigate).toHaveBeenCalledWith("Clientes");
  });

  it("usa boxShadow moderno en el FAB central (sin shadow/elevation legacy)", async () => {
    const { getByTestId } = await render(
      <PantallaActivaProvider>
        <CustomTabBar {...propsDe(0)} />
      </PantallaActivaProvider>,
    );
    const fab = getByTestId("tab-central");
    const estilos = Array.isArray(fab.props.style) ? fab.props.style[0] : fab.props.style;
    expect(estilos.boxShadow).toBeTruthy();
    expect(estilos.elevation).toBeUndefined();
    expect(estilos.shadowColor).toBeUndefined();
  });
});