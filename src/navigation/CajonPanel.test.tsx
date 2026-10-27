let mockSesionValue: unknown = null;
let mockPerfilValue: unknown = null;
const mockLogoutAdmin = jest.fn();
const mockRefrescarPerfil = jest.fn().mockResolvedValue(undefined);
const mockAplicarPerfil = jest.fn().mockResolvedValue(undefined);
jest.mock("@core/session/admin-session-context", () => ({
  useAdminSession: () => ({
    sesion: mockSesionValue,
    perfil: mockPerfilValue,
    loading: false,
    refrescarPerfil: mockRefrescarPerfil,
    aplicarPerfil: mockAplicarPerfil,
    logout: mockLogoutAdmin,
  }),
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

async function renderCajon(
  activo: DestinoPanel | null = null,
  alNavegar = jest.fn(),
  onAbrirPerfil = jest.fn(),
) {
  const utils = await render(
    <ThemeProvider>
      <MenuPanelProvider activo={activo} alNavegar={alNavegar}>
        <Abrir />
        <CajonPanel onAbrirPerfil={onAbrirPerfil} />
      </MenuPanelProvider>
    </ThemeProvider>,
  );
  return { ...utils, alNavegar, onAbrirPerfil };
}

const DUENO = {
  token: "t",
  adminId: "a-1",
  email: "dueno-a@demo.test",
  nombre: "Dueño Demo",
  username: "dueno",
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

const PERFIL = {
  nombre: "Dueño Demo",
  username: "dueno",
  telefono: null,
  avatarUrl: null,
  email: "dueno-a@demo.test",
  role: "owner",
  tenantName: "Cobranza Demo",
};

describe("CajonPanel (HU-DS-11, D-34; menú v2, HU-UX-11)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSesionValue = DUENO;
    mockPerfilValue = PERFIL;
  });

  it("muestra el logo horizontal, los grupos plegados y la tarjeta fija al pie", async () => {
    const { getByTestId, queryByTestId } = await renderCajon();
    expect(getByTestId("cajon-panel")).toHaveProp("pointerEvents", "auto");
    expect(getByTestId("cajon-marca")).toHaveProp("accessibilityLabel", "SolversHub");
    expect(getByTestId("cajon-pie")).toBeTruthy();
    expect(getByTestId("cajon-cuenta")).toBeTruthy();
    expect(mockRefrescarPerfil).toHaveBeenCalledTimes(1);

    expect(getByTestId("cajon-grupo-operacion")).toBeTruthy();
    expect(getByTestId("cajon-grupo-negocio")).toBeTruthy();
    expect(queryByTestId("cajon-grupo-asistente")).toBeNull();
    expect(queryByTestId("cajon-grupo-cuenta")).toBeNull();
    expect(queryByTestId("cajon-grupo-plataforma")).toBeNull();

    // Con todos los grupos plegados no se monta ninguna fila.
    expect(queryByTestId("cajon-item-resumen")).toBeNull();
    expect(queryByTestId("cajon-item-cobranza")).toBeNull();

    await fireEvent.press(getByTestId("cajon-grupo-operacion"));
    expect(getByTestId("cajon-item-resumen")).toBeTruthy();
    expect(getByTestId("cajon-item-conversaciones")).toBeTruthy();
    expect(queryByTestId("cajon-item-clientes")).toBeNull();

    await fireEvent.press(getByTestId("cajon-grupo-negocio"));
    expect(getByTestId("cajon-item-cobranza")).toBeTruthy();
    expect(getByTestId("cajon-item-ventas")).toBeTruthy();
    expect(queryByTestId("cajon-item-agenda")).toBeNull();

    await fireEvent.press(getByTestId("cajon-grupo-negocio"));
    expect(queryByTestId("cajon-item-cobranza")).toBeNull();
  });

  it("el grupo del destino activo arranca desplegado", async () => {
    const { getByTestId, queryByTestId } = await renderCajon({
      modulo: "cobranza",
      pestana: "gestores",
      entrada: "cobranza",
    });
    expect(getByTestId("cajon-item-cobranza")).toHaveProp("accessibilityState", {
      selected: true,
      disabled: false,
    });
    expect(queryByTestId("cajon-item-resumen")).toBeNull();
  });

  it("tocar una entrada abre su primera pestaña permitida y cierra el cajón", async () => {
    mockSesionValue = { ...DUENO, permissions: { "pack_cobranza:gestores": "write", pack_commerce: "read" } };
    const { getByTestId, alNavegar } = await renderCajon({
      modulo: "cobranza",
      pestana: "gestores",
      entrada: "cobranza",
    });
    await fireEvent.press(getByTestId("cajon-item-cobranza"));

    expect(alNavegar).toHaveBeenCalledWith({ modulo: "cobranza", pestana: "gestores", entrada: "cobranza" });
    expect(getByTestId("cajon-panel")).toHaveProp("pointerEvents", "none");
  });

  it("resalta la entrada que contiene el destino activo", async () => {
    mockSesionValue = { ...DUENO, permissions: { settings: "write", collaborators: "read" } };
    const { getByTestId } = await renderCajon({ modulo: "herramientas", pestana: "fallos" });
    expect(getByTestId("cajon-item-configuracion")).toHaveProp("accessibilityState", {
      selected: true,
      disabled: false,
    });
    expect(getByTestId("cajon-item-equipo")).toHaveProp("accessibilityState", {
      selected: false,
      disabled: false,
    });
  });

  it("un destino sin pestaña (push, back) no resalta ninguna fila de ese módulo", async () => {
    const { getByTestId } = await renderCajon({ modulo: "cobranza" });
    await fireEvent.press(getByTestId("cajon-grupo-negocio"));
    expect(getByTestId("cajon-item-cobranza")).toHaveProp("accessibilityState", {
      selected: false,
      disabled: false,
    });
  });

  it("master ve Plataforma y, en desarrollo, el Catálogo de UI al desplegarlos", async () => {
    mockSesionValue = { ...DUENO, role: "master", permissions: {} };
    const { getByTestId } = await renderCajon();
    expect(getByTestId("cajon-grupo-plataforma")).toBeTruthy();
    expect(getByTestId("cajon-grupo-desarrollo")).toBeTruthy();

    await fireEvent.press(getByTestId("cajon-grupo-plataforma"));
    expect(getByTestId("cajon-item-negocios")).toBeTruthy();
    await fireEvent.press(getByTestId("cajon-grupo-desarrollo"));
    expect(getByTestId("cajon-item-catalogo")).toBeTruthy();
  });

  it("la tarjeta muestra nombre y correo, y el submenú cambia el tema y cierra sesión", async () => {
    const { getByTestId, getByText } = await renderCajon();
    expect(getByText("Dueño Demo")).toBeTruthy();
    expect(getByText("dueno-a@demo.test")).toBeTruthy();
    expect(getByTestId("cajon-cuenta")).toHaveProp("accessibilityState", { expanded: false });

    await fireEvent.press(getByTestId("cajon-cuenta"));
    expect(getByTestId("cajon-cuenta-submenu")).toBeTruthy();
    expect(getByTestId("cajon-cuenta")).toHaveProp("accessibilityState", { expanded: true });
    expect(getByTestId("cajon-tema")).toHaveProp("value", true);

    await fireEvent(getByTestId("cajon-tema"), "valueChange", false);
    expect(getByTestId("cajon-tema")).toHaveProp("value", false);

    await fireEvent.press(getByTestId("cajon-logout"));
    await waitFor(() => expect(mockLogoutAdmin).toHaveBeenCalledTimes(1));
    expect(getByTestId("cajon-panel")).toHaveProp("pointerEvents", "none");
  });

  it("Perfil cierra el cajón y avisa al shell para abrir la ruta", async () => {
    const { getByTestId, onAbrirPerfil } = await renderCajon();
    await fireEvent.press(getByTestId("cajon-cuenta"));
    await fireEvent.press(getByTestId("cajon-perfil"));

    expect(onAbrirPerfil).toHaveBeenCalledTimes(1);
    expect(getByTestId("cajon-panel")).toHaveProp("pointerEvents", "none");
  });
});
