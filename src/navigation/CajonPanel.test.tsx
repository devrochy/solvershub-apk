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

describe("CajonPanel (HU-DS-11, D-34; menú v2, HU-UX-11)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSesionValue = DUENO;
  });

  it("lista solo las entradas con alguna pestaña permitida, agrupadas por tarea", async () => {
    const { getByTestId, queryByTestId } = await renderCajon();
    expect(getByTestId("cajon-panel")).toHaveProp("pointerEvents", "auto");

    expect(getByTestId("cajon-grupo-operacion")).toBeTruthy();
    expect(getByTestId("cajon-grupo-negocio")).toBeTruthy();
    expect(queryByTestId("cajon-grupo-asistente")).toBeNull();
    expect(queryByTestId("cajon-grupo-cuenta")).toBeNull();
    expect(queryByTestId("cajon-grupo-plataforma")).toBeNull();
    expect(queryByTestId("cajon-grupo-herramientas")).toBeNull();

    // Los grupos arrancan abiertos: una fila por entrada, sin hermanas por pestaña.
    expect(getByTestId("cajon-item-resumen")).toBeTruthy();
    expect(getByTestId("cajon-item-conversaciones")).toBeTruthy();
    expect(queryByTestId("cajon-item-clientes")).toBeNull();
    expect(getByTestId("cajon-item-cobranza")).toBeTruthy();
    expect(getByTestId("cajon-item-ventas")).toBeTruthy();
    expect(queryByTestId("cajon-item-agenda")).toBeNull();
    expect(queryByTestId("cajon-item-cobranza-gestores")).toBeNull();

    await fireEvent.press(getByTestId("cajon-grupo-negocio"));
    expect(queryByTestId("cajon-item-cobranza")).toBeNull();
  });

  it("tocar una entrada abre su primera pestaña permitida y cierra el cajón", async () => {
    mockSesionValue = { ...DUENO, permissions: { "pack_cobranza:gestores": "write", pack_commerce: "read" } };
    const { getByTestId, alNavegar } = await renderCajon();
    await fireEvent.press(getByTestId("cajon-item-cobranza"));

    expect(alNavegar).toHaveBeenCalledWith({ modulo: "cobranza", pestana: "gestores" });
    expect(getByTestId("cajon-panel")).toHaveProp("pointerEvents", "none");
  });

  it("resalta la entrada que contiene el destino activo", async () => {
    mockSesionValue = { ...DUENO, permissions: { settings: "write", collaborators: "read" } };
    const { getByTestId } = await renderCajon({ modulo: "herramientas", pestana: "fallos" });
    expect(getByTestId("cajon-item-configuracion")).toHaveProp("accessibilityState", {
      selected: true,
      disabled: false,
    });
    // Equipo comparte módulo con Configuración, pero no contiene el destino.
    expect(getByTestId("cajon-item-equipo")).toHaveProp("accessibilityState", {
      selected: false,
      disabled: false,
    });
  });

  it("un destino sin pestaña (push, back) no resalta ninguna fila de ese módulo", async () => {
    const { getByTestId } = await renderCajon({ modulo: "cobranza" });
    expect(getByTestId("cajon-item-cobranza")).toHaveProp("accessibilityState", {
      selected: false,
      disabled: false,
    });
  });

  it("master ve Plataforma y, en desarrollo, el Catálogo de UI", async () => {
    mockSesionValue = { ...DUENO, role: "master", permissions: {} };
    const { getByTestId } = await renderCajon();
    expect(getByTestId("cajon-grupo-plataforma")).toBeTruthy();
    expect(getByTestId("cajon-item-negocios")).toBeTruthy();
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
