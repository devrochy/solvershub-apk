jest.mock("expo-secure-store");
const mockGet = jest.fn();
jest.mock("@core/session/use-admin-api", () => ({ useAdminApi: jest.fn() }));
let mockSesion: unknown = null;
jest.mock("@core/session/admin-session-context", () => ({
  useAdminSession: () => ({ sesion: mockSesion, loading: false }),
}));

import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { useAdminApi } from "@core/session/use-admin-api";
import { DashboardScreen } from "./DashboardScreen";

const mockUseAdminApi = useAdminApi as jest.Mock;
const clienteFijo = {
  get: mockGet,
  post: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
  del: jest.fn(),
};

const DASHBOARD = {
  billing: null,
  bot_paused: false,
  kpi: {
    active_plugins: 2,
    conversations_7d: 12,
    cost_30d: 1.5,
    messages_7d: 40,
    pending_escalations: 3,
  },
  llm_label: "deepseek-flash",
  recent: [
    { customer_name: "Juanita", external_id: null, id: "c-1", status: "open" },
  ],
  tenant_id: "t-1",
};

const SESION = {
  token: "t",
  adminId: "a-1",
  email: "e",
  role: "owner",
  tenantId: "t-1",
  tenantName: "Mi Negocio",
  permissions: {},
};

describe("DashboardScreen (HU-APP-04)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSesion = SESION;
    mockUseAdminApi.mockReturnValue(clienteFijo);
  });

  it("muestra los KPIs del negocio y los recientes", async () => {
    mockGet.mockImplementation((path: string) =>
      path === "/admin/dashboard" ? Promise.resolve(DASHBOARD) : Promise.resolve({ kpis: [] }),
    );

    const { getByTestId, getByText } = await render(<DashboardScreen />);
    await waitFor(() => expect(getByTestId("dashboard")).toBeTruthy());
    expect(getByText("12")).toBeTruthy();
    expect(getByText("40")).toBeTruthy();
    expect(getByText("deepseek-flash")).toBeTruthy();
    expect(getByText("Activo")).toBeTruthy();
    expect(getByText("Juanita")).toBeTruthy();
  });

  it("con permiso de cobranza suma los KPIs del pack", async () => {
    mockSesion = { ...SESION, permissions: { "pack_cobranza:resumen": "read" } };
    mockGet.mockImplementation((path: string) =>
      path === "/admin/dashboard"
        ? Promise.resolve(DASHBOARD)
        : Promise.resolve({ kpis: [{ label: "Caja actual", value: "1.200.000" }] }),
    );

    const { getByText } = await render(<DashboardScreen />);
    await waitFor(() => expect(getByText("Caja actual")).toBeTruthy());
    expect(getByText("1.200.000")).toBeTruthy();
  });

  it("sin permiso de cobranza no pide el resumen del pack", async () => {
    mockGet.mockResolvedValue(DASHBOARD);
    const { getByTestId } = await render(<DashboardScreen />);
    await waitFor(() => expect(getByTestId("dashboard")).toBeTruthy());
    expect(mockGet).not.toHaveBeenCalledWith("/pack/cobranza/summary");
  });

  it("con error muestra reintento", async () => {
    mockGet.mockRejectedValueOnce(new Error("red"));
    mockGet.mockResolvedValue(DASHBOARD);

    const { getByTestId, getByText } = await render(<DashboardScreen />);
    await waitFor(() => expect(getByTestId("dashboard-error")).toBeTruthy());

    await fireEvent.press(getByTestId("dashboard-reintentar"));
    await waitFor(() => expect(getByText("12")).toBeTruthy());
  });
});
