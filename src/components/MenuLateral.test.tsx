import { useEffect } from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { MenuLateral } from "./MenuLateral";
import { BotonMenu } from "./BotonMenu";
import { MenuLateralProvider, useMenuLateral, type MenuItem } from "../navigation/menu-lateral-context";
import { SessionContext, SessionValue } from "../session/session-context";

const mockNavigate = jest.fn();
jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

function Registrar({ items }: { items: MenuItem[] }) {
  const { setItemsExtra } = useMenuLateral();
  useEffect(() => {
    setItemsExtra(items);
    return () => setItemsExtra([]);
  }, [items, setItemsExtra]);
  return null;
}

async function renderMenu(items: MenuItem[] = [], logout: jest.Mock = jest.fn()) {
  const valor: SessionValue = {
    gestor: { id: 1, usuario: "gestor1", nombre: "Test", apellido: "Uno", rol: "gestor" },
    loading: false,
    api: {} as SessionValue["api"],
    login: jest.fn(),
    logout,
    actualizarPerfil: jest.fn(),
  };
  const utils = await render(
    <MenuLateralProvider>
      <SessionContext.Provider value={valor}>
        <Registrar items={items} />
        <BotonMenu />
        <MenuLateral />
      </SessionContext.Provider>
    </MenuLateralProvider>,
  );
  return { ...utils, logout };
}

describe("MenuLateral", () => {
  beforeEach(() => jest.clearAllMocks());

  it("el botón hamburguesa abre el menú y el backdrop lo cierra", async () => {
    const { getByTestId } = await renderMenu();

    expect(getByTestId("menu-lateral")).toHaveProp("pointerEvents", "none");

    await fireEvent.press(getByTestId("btn-menu"));
    expect(getByTestId("menu-lateral")).toHaveProp("pointerEvents", "auto");

    await fireEvent.press(getByTestId("menu-backdrop"));
    expect(getByTestId("menu-lateral")).toHaveProp("pointerEvents", "none");
  });

  it("despliega un ítem con subItems y ejecuta el subítem eligido", async () => {
    const alElegir = jest.fn();
    const items: MenuItem[] = [
      {
        key: "carteras",
        label: "Carteras",
        icon: "map",
        subItems: [{ key: "car-6", label: "Cartera Centro", icon: "circle", onPress: alElegir }],
      },
    ];
    const { getByTestId, queryByTestId } = await renderMenu(items);

    await fireEvent.press(getByTestId("btn-menu"));
    expect(queryByTestId("menu-item-car-6")).toBeNull();

    await fireEvent.press(getByTestId("menu-item-carteras"));
    expect(getByTestId("menu-item-car-6")).toBeTruthy();

    await fireEvent.press(getByTestId("menu-item-car-6"));
    expect(alElegir).toHaveBeenCalled();
    expect(getByTestId("menu-lateral")).toHaveProp("pointerEvents", "none");
  });

  it("muestra la tarjeta de usuario y navega a Perfil desde su submenú", async () => {
    const { getByTestId, getByText } = await renderMenu();

    await fireEvent.press(getByTestId("btn-menu"));
    expect(getByText("Test Uno")).toBeTruthy();
    expect(getByText("@gestor1")).toBeTruthy();

    await fireEvent.press(getByTestId("menu-usuario"));
    await fireEvent.press(getByTestId("menu-item-perfil"));

    expect(mockNavigate).toHaveBeenCalledWith("Perfil");
    expect(getByTestId("menu-lateral")).toHaveProp("pointerEvents", "none");
  });

  it("cierra sesión desde el submenú de usuario", async () => {
    const { getByTestId, logout } = await renderMenu();

    await fireEvent.press(getByTestId("btn-menu"));
    await fireEvent.press(getByTestId("menu-usuario"));
    await fireEvent.press(getByTestId("menu-logout"));

    expect(logout).toHaveBeenCalled();
  });
});
