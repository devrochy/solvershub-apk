import { fireEvent, render } from "@testing-library/react-native";
import { MenuLateral } from "./MenuLateral";
import { BotonMenu } from "./BotonMenu";
import { MenuLateralProvider } from "../navigation/menu-lateral-context";
import { SessionContext, SessionValue } from "../session/session-context";

const mockNavigate = jest.fn();
jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

async function renderMenu(logout: jest.Mock = jest.fn()) {
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

  it("navega a la sección elegida y cierra el menú", async () => {
    const { getByTestId } = await renderMenu();

    await fireEvent.press(getByTestId("btn-menu"));
    await fireEvent.press(getByTestId("menu-item-Perfil"));

    expect(mockNavigate).toHaveBeenCalledWith("Main", { screen: "Perfil" });
    expect(getByTestId("menu-lateral")).toHaveProp("pointerEvents", "none");
  });

  it("cierra sesión desde el menú", async () => {
    const { getByTestId, logout } = await renderMenu();

    await fireEvent.press(getByTestId("btn-menu"));
    await fireEvent.press(getByTestId("menu-logout"));

    expect(logout).toHaveBeenCalled();
  });
});
