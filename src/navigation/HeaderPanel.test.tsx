let mockSesionValue: unknown = { token: "t", adminId: "a-1", role: "owner", tenantName: "Cobranza Demo", permissions: {} };
jest.mock("@core/session/admin-session-context", () => ({
  useAdminSession: () => ({ sesion: mockSesionValue, loading: false, logout: jest.fn() }),
}));

import { fireEvent, render } from "@testing-library/react-native";
import { Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemeProvider } from "@core/theme/theme-context";
import { areaTactil } from "@shared/ui/test-utils";
import { HeaderPanel } from "./HeaderPanel";
import { MenuPanelProvider, useMenuPanel } from "./menu-panel-context";

function EstadoCajon() {
  const { abierto } = useMenuPanel();
  return <Text testID="estado-cajon">{abierto ? "abierto" : "cerrado"}</Text>;
}

async function renderHeader() {
  return render(
    <ThemeProvider>
      <MenuPanelProvider activo={null} alNavegar={jest.fn()}>
        <HeaderPanel titulo="Comercio" />
        <EstadoCajon />
      </MenuPanelProvider>
    </ThemeProvider>,
  );
}

describe("HeaderPanel (HU-DS-11)", () => {
  afterEach(() => {
    (useSafeAreaInsets as unknown as jest.Mock).mockReturnValue({ top: 0, right: 0, bottom: 0, left: 0 });
  });

  it("muestra el módulo y el negocio, y la hamburguesa abre el cajón", async () => {
    const { getByTestId } = await renderHeader();
    expect(getByTestId("panel-titulo").props.children).toBe("Comercio");
    expect(getByTestId("panel-negocio").props.children).toBe("Cobranza Demo");
    expect(getByTestId("panel-menu")).toHaveProp("accessibilityLabel", "Abrir menú");
    expect(areaTactil(getByTestId("panel-menu")).alto).toBeGreaterThanOrEqual(48);

    expect(getByTestId("estado-cajon").props.children).toBe("cerrado");
    await fireEvent.press(getByTestId("panel-menu"));
    expect(getByTestId("estado-cajon").props.children).toBe("abierto");
  });

  it("ya no lleva el toggle de tema: vive en la tarjeta de la cuenta del cajón", async () => {
    const { queryByTestId } = await renderHeader();
    expect(queryByTestId("panel-tema")).toBeNull();
  });

  it("reserva el área segura superior (edge-to-edge)", async () => {
    (useSafeAreaInsets as unknown as jest.Mock).mockReturnValue({ top: 32, right: 0, bottom: 0, left: 0 });
    const { getByTestId } = await renderHeader();
    expect(getByTestId("panel-header")).toHaveStyle({ paddingTop: 32 });
  });
});
