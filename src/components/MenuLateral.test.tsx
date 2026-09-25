import { useEffect } from "react";
import { fireEvent, render, within } from "@testing-library/react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MenuLateral } from "./MenuLateral";
import { BotonMenu } from "./BotonMenu";
import { MenuLateralProvider, useMenuLateral, type MenuItem } from "../navigation/menu-lateral-context";
import { SessionContext, SessionValue } from "../session/session-context";
import { COLORES } from "../theme/theme";

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
    gestor: { id: "1", usuario: "gestor1", nombre: "Test", apellido: "Uno", rol: "gestor" },
    loading: false,
    api: {} as SessionValue["api"],
    login: jest.fn(),
    logout,
    actualizarPerfil: jest.fn(),
    requiereVinculacion: false,
    marcarDispositivoVinculado: jest.fn(),
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

  afterEach(() => {
    (useSafeAreaInsets as unknown as jest.Mock).mockReturnValue({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    });
  });

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

  it("renderiza un grupo como tarjeta con título no interactivo y sus hijos", async () => {
    const items: MenuItem[] = [
      {
        key: "cartera",
        label: "test-Ruta Centro",
        icon: "account-balance-wallet",
        grupo: true,
        subItems: [
          {
            key: "seccion-clientes",
            label: "Clientes",
            icon: "people",
            subItems: [{ key: "filtro-todos", label: "Todos", icon: "list" }],
          },
          { key: "seccion-diario", label: "Diario", icon: "route", onPress: jest.fn() },
        ],
      },
    ];
    const { getByTestId, getByText, queryByTestId } = await renderMenu(items);

    await fireEvent.press(getByTestId("btn-menu"));

    const grupo = getByTestId("menu-grupo-cartera");
    expect(grupo.type).toBe("View");
    expect(getByText("test-Ruta Centro")).toBeTruthy();
    expect(within(grupo).getByTestId("menu-item-seccion-clientes")).toBeTruthy();
    expect(within(grupo).getByTestId("menu-item-seccion-diario")).toBeTruthy();
    expect(queryByTestId("menu-item-cartera")).toBeNull();
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

  it("la tarjeta de usuario usa el color primario del tema", async () => {
    const { getByTestId } = await renderMenu();

    await fireEvent.press(getByTestId("btn-menu"));

    expect(getByTestId("menu-usuario")).toHaveStyle({
      backgroundColor: COLORES.claro.primario,
    });
  });

  it("respeta el safe-area inferior para no quedar bajo los botones del celular", async () => {
    (useSafeAreaInsets as unknown as jest.Mock).mockReturnValue({
      top: 0,
      right: 0,
      bottom: 24,
      left: 0,
    });
    const { getByTestId } = await renderMenu();

    await fireEvent.press(getByTestId("btn-menu"));

    expect(getByTestId("menu-lateral")).toHaveStyle({ paddingBottom: 24 });
  });

  it("muestra el submenú de usuario como tarjeta con fondo y borde", async () => {
    const { getByTestId, queryByTestId } = await renderMenu();

    await fireEvent.press(getByTestId("btn-menu"));
    expect(queryByTestId("menu-usuario-submenu")).toBeNull();

    await fireEvent.press(getByTestId("menu-usuario"));

    expect(getByTestId("menu-usuario-submenu")).toHaveStyle({
      backgroundColor: COLORES.claro.fondo,
      borderWidth: 1,
      borderColor: COLORES.claro.borde,
    });
  });

  it("agrupa el submenú junto a la tarjeta para que no quede hueco entre ambos", async () => {
    const { getByTestId } = await renderMenu();

    await fireEvent.press(getByTestId("btn-menu"));
    await fireEvent.press(getByTestId("menu-usuario"));

    const zona = getByTestId("menu-usuario-zona");
    expect(within(zona).getByTestId("menu-usuario-submenu")).toBeTruthy();
    expect(within(zona).getByTestId("menu-usuario")).toBeTruthy();
  });

  it("el panel usa radios continuos, borde derecho y sombra moderna", async () => {
    const { getByTestId } = await renderMenu();

    await fireEvent.press(getByTestId("btn-menu"));

    expect(getByTestId("menu-lateral")).toHaveStyle({
      borderTopRightRadius: 20,
      borderBottomRightRadius: 20,
      borderRightWidth: 1,
      borderColor: COLORES.claro.borde,
      boxShadow: "8px 0 24px rgba(15, 23, 42, 0.22)",
    });
  });

  it("marca el ítem activo con una barra de acento", async () => {
    const items: MenuItem[] = [
      { key: "inicio", label: "Inicio", icon: "home", activo: true },
      { key: "clientes", label: "Clientes", icon: "people" },
    ];
    const { getByTestId, queryByTestId } = await renderMenu(items);

    await fireEvent.press(getByTestId("btn-menu"));

    expect(getByTestId("menu-item-accent-inicio")).toBeTruthy();
    expect(queryByTestId("menu-item-accent-clientes")).toBeNull();
  });
});
