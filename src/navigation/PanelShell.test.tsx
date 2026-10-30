jest.mock("expo-secure-store");
jest.mock("expo-status-bar", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return { StatusBar: (props: { style: string }) => React.createElement(Text, { testID: "status-bar" }, props.style) };
});
jest.mock("../modules/perfil", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    PerfilAdminScreen: ({ onBack }: { onBack: () => void }) =>
      React.createElement(Text, { testID: "perfil-admin", onPress: onBack }, "Perfil"),
  };
});

jest.mock("../modules/operacion/screens/ClienteDetalleScreen", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    ClienteDetalleScreen: ({ route }: { route: { params: { id: string } } }) =>
      React.createElement(Text, { testID: "cliente-detalle" }, route.params.id),
  };
});

let mockSesionValue: unknown = null;
let mockPerfilValue: unknown = null;
const mockRefrescarPerfil = jest.fn().mockResolvedValue(undefined);
const mockAplicarPerfil = jest.fn().mockResolvedValue(undefined);
jest.mock("@core/session/admin-session-context", () => ({
  useAdminSession: () => ({
    sesion: mockSesionValue,
    perfil: mockPerfilValue,
    loading: false,
    refrescarPerfil: mockRefrescarPerfil,
    aplicarPerfil: mockAplicarPerfil,
    logout: jest.fn(),
  }),
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

type ResultadoRender = Awaited<ReturnType<typeof render>>;

async function abrirGrupo(getByTestId: ResultadoRender["getByTestId"], grupo: string) {
  await fireEvent.press(getByTestId(`cajon-grupo-${grupo}`));
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
    "pack_cobranza:clientes": "read",
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

describe("PanelShell (HU-APP-03, HU-DS-11)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSesionValue = null;
    mockPerfilValue = PERFIL;
  });

  it("dueño con cobranza y comercio: header del módulo y cajón solo con sus secciones", async () => {
    mockSesionValue = DUENO;
    const { findByTestId, getByTestId, queryByTestId } = await renderShell();

    expect((await findByTestId("panel-titulo")).props.children).toBe("Resumen");
    await fireEvent.press(getByTestId("panel-menu"));
    expect(getByTestId("cajon-panel")).toHaveProp("pointerEvents", "auto");
    expect(getByTestId("cajon-grupo-operacion")).toBeTruthy();
    expect(getByTestId("cajon-grupo-negocio")).toBeTruthy();
    expect(getByTestId("cajon-cuenta")).toBeTruthy();
    // Agenda y Cuenta sin permiso → no aparecen.
    expect(queryByTestId("cajon-item-agenda")).toBeNull();
    expect(queryByTestId("cajon-grupo-cuenta")).toBeNull();

    // Los grupos arrancan plegados.
    expect(queryByTestId("cajon-item-cobranza")).toBeNull();
    await abrirGrupo(getByTestId, "negocio");
    expect(getByTestId("cajon-item-cobranza")).toBeTruthy();
    expect(getByTestId("cajon-item-ventas")).toBeTruthy();
  });

  it("una entrada del cajón abre el módulo en su primera pestaña permitida", async () => {
    mockSesionValue = DUENO;
    const { findByTestId, getByTestId } = await renderShell();
    await findByTestId("panel-menu");

    await fireEvent.press(getByTestId("panel-menu"));
    await abrirGrupo(getByTestId, "negocio");
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
    await abrirGrupo(getByTestId, "negocio");
    await fireEvent.press(getByTestId("cajon-item-cobranza"));

    await waitFor(() => expect(getByTestId("panel-titulo").props.children).toBe("Cobranza"));
    await waitFor(() => expect(getByTestId("cobranza-area-equipo")).toHaveStyle({ borderBottomWidth: 2 }));
  });

  it("un push a Alertas de acceso abre el área Equipo con la sección en pantalla", async () => {
    mockSesionValue = {
      ...DUENO,
      permissions: { "pack_cobranza:resumen": "read", "pack_cobranza:alertas": "read", "pack_cobranza:auditoria": "read" },
    };
    const { findByTestId, getByTestId } = await renderShell();
    await findByTestId("panel-menu");

    await act(async () => {
      emitirNavegacion({ tab: "cobranza", pestana: "alertas" });
    });

    await waitFor(() => expect(getByTestId("cobranza-area-equipo")).toHaveStyle({ borderBottomWidth: 2 }));
    expect(getByTestId("cobranza-alertas").props.accessibilityState).toMatchObject({ selected: true });
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
    await abrirGrupo(getByTestId, "cuenta");
    await fireEvent.press(getByTestId("cajon-item-equipo"));
    await waitFor(() => expect(getByTestId("panel-titulo").props.children).toBe("Equipo"));

    await fireEvent.press(getByTestId("panel-menu"));
    await abrirGrupo(getByTestId, "cuenta");
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
    await abrirGrupo(getByTestId, "cuenta");
    await fireEvent.press(getByTestId("cajon-item-equipo"));
    await waitFor(() => expect(getByTestId("equipo-tab")).toBeTruthy());
    expect(queryByTestId("config-colaboradores")).toBeNull();
    expect(queryByTestId("config-ajustes")).toBeNull();

    // Configuración: General, Habilidades, Push y Mensajes fallidos (otra pantalla).
    await fireEvent.press(getByTestId("panel-menu"));
    await abrirGrupo(getByTestId, "cuenta");
    await fireEvent.press(getByTestId("cajon-item-configuracion"));
    await waitFor(() => expect(getByTestId("config-ajustes")).toHaveStyle({ borderBottomWidth: 2 }));
    expect(getByTestId("config-habilidades")).toBeTruthy();
    expect(getByTestId("config-notificaciones")).toBeTruthy();
    expect(queryByTestId("config-colaboradores")).toBeNull();
    expect(queryByTestId("config-conexiones")).toBeNull();
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
    await waitFor(() =>
      expect(getByTestId("pestana-conversaciones").props.accessibilityState.selected).toBe(true),
    );
    expect(getByTestId("pestana-escalaciones")).toBeTruthy();
    expect(queryByTestId("pestana-leads")).toBeNull();
    expect(queryByTestId("pestana-playground")).toBeNull();

    await act(async () => {
      emitirNavegacion({ tab: "conversaciones", pestana: "leads" });
    });
    await waitFor(() => expect(getByTestId("panel-titulo").props.children).toBe("Clientes"));
    await waitFor(() => expect(getByTestId("clientes-busqueda")).toBeTruthy());
    expect(queryByTestId("pestana-conversaciones")).toBeNull();
  });

  it("un aviso de cliente con la app abierta abre su ficha sobre la lista de Clientes (HU-CRM-20)", async () => {
    mockSesionValue = { ...DUENO, permissions: { conversations: "read", escalations: "read", leads: "read" } };
    const { findByTestId, getByTestId } = await renderShell();
    await findByTestId("panel-menu");

    await act(async () => {
      emitirNavegacion({ tab: "conversaciones", pestana: "leads", cliente: "cli-1" });
    });

    await waitFor(() => expect(getByTestId("cliente-detalle").props.children).toBe("cli-1"));
  });

  it("con la app cerrada, el aviso llega a la ficha apenas arranca el panel (HU-CRM-20)", async () => {
    mockSesionValue = { ...DUENO, permissions: { conversations: "read", escalations: "read", leads: "read" } };
    // El push se toca antes de que el shell monte: el bus lo guarda y lo entrega al montar.
    emitirNavegacion({ tab: "conversaciones", pestana: "leads", cliente: "cli-2" });
    const { findByTestId } = await renderShell();

    expect((await findByTestId("cliente-detalle")).props.children).toBe("cli-2");
  });

  it("la raíz de Cobranza lleva el header del panel (sin header nativo encima)", async () => {
    mockSesionValue = { ...DUENO, permissions: { "pack_cobranza:resumen": "read" } };
    const { findByTestId, getByTestId } = await renderShell();
    expect((await findByTestId("panel-titulo")).props.children).toBe("Cobranza");
    expect(getByTestId("panel-menu")).toBeTruthy();
    await waitFor(() => expect(getByTestId("cobranza-pestanas")).toBeTruthy());
  });

  it("la barra de estado sigue al tema y el toggle vive en la tarjeta de la cuenta", async () => {
    mockSesionValue = DUENO;
    const { findByTestId, getByTestId } = await renderShell();
    expect((await findByTestId("status-bar")).props.children).toBe("light");

    await fireEvent.press(getByTestId("panel-menu"));
    await fireEvent.press(getByTestId("cajon-cuenta"));
    await fireEvent(getByTestId("cajon-tema"), "valueChange", false);
    expect(getByTestId("status-bar").props.children).toBe("dark");
  });

  it("abre la ruta Perfil desde el submenú y vuelve al panel", async () => {
    mockSesionValue = DUENO;
    const { findByTestId, getByTestId } = await renderShell();
    await findByTestId("panel-menu");

    await fireEvent.press(getByTestId("panel-menu"));
    await fireEvent.press(getByTestId("cajon-cuenta"));
    await fireEvent.press(getByTestId("cajon-perfil"));

    await waitFor(() => expect(getByTestId("perfil-admin")).toBeTruthy());
    await fireEvent.press(getByTestId("perfil-admin"));
    await waitFor(() => expect(getByTestId("panel-titulo").props.children).toBe("Resumen"));
  });

  it("un push recibido en Perfil vuelve al panel y abre el módulo pedido", async () => {
    mockSesionValue = DUENO;
    const { findByTestId, getByTestId } = await renderShell();
    await findByTestId("panel-menu");

    await fireEvent.press(getByTestId("panel-menu"));
    await fireEvent.press(getByTestId("cajon-cuenta"));
    await fireEvent.press(getByTestId("cajon-perfil"));
    await waitFor(() => expect(getByTestId("perfil-admin")).toBeTruthy());

    await act(async () => {
      emitirNavegacion({ tab: "comercio", pestana: "productos" });
    });

    await waitFor(() => expect(getByTestId("panel-titulo").props.children).toBe("Ventas"));
    await waitFor(() => expect(getByTestId("comercio-productos")).toHaveStyle({ borderBottomWidth: 2 }));
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
    const { findByTestId, getByTestId } = await renderShell();
    await findByTestId("panel-menu");
    await fireEvent.press(getByTestId("panel-menu"));
    expect(getByTestId("cajon-grupo-plataforma")).toBeTruthy();
    await abrirGrupo(getByTestId, "plataforma");
    expect(getByTestId("cajon-item-negocios")).toBeTruthy();
    await fireEvent.press(getByTestId("cajon-item-negocios"));
    await waitFor(() => expect(getByTestId("herramientas-lista-negocios")).toBeTruthy());
    expect(getByTestId("panel-titulo").props.children).toBe("Negocios");
  });

  it("un no-master nunca ve Negocios", async () => {
    mockSesionValue = { token: "t", adminId: "a-4", role: "owner", permissions: { tenants: "write", dashboard: "read" } };
    const { findByTestId, getByTestId, queryByTestId } = await renderShell();
    await findByTestId("panel-menu");
    await fireEvent.press(getByTestId("panel-menu"));
    expect(queryByTestId("cajon-grupo-plataforma")).toBeNull();
  });

  it("en desarrollo el cajón ofrece el Catálogo de UI (HU-DS-09)", async () => {
    mockSesionValue = DUENO;
    const { findByTestId, getByTestId } = await renderShell();
    await findByTestId("panel-menu");
    await fireEvent.press(getByTestId("panel-menu"));
    expect(getByTestId("cajon-grupo-desarrollo")).toBeTruthy();
    await abrirGrupo(getByTestId, "desarrollo");
    await waitFor(() => expect(getByTestId("cajon-item-catalogo")).toBeTruthy());
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
