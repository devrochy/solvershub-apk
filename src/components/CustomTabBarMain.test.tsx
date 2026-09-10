import { fireEvent, render } from "@testing-library/react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { CustomTabBarMain } from "./CustomTabBarMain";

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
        { key: "perfil", name: "Perfil" },
        { key: "rutas", name: "Rutas" },
        { key: "config", name: "Configuracion" },
      ],
      routeNames: ["Perfil", "Rutas", "Configuracion"],
      key: "tab",
      stale: false,
      type: "tab",
    } as never,
    descriptors: {
      perfil: { options: { title: "Perfil" } } as never,
      rutas: { options: { title: "Rutas" } } as never,
      config: { options: { title: "Configuración" } } as never,
    },
    navigation: {
      emit: jest.fn(() => ({ defaultPrevented: false })),
      navigate,
    } as never,
    insets,
  };
}

describe("CustomTabBarMain", () => {
  it("renderiza Perfil, Rutas (central) y Configuración", async () => {
    const { getByTestId, getByText } = await render(
      <CustomTabBarMain {...propsDe(1)} />,
    );

    expect(getByTestId("tab-main-Perfil")).toBeTruthy();
    expect(getByTestId("tab-main-central")).toBeTruthy();
    expect(getByTestId("tab-main-Configuracion")).toBeTruthy();
    expect(getByText("Rutas")).toBeTruthy();
  });

  it("navega a Rutas al tocar el tab central", async () => {
    const navigate = jest.fn();
    const { getByTestId } = await render(
      <CustomTabBarMain {...propsDe(0, navigate)} />,
    );

    await fireEvent.press(getByTestId("tab-main-central"));

    expect(navigate).toHaveBeenCalledWith("Rutas");
  });

  it("navega a Configuración al tocar el lateral derecho", async () => {
    const navigate = jest.fn();
    const { getByTestId } = await render(
      <CustomTabBarMain {...propsDe(1, navigate)} />,
    );

    await fireEvent.press(getByTestId("tab-main-Configuracion"));

    expect(navigate).toHaveBeenCalledWith("Configuracion");
  });

  it("reserva el espacio del inset inferior de la barra del sistema", async () => {
    const { getByTestId } = await render(
      <CustomTabBarMain
        {...propsDe(1, jest.fn(), { top: 0, right: 0, bottom: 34, left: 0 })}
      />,
    );

    const barra = getByTestId("tab-bar-main").props.style;
    expect(barra[1].paddingBottom).toBe(42);
  });
});
