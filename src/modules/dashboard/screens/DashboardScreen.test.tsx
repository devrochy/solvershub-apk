jest.mock("expo-secure-store");
const mockGet = jest.fn();
jest.mock("@core/session/use-admin-api", () => ({ useAdminApi: jest.fn() }));
let mockSesion: unknown = null;
jest.mock("@core/session/admin-session-context", () => ({
  useAdminSession: () => ({ sesion: mockSesion, loading: false }),
}));

import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { emitirNavegacion } from "@shared/navegacion-evento";
import { useAdminApi } from "@core/session/use-admin-api";
import { DashboardScreen } from "./DashboardScreen";

jest.mock("@shared/navegacion-evento", () => ({ emitirNavegacion: jest.fn() }));

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
      path === "/admin/dashboard"
        ? Promise.resolve(DASHBOARD)
        : path === "/admin/dashboard/agents"
          ? Promise.reject(new Error("sin endpoint"))
          : Promise.resolve({ kpis: [] }),
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
        : path === "/admin/dashboard/agents"
          ? Promise.reject(new Error("sin endpoint"))
          : Promise.resolve({ kpis: [{ label: "Caja actual", value: "1.200.000" }] }),
    );

    const { getByText } = await render(<DashboardScreen />);
    await waitFor(() => expect(getByText("Caja actual")).toBeTruthy());
    expect(getByText("1.200.000")).toBeTruthy();
  });

  it("sin permiso de cobranza no pide el resumen del pack", async () => {
    mockGet.mockImplementation((path: string) =>
      path === "/admin/dashboard" ? Promise.resolve(DASHBOARD) : Promise.reject(new Error("x")),
    );
    const { getByTestId } = await render(<DashboardScreen />);
    await waitFor(() => expect(getByTestId("dashboard")).toBeTruthy());
    expect(mockGet).not.toHaveBeenCalledWith("/pack/cobranza/summary");
  });

  it("con error muestra reintento", async () => {
    mockGet.mockRejectedValueOnce(new Error("red"));
    mockGet.mockImplementation((path: string) =>
      path === "/admin/dashboard" ? Promise.resolve(DASHBOARD) : Promise.reject(new Error("x")),
    );

    const { getByTestId, getByText } = await render(<DashboardScreen />);
    await waitFor(() => expect(getByTestId("dashboard-error")).toBeTruthy());

    await fireEvent.press(getByTestId("dashboard-reintentar"));
    await waitFor(() => expect(getByText("12")).toBeTruthy());
  });

  describe("Resumen por agente (ADR-0171)", () => {
    const kpi = (parcial: object) => ({
      id: "k",
      label: "K",
      valor: 1,
      unidad: "count",
      previo: null,
      delta_pct: null,
      polaridad: "up-good",
      ...parcial,
    });
    const POR_AGENTE = {
      periodo: {},
      runtime: "v3",
      general: {
        kpis: [
          kpi({
            id: "conversaciones",
            label: "Conversaciones",
            valor: 30,
            previo: 20,
            delta_pct: 50,
            destino: { ruta: "conversaciones", params: {} },
          }),
          kpi({ id: "costo_llm", label: "Costo del asistente", valor: 1.5, unidad: "usd" }),
        ],
      },
      agentes: [
        {
          ref: "ag-1",
          key: "ventas",
          name: "Ventas",
          kind: "specialist",
          kpis: [kpi({ id: "turnos", label: "Turnos", valor: 9 })],
          modulos: [
            {
              id: "pack_commerce",
              nombre: "Comercio",
              kpis: [
                kpi({
                  id: "pedidos",
                  label: "Pedidos",
                  valor: 4,
                  destino: { ruta: "comercio.pedidos", params: {} },
                }),
              ],
            },
          ],
        },
        {
          ref: "ag-2",
          key: "cobranza",
          name: "Cobranza",
          kind: "specialist",
          kpis: [],
          modulos: [{ id: "pack_cobranza", nombre: "Cobranza", kpis: [], error: "No se pudo calcular" }],
        },
      ],
    };

    function respuestas(agentes: unknown) {
      mockGet.mockImplementation((path: string) =>
        path === "/admin/dashboard"
          ? Promise.resolve(DASHBOARD)
          : path === "/admin/dashboard/agents"
            ? agentes instanceof Error
              ? Promise.reject(agentes)
              : Promise.resolve(agentes)
            : Promise.resolve({ kpis: [] }),
      );
    }

    it("muestra al agente general y una sección por especialista con su módulo", async () => {
      respuestas(POR_AGENTE);
      const { getByTestId, getByText, queryByText } = await render(<DashboardScreen />);
      await waitFor(() => expect(getByTestId("resumen-agentes")).toBeTruthy());

      expect(getByText("Agente general")).toBeTruthy();
      expect(getByText("Conversaciones")).toBeTruthy();
      expect(getByText("30")).toBeTruthy();
      expect(getByText("US$ 1,50")).toBeTruthy();
      expect(getByText("+50 % frente a los 7 días anteriores")).toBeTruthy();
      // Primer agente abierto con su módulo; las tarjetas de siempre ya no están duplicadas.
      expect(getByText("Módulo · Comercio")).toBeTruthy();
      expect(getByText("Pedidos")).toBeTruthy();
      expect(queryByText("Conversaciones · 7 días")).toBeNull();
      // El resto de los datos de la pantalla sigue ahí.
      expect(getByText("deepseek-flash")).toBeTruthy();
    });

    it("el segundo agente está plegado y se abre al tocar; el fallo de su módulo se avisa", async () => {
      respuestas(POR_AGENTE);
      const { getByTestId, getByText, queryByText } = await render(<DashboardScreen />);
      await waitFor(() => expect(getByTestId("resumen-ag-2")).toBeTruthy());
      expect(queryByText("No se pudo calcular")).toBeNull();

      await fireEvent.press(getByTestId("resumen-ag-2-cabecera"));
      expect(getByText("No se pudo calcular")).toBeTruthy();
    });

    it("tocar una cifra con pantalla en la app navega a ella", async () => {
      respuestas(POR_AGENTE);
      const { getByTestId } = await render(<DashboardScreen />);
      await waitFor(() => expect(getByTestId("resumen-ag-1-pack_commerce-pedidos")).toBeTruthy());

      await fireEvent.press(getByTestId("resumen-ag-1-pack_commerce-pedidos"));
      expect(emitirNavegacion).toHaveBeenCalledWith({ tab: "comercio", pestana: "pedidos" });
      await fireEvent.press(getByTestId("resumen-general-conversaciones"));
      expect(emitirNavegacion).toHaveBeenCalledWith({ tab: "conversaciones", pestana: "conversaciones" });
    });

    it("una cifra sin pantalla en la app no es un botón", async () => {
      respuestas(POR_AGENTE);
      const { getByTestId } = await render(<DashboardScreen />);
      await waitFor(() => expect(getByTestId("resumen-general-costo_llm")).toBeTruthy());
      expect(getByTestId("resumen-general-costo_llm").props.accessibilityRole).not.toBe("button");
      expect(getByTestId("resumen-general-conversaciones").props.accessibilityRole).toBe("button");
    });

    it.each([
      ["el endpoint falla", new Error("500")],
      ["llega vacío", { periodo: {}, runtime: "legacy", general: { kpis: [] }, agentes: [] }],
      ["llega mal formado", { kpis: [] }],
    ])("si %s, quedan las tarjetas de siempre", async (_caso, respuesta) => {
      respuestas(respuesta);
      const { getByTestId, getByText, queryByTestId } = await render(<DashboardScreen />);
      await waitFor(() => expect(getByTestId("dashboard")).toBeTruthy());
      expect(getByText("Conversaciones · 7 días")).toBeTruthy();
      expect(getByText("Escalaciones pendientes")).toBeTruthy();
      expect(queryByTestId("resumen-agentes")).toBeNull();
    });

    it("con el resumen por agente no pide el de cobranza (ya viene en el módulo)", async () => {
      mockSesion = { ...SESION, permissions: { "pack_cobranza:resumen": "read" } };
      respuestas(POR_AGENTE);
      const { getByTestId } = await render(<DashboardScreen />);
      await waitFor(() => expect(getByTestId("resumen-agentes")).toBeTruthy());
      expect(mockGet).not.toHaveBeenCalledWith("/pack/cobranza/summary");
    });
  });
});
