import { render } from "@testing-library/react-native";
import { CarteraFlujo } from "./CarteraFlujo";

jest.mock("./TabsNavigator", () => ({ TabsNavigator: () => null }));
jest.mock("./OverlaysActivos", () => ({ OverlaysActivos: () => null }));
jest.mock("./pantalla-activa-context", () => ({
  usePantallaActiva: () => ({ pantalla: null, cerrar: jest.fn() }),
}));
jest.mock("./trayectos-overlay-context", () => ({
  useTrayectosOverlay: () => ({ contenido: null, cerrar: jest.fn() }),
}));

describe("CarteraFlujo", () => {
  it("monta el flujo de cartera (tabs + overlays) sin errores", async () => {
    const { toJSON } = await render(<CarteraFlujo />);

    expect(toJSON()).toBeTruthy();
  });
});
