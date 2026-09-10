import { render } from "@testing-library/react-native";
import { RutaFlujo } from "./RutaFlujo";

jest.mock("./TabsNavigator", () => ({ TabsNavigator: () => null }));
jest.mock("./OverlaysActivos", () => ({ OverlaysActivos: () => null }));
jest.mock("./pantalla-activa-context", () => ({
  usePantallaActiva: () => ({ pantalla: null, cerrar: jest.fn() }),
}));
jest.mock("./trayectos-overlay-context", () => ({
  useTrayectosOverlay: () => ({ contenido: null, cerrar: jest.fn() }),
}));

describe("RutaFlujo", () => {
  it("monta el flujo de ruta (tabs + overlays) sin errores", async () => {
    const { toJSON } = await render(<RutaFlujo />);

    expect(toJSON()).toBeTruthy();
  });
});
