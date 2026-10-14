jest.mock("expo-secure-store");
jest.mock("expo-status-bar", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return { StatusBar: (props: { style: string }) => React.createElement(Text, { testID: "status-bar" }, props.style) };
});

let mockSesionValue: unknown = null;
jest.mock("@core/session/admin-session-context", () => ({
  useAdminSession: () => ({ sesion: mockSesionValue, loading: false, logout: jest.fn() }),
}));

import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { ThemeProvider } from "@core/theme/theme-context";
import { emitirNavegacion } from "@shared/navegacion-evento";
import { catalogoDisponible, PanelShell } from "./PanelShell";

async function renderShell() {
  return render(
    <ThemeProvider>
      <PanelShell />
    </ThemeProvider>,
  );
}

const DUENO = {
  token: "t",
  adminId: "a-1",
  role: "owner",
  tenantName: "Cobranza Demo",
  permissions: {
    dashboard: "read",
    conversations: "read",
    "pack_cobranza:resumen": "read",
    "pack_cobranza:clientes": "read",
    pack_commerce: "read",
  },
};

describe("PanelShell (HU-APP-03, HU-DS-11)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSesionValue = null;
  });

  it("dueño con cobranza y comercio: header del módulo y cajón solo con sus secciones", async () => {
    mockSesionValue = DUENO;
    const { findByTestId, getByTestId, queryByTestId } = await renderShell();

    expect((await findByTestId("panel-titulo")).props.children).toBe("Resumen");
    await fireEvent.press(getByTestId("panel-menu"));
    expect(getByTestId("cajon-panel")).toHaveProp("pointerEvents", "auto");
    expect(getByTestId("cajon-grupo-operacion")).toBeTruthy();
    expect(getByTestId("cajon-grupo-pack_cobranza")).toBeTruthy();
    expect(getByTestId("cajon-grupo-pack_commerce")).toBeTruthy();
    // Calendario y Negocio sin permiso → no aparecen.
    expect(queryByTestId("cajon-grupo-pack_calendar")).toBeNull();
    expect(queryByTestId("cajon-grupo-negocio")).toBeNull();
  });

  it("una sección del cajón abre el módulo en su pestaña interna", async () => {
    mockSesionValue = DUENO;
    const { findByTestId, getByTestId } = await renderShell();
    await findByTestId("panel-menu");

    await fireEvent.press(getByTestId("panel-menu"));
    await fireEvent.press(getByTestId("cajon-grupo-pack_commerce"));
    await fireEvent.press(getByTestId("cajon-item-comercio-pedidos"));

    await waitFor(() => expect(getByTestId("panel-titulo").props.children).toBe("Comercio"));
    await waitFor(() => expect(getByTestId("comercio-pedidos")).toHaveStyle({ borderBottomWidth: 2 }));
    expect(getByTestId("cajon-panel")).toHaveProp("pointerEvents", "none");
  });

  it("una sección de un módulo con stack (Cobranza) llega a su pestaña por los params anidados", async () => {
    mockSesionValue = { token: "t", adminId: "a-6", role: "master", permissions: {} };
    const { findByTestId, getByTestId } = await renderShell();
    await findByTestId("panel-menu");

    await fireEvent.press(getByTestId("panel-menu"));
    await fireEvent.press(getByTestId("cajon-grupo-pack_cobranza"));
    await fireEvent.press(getByTestId("cajon-item-cobranza-alertas"));

    await waitFor(() => expect(getByTestId("panel-titulo").props.children).toBe("Cobranza"));
    await waitFor(() => expect(getByTestId("cobranza-alertas")).toHaveStyle({ borderBottomWidth: 2 }));
  });

  it("el bus de navegación (push, Búsqueda) lleva al módulo y a la pestaña pedida", async () => {
    mockSesionValue = DUENO;
    const { findByTestId, getByTestId } = await renderShell();
    await findByTestId("panel-menu");

    await act(async () => {
      emitirNavegacion({ tab: "comercio", pestana: "productos" });
    });

    await waitFor(() => expect(getByTestId("panel-titulo").props.children).toBe("Comercio"));
    await waitFor(() => expect(getByTestId("comercio-productos")).toHaveStyle({ borderBottomWidth: 2 }));
  });

  it("la raíz de Cobranza lleva el header del panel (sin header nativo encima)", async () => {
    mockSesionValue = { ...DUENO, permissions: { "pack_cobranza:resumen": "read" } };
    const { findByTestId, getByTestId } = await renderShell();
    expect((await findByTestId("panel-titulo")).props.children).toBe("Cobranza");
    expect(getByTestId("panel-menu")).toBeTruthy();
    await waitFor(() => expect(getByTestId("cobranza-pestanas")).toBeTruthy());
  });

  it("la barra de estado sigue al tema (oscuro por defecto → íconos claros)", async () => {
    mockSesionValue = DUENO;
    const { findByTestId, getByTestId } = await renderShell();
    expect((await findByTestId("status-bar")).props.children).toBe("light");
    await fireEvent.press(getByTestId("panel-tema"));
    expect(getByTestId("status-bar").props.children).toBe("dark");
  });

  it("colaborador sin permisos ve el estado vacío y el cajón sin secciones", async () => {
    // Como en una build de producción: sin la entrada de desarrollo (Catálogo).
    const g = globalThis as { __DEV__?: boolean };
    const original = g.__DEV__;
    g.__DEV__ = false;
    try {
      mockSesionValue = { token: "t", adminId: "a-2", role: "colaborador", permissions: {} };
      const { findByTestId, getByTestId, queryByTestId } = await renderShell();
      expect(await findByTestId("panel-sin-secciones")).toBeTruthy();
      await fireEvent.press(getByTestId("panel-menu"));
      expect(queryByTestId("cajon-grupo-operacion")).toBeNull();
      expect(queryByTestId("cajon-grupo-desarrollo")).toBeNull();
    } finally {
      g.__DEV__ = original;
    }
  });

  it("master ve Plataforma en el cajón; un no-master nunca ve Negocios", async () => {
    mockSesionValue = { token: "t", adminId: "a-3", role: "master", permissions: {} };
    const { findByTestId, getByTestId, unmount } = await renderShell();
    await findByTestId("panel-menu");
    await fireEvent.press(getByTestId("panel-menu"));
    expect(getByTestId("cajon-grupo-plataforma")).toBeTruthy();
    expect(getByTestId("cajon-item-herramientas-negocios")).toBeTruthy();
    unmount();

    mockSesionValue = { token: "t", adminId: "a-4", role: "owner", permissions: { tenants: "write", dashboard: "read" } };
    const segundo = await renderShell();
    await segundo.findByTestId("panel-menu");
    await fireEvent.press(segundo.getByTestId("panel-menu"));
    expect(segundo.queryByTestId("cajon-grupo-plataforma")).toBeNull();
  });

  it("en desarrollo el cajón ofrece el Catálogo de UI (HU-DS-09)", async () => {
    mockSesionValue = DUENO;
    const { findByTestId, getByTestId } = await renderShell();
    await findByTestId("panel-menu");
    await fireEvent.press(getByTestId("panel-menu"));
    expect(getByTestId("cajon-grupo-desarrollo")).toBeTruthy();
    expect(getByTestId("cajon-item-catalogo")).toBeTruthy();
  });

  it("el catálogo solo existe en builds de desarrollo", () => {
    const g = globalThis as { __DEV__?: boolean };
    const original = g.__DEV__;
    try {
      g.__DEV__ = false;
      expect(catalogoDisponible()).toBe(false);
      g.__DEV__ = true;
      expect(catalogoDisponible()).toBe(true);
    } finally {
      g.__DEV__ = original;
    }
  });
});
