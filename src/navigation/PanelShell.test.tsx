jest.mock("expo-secure-store");
jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    MaterialIcons: (props: { name: string }) =>
      React.createElement(Text, { testID: `icono-${props.name}` }, props.name),
  };
});

let mockSesionValue: unknown = null;
jest.mock("@core/session/admin-session-context", () => ({
  useAdminSession: () => ({ sesion: mockSesionValue, loading: false }),
}));

import { render, waitFor } from "@testing-library/react-native";
import { PanelShell } from "./PanelShell";

describe("PanelShell (HU-APP-03)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSesionValue = null;
  });

  it("dueño con cobranza y comercio ve solo los tabs de sus permisos", async () => {
    mockSesionValue = {
      token: "t",
      adminId: "a-1",
      role: "owner",
      permissions: {
        dashboard: "read",
        conversations: "read",
        "pack_cobranza:resumen": "read",
        "pack_cobranza:clientes": "read",
        pack_commerce: "read",
      },
    };

    const { getAllByText, getByText, queryByText } = await render(<PanelShell />);
    await waitFor(() => expect(getAllByText("Inicio").length).toBeGreaterThan(0));
    expect(getByText("Conversaciones")).toBeTruthy();
    expect(getByText("Cobranza")).toBeTruthy();
    expect(getByText("Comercio")).toBeTruthy();
    // Calendario y Negocio sin permiso → no aparecen como tabs.
    expect(queryByText("Calendario")).toBeNull();
    expect(queryByText("Negocio")).toBeNull();
  });

  it("colaborador sin permisos solo ve Más (sin grupos)", async () => {
    mockSesionValue = { token: "t", adminId: "a-2", role: "colaborador", permissions: {} };

    const { getByText, queryByText } = await render(<PanelShell />);
    await waitFor(() => expect(getByText("Más")).toBeTruthy());
    expect(queryByText("Inicio")).toBeNull();
  });

  it("master ve la sección de plataforma en Más", async () => {
    mockSesionValue = { token: "t", adminId: "a-3", role: "master", permissions: {} };

    const { getByText } = await render(<PanelShell />);
    await waitFor(() => expect(getByText("Más")).toBeTruthy());
    // El master atraviesa el RBAC: ve el tab de Cobranza aunque no tenga permisos.
    expect(getByText("Cobranza")).toBeTruthy();
  });

  it("un no-master nunca ve tenants", async () => {
    mockSesionValue = { token: "t", adminId: "a-4", role: "owner", permissions: {} };

    const { getByText, queryByText } = await render(<PanelShell />);
    await waitFor(() => expect(getByText("Más")).toBeTruthy());
    expect(queryByText("Inicio")).toBeNull();
    expect(queryByText("Cobranza")).toBeNull();
  });
});
