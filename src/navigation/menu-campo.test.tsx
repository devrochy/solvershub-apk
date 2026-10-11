import { fireEvent, render, screen, waitFor, within } from "@testing-library/react-native";
import { MenuLateral } from "./MenuLateral";
import { BotonMenu } from "../modules/cobranza/components/BotonMenu";
import { CarteraFlujo } from "../modules/cobranza/navigation/CarteraFlujo";
import { MenuLateralProvider } from "../modules/cobranza/navigation/menu-lateral-context";
import { CarteraActivaContext } from "../modules/cobranza/session/cartera-activa-context";
import { SessionContext, SessionValue } from "../modules/cobranza/session/session-context";

// D-SPEC-29-6 (HU-DS-10): el menú lateral de campo conserva sus ítems y filtros
// después de migrar al kit. Se arma con el `CarteraFlujo` real (que registra los
// ítems) y el `MenuLateral` real (que los dibuja); solo las pantallas van simuladas.

jest.mock("@core/session/admin-session-context", () => ({
  useAdminSession: () => ({ sesion: null, loading: false, logout: jest.fn() }),
}));
jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));
jest.mock("../modules/cobranza/navigation/pantalla-activa-context", () => ({
  usePantallaActiva: () => ({ pantalla: null, cerrar: jest.fn() }),
}));
jest.mock("../modules/cobranza/navigation/trayectos-overlay-context", () => ({
  useTrayectosOverlay: () => ({ contenido: null, cerrar: jest.fn() }),
}));
jest.mock("../modules/cobranza/navigation/OverlaysActivos", () => ({ OverlaysActivos: () => null }));
jest.mock("../modules/cobranza/screens/CarteraDetalleScreen", () => ({ CarteraDetalleScreen: () => null }));
jest.mock("../modules/cobranza/screens/TrayectoDiarioScreen", () => ({ TrayectoDiarioScreen: () => null }));
jest.mock("../modules/cobranza/screens/ClientesScreen", () => ({ ClientesScreen: () => null }));

const cartera = {
  id: "6",
  nombre: "test-Cartera Centro",
  estatus: "activo",
  tipoInteres: 20,
  numCuotas: 8,
  config: {} as never,
  permisos: [],
};

async function renderCampo(carteras = [cartera, { ...cartera, id: "7", nombre: "test-Cartera Sur" }]) {
  const session: SessionValue = {
    gestor: { id: "20", usuario: "gestor1", nombre: "Test", apellido: "Gestor", rol: "gestor" },
    loading: false,
    api: { misCarteras: jest.fn().mockResolvedValue(carteras) } as unknown as SessionValue["api"],
    login: jest.fn(),
    logout: jest.fn(),
    actualizarPerfil: jest.fn(),
    requiereVinculacion: false,
    marcarDispositivoVinculado: jest.fn(),
    negociosPendientes: [],
    membresiaToken: null,
    invitaciones: [],
    seleccionarNegocio: jest.fn(),
    resolverInvitacion: jest.fn(),
  };
  await render(
    <SessionContext.Provider value={session}>
      <CarteraActivaContext.Provider
        value={{
          carteraActiva: { carteraId: "6", carteraNombre: "test-Cartera Centro" } as never,
          setCarteraActiva: jest.fn(),
        }}
      >
        <MenuLateralProvider>
          <CarteraFlujo
            route={{ key: "c", name: "Cartera", params: undefined } as never}
            navigation={{ navigate: jest.fn() } as never}
          />
          <BotonMenu />
          <MenuLateral />
        </MenuLateralProvider>
      </CarteraActivaContext.Provider>
    </SessionContext.Provider>,
  );
  await fireEvent.press(screen.getByTestId("btn-menu"));
}

describe("menú lateral de campo (D-SPEC-29-6)", () => {
  it("con dos carteras muestra Inicio, Carteras, Clientes (Todos, Al día, En mora, Sin préstamos) y Diario", async () => {
    await renderCampo();

    await waitFor(() => expect(screen.getByTestId("menu-item-carteras-lista")).toBeTruthy());
    expect(within(screen.getByTestId("menu-item-seccion-inicio")).getByText("Inicio")).toBeTruthy();
    expect(within(screen.getByTestId("menu-item-carteras-lista")).getByText("Carteras")).toBeTruthy();

    // Carteras se despliega con la lista de carteras.
    await fireEvent.press(screen.getByTestId("menu-item-carteras-lista"));
    expect(screen.getByText("test-Cartera Sur")).toBeTruthy();

    // El grupo de la cartera activa trae Clientes (desplegable) y Diario, en ese orden.
    const grupo = screen.getByTestId("menu-grupo-cartera");
    const clientes = within(grupo).getByTestId("menu-item-seccion-clientes");
    expect(within(clientes).getByText("Clientes")).toBeTruthy();
    expect(within(grupo).getByTestId("menu-item-seccion-diario")).toBeTruthy();
    expect(within(grupo).getByText("Diario")).toBeTruthy();

    await fireEvent.press(clientes);
    const filtros = [
      ["filtro-todos", "Todos"],
      ["filtro-al_dia", "Al día"],
      ["filtro-en_mora", "En mora"],
      ["filtro-sin_prestamos", "Sin préstamos"],
    ];
    for (const [key, label] of filtros) {
      expect(within(screen.getByTestId(`menu-item-${key}`)).getByText(label)).toBeTruthy();
    }
  });

  it("con una sola cartera no muestra el submenú Carteras", async () => {
    await renderCampo([cartera]);

    await waitFor(() => expect(screen.getByTestId("menu-item-seccion-inicio")).toBeTruthy());
    expect(screen.queryByTestId("menu-item-carteras-lista")).toBeNull();
    expect(screen.getByTestId("menu-item-seccion-clientes")).toBeTruthy();
    expect(screen.getByTestId("menu-item-seccion-diario")).toBeTruthy();
  });

  it("los ítems del menú miden al menos 48 dp de alto", async () => {
    await renderCampo();

    await waitFor(() => expect(screen.getByTestId("menu-item-seccion-diario")).toBeTruthy());
    expect(screen.getByTestId("menu-item-seccion-inicio")).toHaveStyle({ minHeight: 48 });
    expect(screen.getByTestId("menu-item-seccion-diario")).toHaveStyle({ minHeight: 48 });
    expect(screen.getByTestId("menu-usuario")).toHaveStyle({ minHeight: 48 });
  });
});
