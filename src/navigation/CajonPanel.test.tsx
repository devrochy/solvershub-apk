let mockSesionValue: unknown = null;
const mockLogoutAdmin = jest.fn();
jest.mock("@core/session/admin-session-context", () => ({
  useAdminSession: () => ({ sesion: mockSesionValue, loading: false, logout: mockLogoutAdmin }),
}));

import { useEffect } from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { ThemeProvider } from "@core/theme/theme-context";
import { CajonPanel } from "./CajonPanel";
import { MenuPanelProvider, useMenuPanel, type DestinoPanel } from "./menu-panel-context";

function Abrir() {
  const { abrir } = useMenuPanel();
  useEffect(() => abrir(), [abrir]);
  return null;
}

async function renderCajon(activo: DestinoPanel | null = null, alNavegar = jest.fn()) {
  const utils = await render(
    <ThemeProvider>
      <MenuPanelProvider activo={activo} alNavegar={alNavegar}>
        <Abrir />
        <CajonPanel />
      </MenuPanelProvider>
    </ThemeProvider>,
  );
  return { ...utils, alNavegar };
}

const DUENO = {
  token: "t",
  adminId: "a-1",
  email: "dueno-a@demo.test",
  role: "owner",
  tenantName: "Cobranza Demo",
  permissions: {
    dashboard: "read",
    conversations: "read",
    "pack_cobranza:resumen": "read",
    "pack_cobranza:gestores": "write",
    pack_commerce: "read",
  },
};

describe("CajonPanel (HU-DS-11, D-34)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSesionValue = DUENO;
  });

  it("lista solo los grupos y secciones de los permisos, con los packs plegados", async () => {
    const { getByTestId, queryByTestId } = await renderCajon();
    expect(getByTestId("cajon-panel")).toHaveProp("pointerEvents", "auto");

    expect(getByTestId("cajon-grupo-operacion")).toBeTruthy();
    expect(getByTestId("cajon-grupo-pack_cobranza")).toBeTruthy();
    expect(getByTestId("cajon-grupo-pack_commerce")).toBeTruthy();
    expect(getByTestId("cajon-grupo-herramientas")).toBeTruthy();
    expect(queryByTestId("cajon-grupo-pack_calendar")).toBeNull();
    expect(queryByTestId("cajon-grupo-negocio")).toBeNull();
    expect(queryByTestId("cajon-grupo-plataforma")).toBeNull();

    // Operación está desplegado; los packs, plegados.
    expect(getByTestId("cajon-item-inicio")).toBeTruthy();
    expect(getByTestId("cajon-item-conversaciones-conversaciones")).toBeTruthy();
    expect(queryByTestId("cajon-item-conversaciones-leads")).toBeNull();
    expect(queryByTestId("cajon-item-cobranza-gestores")).toBeNull();

    await fireEvent.press(getByTestId("cajon-grupo-pack_cobranza"));
    expect(getByTestId("cajon-item-cobranza-resumen")).toBeTruthy();
    expect(getByTestId("cajon-item-cobranza-gestores")).toBeTruthy();
    expect(queryByTestId("cajon-item-cobranza-carteras")).toBeNull();
  });

  it("tocar una sección navega al módulo en su pestaña y cierra el cajón", async () => {
    const { getByTestId, alNavegar } = await renderCajon();
    await fireEvent.press(getByTestId("cajon-grupo-pack_commerce"));
    await fireEvent.press(getByTestId("cajon-item-comercio-pedidos"));

    expect(alNavegar).toHaveBeenCalledWith({ modulo: "comercio", pestana: "pedidos" });
    expect(getByTestId("cajon-panel")).toHaveProp("pointerEvents", "none");
  });

  it("resalta el destino activo y mantiene abierto su grupo", async () => {
    const { getByTestId } = await renderCajon({ modulo: "cobranza", pestana: "gestores" });
    // El pack arranca plegado, pero contiene el ítem activo.
    expect(getByTestId("cajon-item-cobranza-gestores")).toHaveProp("accessibilityState", {
      selected: true,
      disabled: false,
    });
    expect(getByTestId("cajon-item-cobranza-resumen")).toHaveProp("accessibilityState", {
      selected: false,
      disabled: false,
    });
  });

  it("un destino sin pestaña (push, back) abre el grupo pero no resalta ninguna fila", async () => {
    const { getByTestId } = await renderCajon({ modulo: "cobranza" });
    expect(getByTestId("cajon-item-cobranza-resumen")).toHaveProp("accessibilityState", {
      selected: false,
      disabled: false,
    });
    expect(getByTestId("cajon-item-cobranza-gestores")).toHaveProp("accessibilityState", {
      selected: false,
      disabled: false,
    });
  });

  it("master ve Plataforma y, en desarrollo, el Catálogo de UI", async () => {
    mockSesionValue = { ...DUENO, role: "master", permissions: {} };
    const { getByTestId } = await renderCajon();
    expect(getByTestId("cajon-grupo-plataforma")).toBeTruthy();
    expect(getByTestId("cajon-item-herramientas-negocios")).toBeTruthy();
    expect(getByTestId("cajon-grupo-desarrollo")).toBeTruthy();
    expect(getByTestId("cajon-item-catalogo")).toBeTruthy();
  });

  it("la cuenta muestra negocio y correo, alterna el tema y cierra sesión", async () => {
    const { getByTestId, getByText } = await renderCajon();
    expect(getByText("Cobranza Demo")).toBeTruthy();
    expect(getByText("dueno-a@demo.test")).toBeTruthy();

    // Oscuro por defecto → ofrece «Modo claro».
    expect(getByText("Modo claro")).toBeTruthy();
    await fireEvent.press(getByTestId("cajon-tema"));
    expect(getByText("Modo oscuro")).toBeTruthy();

    await fireEvent.press(getByTestId("cajon-logout"));
    await waitFor(() => expect(mockLogoutAdmin).toHaveBeenCalledTimes(1));
    expect(getByTestId("cajon-panel")).toHaveProp("pointerEvents", "none");
  });
});
