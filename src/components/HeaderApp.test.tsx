import { render } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { HeaderApp } from "./HeaderApp";
import { SessionContext, SessionValue } from "../session/session-context";

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

function renderHeader() {
  const valor: SessionValue = {
    gestor: { id: "1", usuario: "gestor1", nombre: "Test", apellido: "Uno", rol: "gestor" },
    loading: false,
    api: {} as SessionValue["api"],
    login: jest.fn(),
    logout: jest.fn(),
    actualizarPerfil: jest.fn(),
  };
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <SessionContext.Provider value={valor}>
        <HeaderApp titulo="Inicio" />
      </SessionContext.Provider>
    </SafeAreaProvider>,
  );
}

describe("HeaderApp", () => {
  it("no muestra botón atrás (navegación solo por menú/swipe)", async () => {
    const { queryByTestId, getByTestId } = await renderHeader();

    expect(queryByTestId("btn-volver")).toBeNull();
    expect(getByTestId("header-notificaciones")).toBeTruthy();
    expect(getByTestId("btn-menu")).toBeTruthy();
  });
});
