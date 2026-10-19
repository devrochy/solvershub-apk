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
    expect(getByTestId("cajon-item-cobranza")).toBeTruthy();
    expect(getByTestId("cajon-item-ventas")).toBeTruthy();
    // Agenda y Cuenta sin permiso → no aparecen.
    expect(queryByTestId("cajon-item-agenda")).toBeNull();
    expect(queryByTestId("cajon-grupo-cuenta")).toBeNull();
  });

  it("una entrada del cajón abre el módulo en su primera pestaña permitida", async () => {
    mockSesionValue = DUENO;
    const { findByTestId, getByTestId } = await renderShell();
    await findByTestId("panel-menu");

    await fireEvent.press(getByTestId("panel-menu"));
    await fireEvent.press(getByTestId("cajon-item-ventas"));

    await waitFor(() => expect(getByTestId("panel-titulo").props.children).toBe("Ventas"));
    await waitFor(() => expect(getByTestId("comercio-resumen")).toHaveStyle({ borderBottomWidth: 2 }));
    expect(getByTestId("cajon-panel")).toHaveProp("pointerEvents", "none");
  });

  it("una entrada de un módulo con stack (Cobranza) llega a su pestaña por los params anidados", async () => {
    // Solo Alertas de acceso: la primera pestaña permitida no es la de por defecto (Resumen).
    mockSesionValue = { token: "t", adminId: "a-6", role: "owner", permissions: { "pack_cobranza:alertas": "read" } };
    const { findByTestId, getByTestId } = await renderShell();
    await findByTestId("panel-menu");

    await fireEvent.press(getByTestId("panel-menu"));
    await fireEvent.press(getByTestId("cajon-item-cobranza"));

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

    await waitFor(() => expect(getByTestId("panel-titulo").props.children).toBe("Ventas"));
    await waitFor(() => expect(getByTestId("comercio-productos")).toHaveStyle({ borderBottomWidth: 2 }));
  });

  it("el header lleva el nombre de la entrada aunque compartan módulo, y la lupa abre la Búsqueda", async () => {
    mockSesionValue = { ...DUENO, permissions: { collaborators: "read", settings: "write" } };
    const { findByTestId, getByTestId } = await renderShell();
    await findByTestId("panel-menu");

    await fireEvent.press(getByTestId("panel-menu"));
    await fireEvent.press(getByTestId("cajon-item-equipo"));
    await waitFor(() => expect(getByTestId("panel-titulo").props.children).toBe("Equipo"));

    await fireEvent.press(getByTestId("panel-menu"));
    await fireEvent.press(getByTestId("cajon-item-configuracion"));
    await waitFor(() => expect(getByTestId("panel-titulo").props.children).toBe("Configuración"));
    await waitFor(() => expect(getByTestId("config-ajustes")).toBeTruthy());

    await fireEvent.press(getByTestId("panel-buscar"));
    await waitFor(() => expect(getByTestId("panel-titulo").props.children).toBe("Buscar"));
  });

  it("cada entrada muestra solo sus pestañas aunque compartan pantalla (Equipo, Configuración)", async () => {
    mockSesionValue = { ...DUENO, permissions: { collaborators: "read", settings: "write", plugins: "read" } };
    const { findByTestId, getByTestId, queryByTestId } = await renderShell();
    await findByTestId("panel-menu");

    // Equipo: solo Colaboradores, sin barra de pestañas.
    await fireEvent.press(getByTestId("panel-menu"));
    await fireEvent.press(getByTestId("cajon-item-equipo"));
    await waitFor(() => expect(getByTestId("config-invitar")).toBeTruthy());
    expect(queryByTestId("config-colaboradores")).toBeNull();
    expect(queryByTestId("config-ajustes")).toBeNull();

    // Configuración: General, Habilidades, Push y Mensajes fallidos (otra pantalla).
    await fireEvent.press(getByTestId("panel-menu"));
    await fireEvent.press(getByTestId("cajon-item-configuracion"));
    await waitFor(() => expect(getByTestId("config-ajustes")).toHaveStyle({ borderBottomWidth: 2 }));
    expect(getByTestId("config-habilidades")).toBeTruthy();
    expect(getByTestId("config-notificaciones")).toBeTruthy();
    expect(queryByTestId("config-colaboradores")).toBeNull();
    expect(queryByTestId("config-conexiones")).toBeNull();
    // La pestaña Plan de Configuración ya no existe (la eliminación de negocios está en Plataforma).
    expect(queryByTestId("config-plan")).toBeNull();

    // Mensajes fallidos abre Herramientas por el bus, sin salir de la entrada.
    await fireEvent.press(getByTestId("config-fallos"));
    await waitFor(() => expect(getByTestId("herramientas-fallos")).toHaveStyle({ borderBottomWidth: 2 }));
    expect(getByTestId("panel-titulo").props.children).toBe("Configuración");
    expect(getByTestId("herramientas-ajustes")).toBeTruthy();
    expect(queryByTestId("herramientas-negocios")).toBeNull();

    await fireEvent.press(getByTestId("herramientas-habilidades"));
    await waitFor(() => expect(getByTestId("config-habilidades")).toHaveStyle({ borderBottomWidth: 2 }));
  });

  it("Conversaciones muestra Conversaciones y Escalaciones; el bus a Clientes titula y filtra por su entrada", async () => {
    mockSesionValue = { ...DUENO, permissions: { conversations: "read", escalations: "read", leads: "read" } };
    const { findByTestId, getByTestId, queryByTestId } = await renderShell();
    await findByTestId("panel-menu");

    await fireEvent.press(getByTestId("panel-menu"));
    await fireEvent.press(getByTestId("cajon-item-conversaciones"));
    await waitFor(() => expect(getByTestId("pestana-conversaciones")).toHaveStyle({ borderBottomWidth: 2 }));
    expect(getByTestId("pestana-escalaciones")).toBeTruthy();
    expect(queryByTestId("pestana-leads")).toBeNull();
    expect(queryByTestId("pestana-playground")).toBeNull();

    // Búsqueda / push: `{tab, pestana}` sin entrada → la que contiene el destino.
    await act(async () => {
      emitirNavegacion({ tab: "conversaciones", pestana: "leads" });
    });
    await waitFor(() => expect(getByTestId("panel-titulo").props.children).toBe("Clientes"));
    await waitFor(() => expect(getByTestId("operacion-busqueda-leads")).toBeTruthy());
    expect(queryByTestId("pestana-conversaciones")).toBeNull();
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
    expect(getByTestId("cajon-item-negocios")).toBeTruthy();
    // Negocios abre la lista de la plataforma (desde ahí se suspende o elimina un negocio).
    await fireEvent.press(getByTestId("cajon-item-negocios"));
    await waitFor(() => expect(getByTestId("herramientas-lista-negocios")).toBeTruthy());
    expect(getByTestId("panel-titulo").props.children).toBe("Negocios");
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
